/**
 * Import d'un export Google Sheet du formulaire « Mouvements de stock (E/S) ».
 *
 *   pnpm --filter api import:sheet prisma/data/fiches-es.tsv
 *
 * Format : TSV (Google Sheets → Fichier → Télécharger → Valeurs séparées par des tabulations), avec la ligne
 * d'en-têtes du formulaire. Les colonnes sont repérées par leur nom, l'ordre n'a pas d'importance.
 *
 * - Idempotent : chaque ligne reçoit une clé `sourceRef` (horodateur + désignation) ; une ligne déjà importée est ignorée.
 * - Chaque ligne passe par `recordStockSheet` : même transaction BR/BS + mouvement + stock qu'une saisie via le site.
 * - Articles absents du catalogue : créés automatiquement (code ART-#### suivant, CMP = 0, stock min = 0,
 *   emplacement « à préciser »). Stock d'ouverture = minimum nécessaire pour que l'historique importé
 *   ne passe jamais sous zéro (cas des articles qui n'apparaissent qu'en sortie).
 * - Magasiniers absents : créés avec un matricule provisoire (M-#### suivant), à corriger dans la base.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { ArticleCategory, ArticleOrigin, AbcClass, MovementType, PrismaClient, ShiftType } from '@prisma/client';
import { siteDateTime } from '../src/common/site-time';
import { recordStockSheet } from '../src/stock-sheets/record-sheet';

export interface ImportReport {
  file: string;
  rows: number;
  imported: number;
  alreadyImported: number;
  createdArticles: string[];
  createdStorekeepers: string[];
  errors: string[];
}

interface SheetRow {
  line: number;
  submittedAt: Date;
  date: Date;
  type: MovementType;
  designation: string;
  category: string;
  quantity: number;
  unit: string;
  requesterType: string;
  requesterName: string;
  storekeeperName: string;
  post: ShiftType;
  photoUrl: string;
  supplier: string;
  destinationZone: string;
  destinationArea: string;
  sourceRef: string;
}

/** Catégories du formulaire → catégories analytiques du catalogue (camemberts du tableau de bord) */
const ARTICLE_CATEGORY: Record<string, ArticleCategory> = {
  'mecanique': ArticleCategory.MECANIQUE,
  'boulonnerie et visserie': ArticleCategory.MECANIQUE,
  'electrique & instrumentation': ArticleCategory.ELECTRIQUE,
  'tuyauterie et robinetterie': ArticleCategory.TUYAUTERIE,
  'tolerie / metallique (toles, cornieres)': ArticleCategory.TUYAUTERIE,
  'outillage': ArticleCategory.OUTILLAGE,
};

/** Zone de stockage par défaut d'un article créé à l'import (emplacement réel à préciser) */
const DEFAULT_ZONE: Record<ArticleCategory, string> = {
  MECANIQUE: 'grand-abri',
  ELECTRIQUE: 'hangar-racks',
  TUYAUTERIE: 'zone-ext',
  OUTILLAGE: 'petit-abri',
  CONSOMMABLES: 'petit-abri',
};

const norm = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const clean = (s: string | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** « 02/10/2026 18:46:54 » ou « 01/10/2026 » → { date: 2026-10-02, time: 18:46:54 } */
function parseFrDate(value: string): { date: string; time: string } | null {
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const [, d, mo, y, h = '0', mi = '00', s = '00'] = m;
  return { date: `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`, time: `${h.padStart(2, '0')}:${mi}:${s}` };
}

function parsePost(value: string): ShiftType {
  const n = value.match(/\d/)?.[0];
  if (n === '1') return ShiftType.MATIN;
  if (n === '2') return ShiftType.APRES_MIDI;
  if (n === '3') return ShiftType.NUIT;
  return ShiftType.OFF;
}

function parseFile(filePath: string, errors: string[]): SheetRow[] {
  const lines = fs.readFileSync(filePath, 'utf8').replace(/^﻿/, '').split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => l.trim() !== '');
  if (headerIdx < 0) return [];
  const headers = lines[headerIdx].split('\t').map(norm);
  const col = (name: string): number => headers.indexOf(norm(name));
  const required = [
    'Horodateur', 'Type de mouvements', 'Date', 'Désignation / Référence', 'Catégorie', 'Quantité', 'Unité',
    'Demandeur', 'Nom du demandeur', 'Nom magasinier', 'Postes de travail', "Photos d'article",
  ];
  const missing = required.filter((r) => col(r) < 0);
  if (missing.length) throw new Error(`Colonnes absentes de l'en-tête : ${missing.join(', ')}`);

  // Colonnes de secteur par zone : « ZONE - TREMIE », « Zone LIAISON », « Zone LAVERIE »
  const areaColumns = new Map<string, number>();
  headers.forEach((h, i) => {
    const m = h.match(/^zone\s*-?\s*(\S.*)$/);
    if (m) areaColumns.set(m[1].toUpperCase(), i);
  });

  const rows: SheetRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    const cells = lines[i].split('\t');
    const get = (name: string) => clean(cells[col(name)]);
    const line = i + 1;
    const submitted = parseFrDate(get('Horodateur'));
    const day = parseFrDate(get('Date'));
    const typeRaw = norm(get('Type de mouvements'));
    const quantity = Number(get('Quantité').replace(',', '.'));
    if (!submitted || !day) { errors.push(`Ligne ${line} : date ou horodateur illisible.`); continue; }
    if (!typeRaw.startsWith('entr') && !typeRaw.startsWith('sort')) { errors.push(`Ligne ${line} : type de mouvement inconnu « ${get('Type de mouvements')} ».`); continue; }
    if (!Number.isInteger(quantity) || quantity <= 0) { errors.push(`Ligne ${line} : quantité invalide « ${get('Quantité')} ».`); continue; }
    if (!get('Désignation / Référence')) { errors.push(`Ligne ${line} : désignation vide.`); continue; }

    const zone = col('Zone') >= 0 ? get('Zone').toUpperCase() : '';
    const areaCol = zone ? areaColumns.get(zone) : undefined;
    rows.push({
      line,
      submittedAt: siteDateTime(submitted.date, submitted.time),
      // Date du mouvement = date saisie + heure de l'horodateur
      date: siteDateTime(day.date, submitted.time),
      type: typeRaw.startsWith('entr') ? MovementType.IN : MovementType.OUT,
      designation: get('Désignation / Référence'),
      category: get('Catégorie'),
      quantity,
      unit: get('Unité'),
      requesterType: get('Demandeur'),
      requesterName: get('Nom du demandeur'),
      storekeeperName: get('Nom magasinier'),
      post: parsePost(get('Postes de travail')),
      photoUrl: get("Photos d'article"),
      supplier: col('Fournisseur') >= 0 ? get('Fournisseur') : '',
      destinationZone: zone,
      destinationArea: areaCol !== undefined ? clean(cells[areaCol]) : '',
      sourceRef: `gsheet:${submitted.date}T${submitted.time}:${norm(get('Désignation / Référence'))}`,
    });
  }
  return rows.sort((a, b) => a.date.getTime() - b.date.getTime() || a.submittedAt.getTime() - b.submittedAt.getTime());
}

export async function importSheetFile(prisma: PrismaClient, filePath: string): Promise<ImportReport> {
  const report: ImportReport = {
    file: path.basename(filePath),
    rows: 0,
    imported: 0,
    alreadyImported: 0,
    createdArticles: [],
    createdStorekeepers: [],
    errors: [],
  };
  const parsed = parseFile(filePath, report.errors);
  report.rows = parsed.length + report.errors.length;

  const existingRefs = new Set(
    (await prisma.stockSheet.findMany({ where: { sourceRef: { in: parsed.map((r) => r.sourceRef) } }, select: { sourceRef: true } }))
      .map((s) => s.sourceRef),
  );
  const rows = parsed.filter((r) => !existingRefs.has(r.sourceRef));
  report.alreadyImported = parsed.length - rows.length;

  // ── Magasiniers ──
  const storekeepers = await prisma.storekeeper.findMany();
  const storekeeperId = new Map(storekeepers.map((s) => [norm(s.name), s.id]));
  let nextMatricule = Math.max(8800, ...storekeepers.map((s) => Number(s.matricule.replace(/\D/g, '')) || 0)) + 1;
  for (const name of new Set(rows.map((r) => r.storekeeperName).filter(Boolean))) {
    if (storekeeperId.has(norm(name))) continue;
    const sk = await prisma.storekeeper.create({
      data: { matricule: `M-${nextMatricule++}`, name, role: 'Magasinier', specialty: 'À compléter (import fiche E/S)' },
    });
    storekeeperId.set(norm(name), sk.id);
    report.createdStorekeepers.push(`${sk.matricule} ${name}`);
  }

  // ── Articles ──
  const articles = await prisma.article.findMany();
  const articleId = new Map(articles.map((a) => [norm(a.designation), a.id]));
  const zones = new Map((await prisma.zone.findMany()).map((z) => [z.code, z]));
  let nextCode = Math.max(1000, ...articles.map((a) => Number(a.code.replace(/\D/g, '')) || 0)) + 1;

  const byArticle = new Map<string, SheetRow[]>();
  for (const r of rows) byArticle.set(norm(r.designation), [...(byArticle.get(norm(r.designation)) ?? []), r]);

  for (const [key, history] of byArticle) {
    if (articleId.has(key)) continue;
    // Stock d'ouverture minimal pour que l'historique ne passe jamais sous zéro
    let running = 0;
    let lowest = 0;
    for (const r of history) {
      running += r.type === MovementType.IN ? r.quantity : -r.quantity;
      lowest = Math.min(lowest, running);
    }
    const first = history[0];
    const category = ARTICLE_CATEGORY[norm(first.category)] ?? ArticleCategory.CONSOMMABLES;
    const zone = zones.get(DEFAULT_ZONE[category]) ?? [...zones.values()][0];
    if (!zone) throw new Error('Aucune zone en base : lancez le seed avant l\'import.');
    const jesa = norm(first.requesterType).startsWith('jesa');
    const article = await prisma.article.create({
      data: {
        code: `ART-${nextCode++}`,
        designation: first.designation,
        category,
        origin: jesa ? ArticleOrigin.JESA : ArticleOrigin.OCP,
        originLabel: jesa ? 'JESA Maintenance' : 'Magasin OCP',
        zoneId: zone.id,
        rackLocation: `${zone.name} – emplacement à préciser`,
        currentStock: -lowest,
        minStock: 0,
        unitCostCMP: 0,
        abcClass: AbcClass.C,
      },
    });
    articleId.set(key, article.id);
    report.createdArticles.push(`${article.code} ${article.designation}${lowest < 0 ? ` (stock d'ouverture ${-lowest})` : ''}`);
  }

  // ── Fiches (une transaction par ligne, dans l'ordre chronologique) ──
  for (const r of rows) {
    try {
      await prisma.$transaction((tx) =>
        recordStockSheet(tx, {
          type: r.type,
          date: r.date,
          designation: r.designation,
          articleId: articleId.get(norm(r.designation)) as number,
          category: r.category,
          quantity: r.quantity,
          unit: r.unit,
          requesterType: r.requesterType,
          requesterName: r.requesterName,
          storekeeperId: storekeeperId.get(norm(r.storekeeperName)) as number,
          post: r.post,
          supplier: r.supplier,
          destinationZone: r.destinationZone,
          destinationArea: r.destinationArea,
          photos: r.photoUrl ? [{ externalUrl: r.photoUrl, originalName: 'Photo Google Drive' }] : [],
          sourceRef: r.sourceRef,
          createdAt: r.submittedAt,
        }),
      );
      report.imported++;
    } catch (e) {
      report.errors.push(`Ligne ${r.line} (${r.designation}) : ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return report;
}

export function printReport(report: ImportReport): void {
  console.log(
    `Import ${report.file} : ${report.imported} fiche(s) importée(s), ${report.alreadyImported} déjà présente(s), ` +
      `${report.createdArticles.length} article(s) et ${report.createdStorekeepers.length} magasinier(s) créé(s).`,
  );
  for (const a of report.createdArticles) console.log(`  + article ${a}`);
  for (const s of report.createdStorekeepers) console.log(`  + magasinier ${s} (matricule provisoire)`);
  for (const err of report.errors) console.warn(`  ! ${err}`);
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage : pnpm --filter api import:sheet <fichier.tsv>');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  importSheetFile(prisma, path.resolve(file))
    .then((report) => {
      printReport(report);
      if (report.errors.length) process.exitCode = 1;
    })
    .catch((e: unknown) => {
      console.error(e instanceof Error ? e.message : e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

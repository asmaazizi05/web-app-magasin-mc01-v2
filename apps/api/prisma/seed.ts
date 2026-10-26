/**
 * Seed MC01 : insère les données d'exemple de la maquette de référence (design-reference.html).
 * Les BR/BS sont rejoués chronologiquement via le même registre de stock que l'API,
 * de sorte que StockMovement.stockAfter et Article.currentStock restent cohérents.
 */
import 'dotenv/config';
import {
  AbcClass,
  ArticleCategory,
  ArticleOrigin,
  AuditStatus,
  ExpeditionPriority,
  ExpeditionStatus,
  MovementType,
  PrismaClient,
  ReceptionStatus,
  ShiftType,
  ZoneType,
} from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { applyStockMovement } from '../src/common/stock-ledger';
import { addDays, dayToDate, siteDateTime } from '../src/common/site-time';
import { ensureReferenceData } from './reference-data';
import { loadDemoEngins } from '../src/engins/engins.demo';
import { importSheetFile, printReport } from './import-sheet';

const prisma = new PrismaClient();

/** Heure locale du site (Maroc) → instant UTC */
const at = siteDateTime;

/** Exports Google Sheet réels du formulaire E/S, rejoués après les données de la maquette */
const SHEET_DATA_DIR = path.join(__dirname, 'data');

const ZONES = [
  {
    code: 'hangar-racks',
    position: 1,
    name: 'Hangar Rayonnage',
    category: 'Hangar Rayonnages',
    description: 'Rayonnage Lourd & Mi-Lourd',
    planTitle: 'Aménagement Hangar Rayonnages (Dimension: 13 085mm x 6 485mm)',
    planSubtitle: 'Plan 13085x6485 (6 Allées)',
    type: ZoneType.HANGAR,
    capacity: 79500,
  },
  {
    code: 'grand-abri',
    position: 2,
    name: 'Grand Abri (600 m²)',
    category: 'Grand Abri (600 m²)',
    description: 'Matériel Lourd & Palettes',
    planTitle: 'Grand Abri (Surface: 600 m² - Stockage Matériel Lourd)',
    planSubtitle: 'Stockage Matériel Lourd',
    type: ZoneType.ABRI,
    capacity: 52500,
    areaM2: 600,
  },
  {
    code: 'petit-abri',
    position: 3,
    name: 'Petit Abri',
    category: 'Petit Abri',
    description: 'Outillage & Consommables',
    planTitle: 'Petit Abri (Outillage spécialisé & Consommables rapides)',
    planSubtitle: 'Consommables & Outillage',
    type: ZoneType.ABRI,
    capacity: 15060,
  },
  {
    code: 'zone-ext',
    position: 4,
    name: 'Zone Extérieure',
    category: 'Parc Extérieur',
    description: 'Tuyauterie & Cuves Lourd',
    planTitle: 'Zone Extérieure (Parc Lourd - Tuyauteries DN300 & Conteneurs)',
    planSubtitle: 'Parc Tuyauterie & Cuves',
    type: ZoneType.EXTERIEUR,
    capacity: 57720,
  },
  {
    code: 'grand-modulaire',
    position: 5,
    name: 'Grand Modulaire',
    category: 'Grand Modulaire',
    description: 'Bureaux & Tool Crib',
    planTitle: 'Grand Modulaire (Bureaux Magasiniers & Tool Crib Outillage)',
    planSubtitle: 'Bureaux & Tool Crib',
    type: ZoneType.MODULAIRE,
    capacity: 1500,
  },
];

const RACKS = [1, 2, 3, 4, 5, 6].map((n) => ({
  code: `R${n}`,
  aisle: n,
  aisleLabel: n === 6 ? 'Bordure (110cm)' : `Allée ${n} (120cm)`,
  levels: 3,
  capacity: 250,
}));

const STOREKEEPERS = [
  { matricule: 'M-8801', name: 'Karim BENANI', role: 'Chef', specialty: 'Réceptions' },
  { matricule: 'M-8802', name: 'Mohammed ALAMI', role: 'Cariste', specialty: 'Réceptions & Manutention' },
  { matricule: 'M-8803', name: 'Youssef CHRAIBI', role: 'Magasinier', specialty: 'Expéditions / Picking' },
  { matricule: 'M-8804', name: 'Hassan KABBAB', role: 'Magasinier', specialty: 'Soutien Inventaire & Admin' },
  { matricule: 'M-8805', name: 'Omar DRIOUCH', role: 'Magasinier', specialty: 'Garde & Urgences' },
];

const { MATIN, APRES_MIDI, NUIT, OFF } = ShiftType;
const ROTATION: Record<string, ShiftType[]> = {
  'M-8801': [MATIN, APRES_MIDI, NUIT, OFF],
  'M-8802': [MATIN, APRES_MIDI, OFF, NUIT],
  'M-8803': [APRES_MIDI, NUIT, MATIN, OFF],
  'M-8804': [OFF, MATIN, APRES_MIDI, NUIT],
  'M-8805': [NUIT, OFF, MATIN, APRES_MIDI],
};

/** `finalStock` = stock affiché dans la maquette ; le stock d'ouverture est recalculé à partir des mouvements. */
const ARTICLES = [
  {
    code: 'ART-1001',
    designation: 'Roulements SKF 6205',
    category: ArticleCategory.MECANIQUE,
    origin: ArticleOrigin.JESA,
    originLabel: 'Projet JESA',
    zone: 'hangar-racks',
    rack: 'R1',
    rackLevel: 3,
    finalStock: 150,
    minStock: 50,
    unitCostCMP: 220,
    abcClass: AbcClass.B,
  },
  {
    code: 'ART-1002',
    designation: 'Vanne à papillon DN100',
    category: ArticleCategory.MECANIQUE,
    origin: ArticleOrigin.OCP,
    originLabel: 'Magasin OCP',
    zone: 'hangar-racks',
    rack: 'R1',
    rackLevel: 2,
    finalStock: 12,
    minStock: 25,
    unitCostCMP: 1450,
    abcClass: AbcClass.B,
  },
  {
    code: 'ART-1003',
    designation: 'Clé Dynamométrique 1/2"',
    category: ArticleCategory.OUTILLAGE,
    origin: ArticleOrigin.CESSION,
    originLabel: 'Cession OCP Jorf',
    zone: 'hangar-racks',
    rack: 'R6',
    rackLevel: 3,
    finalStock: 5,
    minStock: 2,
    unitCostCMP: 3800,
    abcClass: AbcClass.C,
  },
  {
    code: 'ART-1004',
    designation: 'Filtre Hydraulique Cartouche',
    category: ArticleCategory.CONSOMMABLES,
    origin: ArticleOrigin.CESSION,
    originLabel: 'Cession OCP Khouribga',
    zone: 'hangar-racks',
    rack: 'R3',
    rackLevel: 3,
    finalStock: 18,
    minStock: 15,
    unitCostCMP: 850,
    abcClass: AbcClass.C,
  },
  {
    code: 'ART-1005',
    designation: 'Tuyauterie Acier DN300 (6m)',
    category: ArticleCategory.TUYAUTERIE,
    origin: ArticleOrigin.JESA,
    originLabel: 'Projet JESA',
    zone: 'zone-ext',
    rack: null,
    rackLevel: null,
    rackLocation: 'Zone Extérieure - Parc Lourd',
    finalStock: 42,
    minStock: 10,
    unitCostCMP: 12500,
    abcClass: AbcClass.A,
  },
];

const RECEPTIONS = [
  { number: 'BR-2026-0889', date: at('2026-10-01', '16:45'), supplier: 'Cession Site OCP Khouribga', article: 'ART-1004', quantity: 18, receiver: 'M-8805', status: ReceptionStatus.VALIDE },
  { number: 'BR-2026-0890', date: at('2026-10-02', '11:00'), supplier: 'Souss Matériel Industrie', article: 'ART-1002', quantity: 10, receiver: 'M-8801', status: ReceptionStatus.CONTROLE_QUALITE },
  { number: 'BR-2026-0891', date: at('2026-10-03', '14:15'), supplier: 'Cession Site OCP Jorf', article: 'ART-1003', quantity: 5, receiver: 'M-8803', status: ReceptionStatus.VALIDE },
  { number: 'BR-2026-0892', date: at('2026-10-04', '08:30'), supplier: 'SKF Maroc SA', article: 'ART-1001', quantity: 50, receiver: 'M-8802', status: ReceptionStatus.VALIDE },
];

const EXPEDITIONS = [
  {
    number: 'BS-2026-1401',
    date: at('2026-10-01', '10:15'),
    dueAt: at('2026-10-04', '10:15'),
    servedAt: at('2026-10-01', '10:41'),
    service: 'Chantier Tuyauterie Nord',
    article: 'ART-1005',
    quantity: 6,
    priority: ExpeditionPriority.NORMALE,
    status: ExpeditionStatus.LIVRE,
    preparer: 'M-8805',
  },
  {
    number: 'BS-2026-1402',
    date: at('2026-10-03', '15:30'),
    dueAt: at('2026-10-06', '15:30'),
    servedAt: at('2026-10-03', '15:52'),
    service: 'Projet Extension Modulaire',
    article: 'ART-1003',
    quantity: 1,
    priority: ExpeditionPriority.NORMALE,
    status: ExpeditionStatus.LIVRE,
    preparer: 'M-8803',
  },
  {
    number: 'BS-2026-1403',
    date: at('2026-10-04', '09:00'),
    dueAt: at('2026-10-04', '13:00'),
    servedAt: null,
    service: 'Maintenance Engrais (Urgence)',
    article: 'ART-1002',
    quantity: 2,
    priority: ExpeditionPriority.URGENT,
    status: ExpeditionStatus.EN_PICKING,
    preparer: 'M-8801',
  },
];

const AUDITS = [
  { week: 1, start: '2026-09-01', end: '2026-09-07', scope: 'Rayonnages R1 à R3 (Hangar A)', status: AuditStatus.TERMINE, counted: 110, accurate: 109, value: 2_400_000, variance: 600 },
  { week: 2, start: '2026-09-08', end: '2026-09-14', scope: 'Rayonnages R4 à R6 (Hangar A)', status: AuditStatus.TERMINE, counted: 100, accurate: 99, value: 2_300_000, variance: 500 },
  { week: 3, start: '2026-09-15', end: '2026-09-21', scope: 'Grand Abri & Petit Abri (Abris Couverts)', status: AuditStatus.TERMINE, counted: 92, accurate: 91, value: 2_200_000, variance: 0 },
  { week: 4, start: '2026-09-22', end: '2026-09-30', scope: 'Zone Extérieure Parc Lourd & Modulaire', status: AuditStatus.TERMINE, counted: 90, accurate: 89, value: 2_100_000, variance: 900 },
  { week: 1, start: '2026-10-01', end: '2026-10-04', scope: 'Rayonnages R1 à R3 (Hangar A)', status: AuditStatus.TERMINE, counted: 48, accurate: 48, value: 1_000_000, variance: 0 },
  { week: 2, start: '2026-10-05', end: '2026-10-11', scope: 'Rayonnages R4 à R6 (Hangar A)', status: AuditStatus.PLANIFIE, counted: 0, accurate: 0, value: 0, variance: 0 },
  { week: 3, start: '2026-10-12', end: '2026-10-18', scope: 'Grand Abri & Petit Abri (Abris Couverts)', status: AuditStatus.A_VENIR, counted: 0, accurate: 0, value: 0, variance: 0 },
  { week: 4, start: '2026-10-19', end: '2026-10-25', scope: 'Zone Extérieure Parc Lourd & Modulaire', status: AuditStatus.A_VENIR, counted: 0, accurate: 0, value: 0, variance: 0 },
];

async function main(): Promise<void> {
  // Remise à zéro complète : RESTART IDENTITY garantit des identifiants stables (1, 2, 3…) à chaque seed.
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "StockSheetPhoto", "StockSheet", "StockMovement", "Reception", "Expedition", "Shift",
      "Article", "Rack", "Zone", "Storekeeper", "InventoryAudit", "Settings", "Training", "Habilitation",
      "HabilitationType", "Engin", "Intervention", "InterventionMember", "InterventionTask", "WorkLog",
      "MaintenanceRecord", "EnginCheck", "InventoryCount", "InventoryCountLine" RESTART IDENTITY CASCADE`,
  );

  const zoneIds = new Map<string, number>();
  for (const z of ZONES) zoneIds.set(z.code, (await prisma.zone.create({ data: z })).id);

  const hangarId = zoneIds.get('hangar-racks') as number;
  const rackIds = new Map<string, number>();
  for (const r of RACKS) rackIds.set(r.code, (await prisma.rack.create({ data: { ...r, zoneId: hangarId } })).id);

  const storekeeperIds = new Map<string, number>();
  for (const s of STOREKEEPERS) {
    const sk = await prisma.storekeeper.create({ data: s });
    storekeeperIds.set(s.matricule, sk.id);
    await prisma.shift.createMany({
      // Semaine 1 de la maquette = semaine du lundi 05/10/2026
      data: ROTATION[s.matricule].map((type, i) => ({ storekeeperId: sk.id, weekStart: addDays(dayToDate('2026-10-05'), i * 7), type })),
    });
  }

  // Stock d'ouverture = stock final − flux net des documents rejoués ci-dessous
  const net = new Map<string, number>();
  for (const r of RECEPTIONS) net.set(r.article, (net.get(r.article) ?? 0) + r.quantity);
  for (const e of EXPEDITIONS) net.set(e.article, (net.get(e.article) ?? 0) - e.quantity);

  const articleIds = new Map<string, number>();
  for (const a of ARTICLES) {
    const { zone, rack, finalStock, rackLocation, ...data } = a as (typeof ARTICLES)[number] & { rackLocation?: string };
    const created = await prisma.article.create({
      data: {
        ...data,
        zoneId: zoneIds.get(zone) as number,
        rackId: rack ? (rackIds.get(rack) as number) : null,
        rackLocation: rackLocation ?? `Rayonnage ${rack} - Niv ${a.rackLevel}`,
        currentStock: finalStock - (net.get(a.code) ?? 0),
      },
    });
    articleIds.set(a.code, created.id);
  }

  // Rejeu chronologique des BR et BS
  type Doc = { kind: 'BR'; date: Date; data: (typeof RECEPTIONS)[number] } | { kind: 'BS'; date: Date; data: (typeof EXPEDITIONS)[number] };
  const docs: Doc[] = [
    ...RECEPTIONS.map((data): Doc => ({ kind: 'BR', date: data.date, data })),
    ...EXPEDITIONS.map((data): Doc => ({ kind: 'BS', date: data.date, data })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const doc of docs) {
    await prisma.$transaction(async (tx) => {
      if (doc.kind === 'BR') {
        const r = doc.data;
        const articleId = articleIds.get(r.article) as number;
        const receiverId = storekeeperIds.get(r.receiver) as number;
        const reception = await tx.reception.create({
          data: { number: r.number, supplier: r.supplier, articleId, quantity: r.quantity, receivedAt: r.date, receiverId, status: r.status },
        });
        await applyStockMovement(tx, {
          type: MovementType.IN,
          articleId,
          quantity: r.quantity,
          date: r.date,
          documentNumber: r.number,
          source: r.supplier,
          storekeeperId: receiverId,
          receptionId: reception.id,
        });
      } else {
        const e = doc.data;
        const articleId = articleIds.get(e.article) as number;
        const preparerId = storekeeperIds.get(e.preparer) as number;
        const expedition = await tx.expedition.create({
          data: {
            number: e.number,
            requesterService: e.service,
            articleId,
            quantity: e.quantity,
            priority: e.priority,
            status: e.status,
            requestedAt: e.date,
            dueAt: e.dueAt,
            servedAt: e.servedAt,
            preparerId,
          },
        });
        await applyStockMovement(tx, {
          type: MovementType.OUT,
          articleId,
          quantity: e.quantity,
          date: e.date,
          documentNumber: e.number,
          destination: e.service,
          storekeeperId: preparerId,
          expeditionId: expedition.id,
        });
      }
    });
  }

  await prisma.inventoryAudit.createMany({
    data: AUDITS.map((a) => ({
      weekNumber: a.week,
      startDate: at(a.start, '00:00'),
      endDate: at(a.end, '23:59'),
      scope: a.scope,
      status: a.status,
      countedLines: a.counted,
      accurateLines: a.accurate,
      countedValue: a.value,
      varianceValue: a.variance,
    })),
  });

  await prisma.settings.create({
    data: {
      id: 1,
      siteName: 'Magasin Central MC01',
      siteCode: 'MC01',
      sapSystem: 'SAP S/4HANA',
      sapHost: 'sap-s4h.example.local',
      sapClient: '100',
      sapPlant: 'MC01',
      sapStorageLocation: '0001',
      syncIntervalMinutes: 15,
      autoSync: true,
      connected: true,
      lastSyncAt: at('2026-10-04', '09:15'),
    },
  });

  // Contrôle de cohérence : le stock final doit correspondre à la maquette
  for (const a of ARTICLES) {
    const article = await prisma.article.findUniqueOrThrow({ where: { code: a.code } });
    if (article.currentStock !== a.finalStock) {
      throw new Error(`${a.code} : stock ${article.currentStock} ≠ ${a.finalStock} attendu`);
    }
  }

  const movements = await prisma.stockMovement.count();
  console.log(
    `Seed MC01 terminé : ${ZONES.length} zones, ${RACKS.length} racks, ${STOREKEEPERS.length} magasiniers, ` +
      `${ARTICLES.length} articles, ${RECEPTIONS.length} BR, ${EXPEDITIONS.length} BS, ${movements} mouvements.`,
  );

  await ensureReferenceData(prisma);
  console.log(`Parc engins de démonstration : ${await loadDemoEngins(prisma)} engin(s).`);

  // Données réelles : exports du formulaire « Mouvements de stock (E/S) » (prisma/data/*.tsv)
  const files = fs.existsSync(SHEET_DATA_DIR)
    ? fs.readdirSync(SHEET_DATA_DIR).filter((f) => f.endsWith('.tsv')).sort()
    : [];
  for (const file of files) printReport(await importSheetFile(prisma, path.join(SHEET_DATA_DIR, file)));
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

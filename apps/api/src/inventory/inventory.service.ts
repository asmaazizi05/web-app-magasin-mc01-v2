import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ArticleCategory, InventoryLineStatus, MovementType, Prisma, PurchaseScope, ShiftType } from '@prisma/client';
import { dateToDay, dayToDate, siteToday } from '../common/site-time';
import { toNumber } from '../common/stock';
import { applyStockMovement, isUniqueViolation, nextDocumentNumber } from '../common/stock-ledger';
import { PrismaService } from '../prisma/prisma.service';
import { COUNT_UNITS, keywords, normalize, ORIGIN_OF_SCOPE, PURCHASE_SCOPES, tokens, wordsMatch } from './inventory.config';
import { CreateArticleFromLineDto, CreateCountDto, LinkLineDto, RejectDto, ResolverDto } from './inventory.dto';

export interface ReferentialItem {
  id: number;
  code: string;
  designation: string;
  zoneName: string;
  rackLocation: string;
  /** Catégorie proposée (dernière utilisée dans les fiches Mouvements, sinon catégorie du catalogue) */
  category: string;
}

export interface CountLineView {
  id: number;
  article: { id: number; code: string; designation: string } | null;
  enteredReference: string | null;
  enteredDesignation: string | null;
  quantity: number;
  unit: string;
  purchaseScope: PurchaseScope;
  category: string | null;
  photoUrl: string | null;
  status: InventoryLineStatus;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  rejectReason: string | null;
  stockBefore: number | null;
  stockAfter: number | null;
  movementNumber: string | null;
}

export interface CountView {
  id: number;
  number: string;
  countedAt: string;
  location: string | null;
  post: ShiftType | null;
  comment: string | null;
  storekeeper: { id: number; name: string; matricule: string };
  createdAt: Date;
  lines: CountLineView[];
}

export interface DesignationRequest extends CountLineView {
  count: { id: number; number: string; countedAt: string; location: string | null; storekeeperName: string };
  /** Articles du référentiel qui ressemblent à la saisie */
  suggestions: (ReferentialItem & { score: number })[];
}

/** Comptages à valider, regroupés par article : un article compté à plusieurs endroits est additionné */
export interface PendingValidation {
  article: { id: number; code: string; designation: string; currentStock: number; unitCostCMP: number; rackLocation: string };
  lines: (CountLineView & { countNumber: string; storekeeperName: string; countedAt: string; location: string | null })[];
  counted: number;
  /** Compté − stock théorique */
  gap: number;
  gapValue: number;
}

export interface InventoryOptions {
  units: string[];
  purchaseScopes: { value: PurchaseScope; label: string }[];
}

/** Catégorie du catalogue → catégorie de la fiche Mouvements (quand l'article n'a jamais été saisi) */
const CATEGORY_OF_ARTICLE: Record<ArticleCategory, string> = {
  MECANIQUE: 'Mécanique',
  ELECTRIQUE: 'Électrique & Instrumentation',
  TUYAUTERIE: 'Tuyauterie et robinetterie',
  OUTILLAGE: 'Outillage',
  CONSOMMABLES: 'Consommables',
};

const LINE_INCLUDE = { article: { select: { id: true, code: true, designation: true } } } satisfies Prisma.InventoryCountLineInclude;
type LineRow = Prisma.InventoryCountLineGetPayload<{ include: typeof LINE_INCLUDE }>;

const lineView = (l: LineRow): CountLineView => ({
  id: l.id,
  article: l.article,
  enteredReference: l.enteredReference,
  enteredDesignation: l.enteredDesignation,
  quantity: l.quantity,
  unit: l.unit,
  purchaseScope: l.purchaseScope,
  category: l.category,
  photoUrl: l.photoFileName ? `/uploads/${l.photoFileName}` : null,
  status: l.status,
  resolvedBy: l.resolvedBy,
  resolvedAt: l.resolvedAt,
  rejectReason: l.rejectReason,
  stockBefore: l.stockBefore,
  stockAfter: l.stockAfter,
  movementNumber: l.movementNumber,
});

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  options(): InventoryOptions {
    return { units: COUNT_UNITS, purchaseScopes: PURCHASE_SCOPES };
  }

  /** Recherche dans le référentiel par référence ou désignation (sans accents, mots dans n'importe quel ordre) */
  async search(q: string | undefined): Promise<ReferentialItem[]> {
    const words = tokens(q ?? '');
    const articles = await this.referential();
    if (words.length === 0) return articles.slice(0, 15);
    const scored = articles
      .map((a) => {
        const code = normalize(a.code);
        const text = `${code} ${normalize(a.designation)}`;
        if (!words.every((w) => text.includes(w))) return null;
        const joined = words.join(' ');
        const score = code === joined ? 100 : code.startsWith(joined) ? 80 : normalize(a.designation).startsWith(joined) ? 60 : 40;
        return { a, score };
      })
      .filter((x): x is { a: ReferentialItem; score: number } => x !== null)
      .sort((x, y) => y.score - x.score || x.a.code.localeCompare(y.a.code));
    if (scored.length) return scored.slice(0, 15).map((x) => x.a);
    // Aucun résultat exact : recherche approchée (fautes de frappe, codes séparés « DN 100 »)
    return this.suggest(q ?? '', articles, 50).slice(0, 15);
  }

  // ───────────── Saisie ─────────────

  /** Enregistre la fiche ; `photos[i]` est la photo de la ligne i (une photo obligatoire par ligne) */
  async createCount(dto: CreateCountDto, photos: Express.Multer.File[]): Promise<CountView> {
    if (photos.length !== dto.lines.length) {
      throw new BadRequestException(`Une photo est obligatoire pour chaque ligne (${photos.length} photo(s) pour ${dto.lines.length} ligne(s)).`);
    }
    const storekeeper = await this.prisma.storekeeper.findUnique({ where: { id: dto.storekeeperId } });
    if (!storekeeper) throw new BadRequestException('Magasinier inconnu.');
    const ids = [...new Set(dto.lines.map((l) => l.articleId).filter((x): x is number => Boolean(x)))];
    if (ids.length && (await this.prisma.article.count({ where: { id: { in: ids } } })) !== ids.length) {
      throw new BadRequestException('Un article sélectionné est introuvable.');
    }
    const countedAt = dayToDate(dto.countedAt);
    const year = dto.countedAt.slice(0, 4);
    const last = await this.prisma.inventoryCount.findFirst({ where: { number: { startsWith: `CPT-${year}-` } }, orderBy: { number: 'desc' } });
    const seq = last ? Number(last.number.slice(-4)) + 1 : 1;

    const count = await this.prisma.inventoryCount.create({
      data: {
        number: `CPT-${year}-${String(seq).padStart(4, '0')}`,
        storekeeperId: dto.storekeeperId,
        countedAt,
        location: dto.location?.trim() || null,
        post: dto.post,
        comment: dto.comment?.trim() || null,
        lines: {
          create: dto.lines.map((l, i) => ({
            category: l.category,
            photoFileName: photos[i].filename,
            photoName: photos[i].originalname,
            articleId: l.articleId ?? null,
            enteredReference: l.articleId ? null : l.enteredReference?.trim() || null,
            enteredDesignation: l.articleId ? null : l.enteredDesignation?.trim() || null,
            quantity: l.quantity,
            unit: l.unit,
            purchaseScope: l.purchaseScope,
            status: l.articleId ? InventoryLineStatus.A_VALIDER : InventoryLineStatus.DEMANDE_DESIGNATION,
          })),
        },
      },
    });
    return (await this.counts(1, count.id))[0];
  }

  async counts(limit = 30, id?: number): Promise<CountView[]> {
    const rows = await this.prisma.inventoryCount.findMany({
      where: { id },
      include: { storekeeper: true, lines: { include: LINE_INCLUDE, orderBy: { id: 'asc' } } },
      orderBy: [{ countedAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
    return rows.map((c) => ({
      id: c.id,
      number: c.number,
      countedAt: dateToDay(c.countedAt),
      location: c.location,
      post: c.post,
      comment: c.comment,
      storekeeper: { id: c.storekeeper.id, name: c.storekeeper.name, matricule: c.storekeeper.matricule },
      createdAt: c.createdAt,
      lines: c.lines.map(lineView),
    }));
  }

  // ───────────── Demandes de désignation / référence ─────────────

  async requests(): Promise<DesignationRequest[]> {
    const [lines, referential] = await Promise.all([
      this.prisma.inventoryCountLine.findMany({
        where: { status: InventoryLineStatus.DEMANDE_DESIGNATION },
        include: { ...LINE_INCLUDE, count: { include: { storekeeper: true } } },
        orderBy: { id: 'asc' },
      }),
      this.referential(),
    ]);
    return lines.map((l) => ({
      ...lineView(l),
      count: {
        id: l.count.id,
        number: l.count.number,
        countedAt: dateToDay(l.count.countedAt),
        location: l.count.location,
        storekeeperName: l.count.storekeeper.name,
      },
      suggestions: this.suggest(`${l.enteredReference ?? ''} ${l.enteredDesignation ?? ''}`, referential),
    }));
  }

  /** « C'est cet article » : la saisie libre est rattachée à un article existant */
  async link(lineId: number, dto: LinkLineDto): Promise<void> {
    await this.pendingRequest(lineId);
    if (!(await this.prisma.article.findUnique({ where: { id: dto.articleId } }))) throw new NotFoundException('Article introuvable.');
    await this.prisma.inventoryCountLine.update({
      where: { id: lineId },
      data: { articleId: dto.articleId, status: InventoryLineStatus.A_VALIDER, resolvedBy: dto.resolvedBy, resolvedAt: new Date() },
    });
  }

  /** « Nouvel article » : création de la référence officielle puis rattachement (stock d'ouverture 0, la validation régularise) */
  async createArticle(lineId: number, dto: CreateArticleFromLineDto): Promise<void> {
    const line = await this.pendingRequest(lineId);
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    if (!zone) throw new BadRequestException('Zone inconnue.');
    const origin = ORIGIN_OF_SCOPE[line.purchaseScope];
    try {
      await this.prisma.$transaction(async (tx) => {
        const article = await tx.article.create({
          data: {
            code: dto.code,
            designation: dto.designation.trim(),
            category: dto.category,
            origin: origin.origin,
            originLabel: origin.label,
            zoneId: zone.id,
            rackLocation: dto.rackLocation?.trim() || `${zone.name} – emplacement à préciser`,
            currentStock: 0,
            minStock: dto.minStock ?? 0,
            unitCostCMP: dto.unitCostCMP ?? 0,
            abcClass: dto.abcClass ?? 'C',
          },
        });
        await tx.inventoryCountLine.update({
          where: { id: lineId },
          data: { articleId: article.id, status: InventoryLineStatus.A_VALIDER, resolvedBy: dto.resolvedBy, resolvedAt: new Date() },
        });
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException(`Le code ${dto.code} existe déjà.`);
      throw e;
    }
  }

  async rejectLine(lineId: number, dto: RejectDto): Promise<void> {
    const line = await this.prisma.inventoryCountLine.findUnique({ where: { id: lineId } });
    if (!line) throw new NotFoundException('Ligne introuvable.');
    if (line.status === InventoryLineStatus.VALIDEE) throw new BadRequestException('Ligne déjà validée.');
    await this.prisma.inventoryCountLine.update({
      where: { id: lineId },
      data: { status: InventoryLineStatus.REJETEE, rejectReason: dto.reason?.trim() || null, resolvedBy: dto.resolvedBy, resolvedAt: new Date() },
    });
  }

  // ───────────── Validation & régularisation ─────────────

  async pending(): Promise<PendingValidation[]> {
    const lines = await this.prisma.inventoryCountLine.findMany({
      where: { status: InventoryLineStatus.A_VALIDER },
      include: { article: true, count: { include: { storekeeper: true } } },
      orderBy: { id: 'asc' },
    });
    const groups = new Map<number, PendingValidation>();
    for (const l of lines) {
      if (!l.article) continue;
      const a = l.article;
      const g =
        groups.get(a.id) ??
        ({
          article: { id: a.id, code: a.code, designation: a.designation, currentStock: a.currentStock, unitCostCMP: toNumber(a.unitCostCMP), rackLocation: a.rackLocation },
          lines: [],
          counted: 0,
          gap: 0,
          gapValue: 0,
        } as PendingValidation);
      g.lines.push({
        ...lineView({ ...l, article: { id: a.id, code: a.code, designation: a.designation } }),
        countNumber: l.count.number,
        storekeeperName: l.count.storekeeper.name,
        countedAt: dateToDay(l.count.countedAt),
        location: l.count.location,
      });
      g.counted += l.quantity;
      groups.set(a.id, g);
    }
    return [...groups.values()]
      .map((g) => ({ ...g, gap: g.counted - g.article.currentStock, gapValue: (g.counted - g.article.currentStock) * g.article.unitCostCMP }))
      .sort((x, y) => Math.abs(y.gapValue) - Math.abs(x.gapValue) || x.article.code.localeCompare(y.article.code));
  }

  /**
   * Valide les comptages d'un article et régularise le stock : stock = total compté.
   * L'écart passe par le registre (mouvement INV-YYYY-####) — jamais de modification directe du stock.
   */
  async validate(articleId: number, dto: ResolverDto): Promise<{ gap: number; movementNumber: string | null; stockAfter: number }> {
    return this.prisma.$transaction(async (tx) => {
      const article = await tx.article.findUnique({ where: { id: articleId } });
      if (!article) throw new NotFoundException('Article introuvable.');
      const lines = await tx.inventoryCountLine.findMany({ where: { articleId, status: InventoryLineStatus.A_VALIDER } });
      if (!lines.length) throw new BadRequestException('Aucun comptage à valider pour cet article.');
      const counted = lines.reduce((s, l) => s + l.quantity, 0);
      const before = article.currentStock;
      const gap = counted - before;
      let movementNumber: string | null = null;
      if (gap !== 0) {
        const now = new Date();
        movementNumber = await nextDocumentNumber(tx, 'INV', dayToDate(siteToday()));
        await applyStockMovement(tx, {
          type: gap > 0 ? MovementType.IN : MovementType.OUT,
          articleId,
          quantity: Math.abs(gap),
          date: now,
          documentNumber: movementNumber,
          source: gap > 0 ? `Régularisation inventaire (validé par ${dto.resolvedBy})` : null,
          destination: gap < 0 ? `Régularisation inventaire (validé par ${dto.resolvedBy})` : null,
        });
      }
      await tx.inventoryCountLine.updateMany({
        where: { id: { in: lines.map((l) => l.id) } },
        data: {
          status: InventoryLineStatus.VALIDEE,
          stockBefore: before,
          stockAfter: counted,
          movementNumber,
          resolvedBy: dto.resolvedBy,
          resolvedAt: new Date(),
        },
      });
      return { gap, movementNumber, stockAfter: counted };
    });
  }

  /** Comptages refusés (ex. à recompter) : le stock n'est pas modifié */
  async rejectArticle(articleId: number, dto: RejectDto): Promise<void> {
    await this.prisma.inventoryCountLine.updateMany({
      where: { articleId, status: InventoryLineStatus.A_VALIDER },
      data: { status: InventoryLineStatus.REJETEE, rejectReason: dto.reason?.trim() || 'À recompter', resolvedBy: dto.resolvedBy, resolvedAt: new Date() },
    });
  }

  // ───────────── Aides ─────────────

  private async referential(): Promise<ReferentialItem[]> {
    const [articles, sheets] = await Promise.all([
      this.prisma.article.findMany({ include: { zone: true }, orderBy: { code: 'asc' } }),
      this.prisma.stockSheet.findMany({ select: { articleId: true, category: true }, orderBy: { date: 'desc' } }),
    ]);
    // Catégorie la plus récente saisie pour chaque article dans les fiches « Mouvements de stock (E/S) »
    const lastCategory = new Map<number, string>();
    for (const s of sheets) if (!lastCategory.has(s.articleId)) lastCategory.set(s.articleId, s.category);
    return articles.map((a) => ({
      id: a.id,
      code: a.code,
      designation: a.designation,
      zoneName: a.zone.name,
      rackLocation: a.rackLocation,
      category: lastCategory.get(a.id) ?? CATEGORY_OF_ARTICLE[a.category],
    }));
  }

  /** Articles qui ressemblent à une saisie libre : proportion de mots qui correspondent (fautes de frappe légères tolérées) */
  private suggest(text: string, referential: ReferentialItem[], minScore = 34): (ReferentialItem & { score: number })[] {
    const words = keywords(text);
    if (!words.length) return [];
    return referential
      .map((a) => {
        const target = keywords(`${a.code} ${a.designation}`);
        const hits = words.filter((w) => target.some((t) => wordsMatch(w, t))).length;
        return { ...a, score: Math.round((hits / words.length) * 100) };
      })
      .filter((s) => s.score >= minScore)
      .sort((x, y) => y.score - x.score)
      .slice(0, 5);
  }

  private async pendingRequest(lineId: number) {
    const line = await this.prisma.inventoryCountLine.findUnique({ where: { id: lineId } });
    if (!line) throw new NotFoundException('Ligne introuvable.');
    if (line.status !== InventoryLineStatus.DEMANDE_DESIGNATION) throw new BadRequestException('Cette demande a déjà été traitée.');
    return line;
  }
}

import { Injectable } from '@nestjs/common';
import { AbcClass, ArticleCategory, ExpeditionStatus, MovementType } from '@prisma/client';
import { ARTICLE_INCLUDE, toArticleView } from '../articles/articles.mapper';
import { AuditsService } from '../audits/audits.service';
import { pct, round } from '../common/stock';
import { PrismaService } from '../prisma/prisma.service';
import { ZonesService, ZoneView } from '../zones/zones.service';

export interface AbcSlice {
  abcClass: AbcClass;
  articleCount: number;
  units: number;
  value: number;
  valueSharePct: number;
  cumulativeSharePct: number;
}

export interface CategoryFlow {
  category: ArticleCategory;
  quantity: number;
}

export interface StockAlert {
  articleId: number;
  code: string;
  designation: string;
  currentStock: number;
  minStock: number;
  rackLocation: string;
}

export interface DashboardKpis {
  totalUnits: number;
  totalValuation: number;
  articleCount: number;
  zonesWithStock: number;
  otif: { value: number; onTime: number; total: number };
  ira: { value: number; countedLines: number; accurateLines: number; lastAuditDate: Date | null };
  rackSaturation: { value: number; units: number; capacity: number; rackCount: number };
  avgPrepMinutes: number | null;
  abc: AbcSlice[];
  zones: ZoneView[];
  alerts: StockAlert[];
  flowsByCategory: { IN: CategoryFlow[]; OUT: CategoryFlow[] };
  generatedAt: Date;
}

@Injectable()
export class KpisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly zones: ZonesService,
    private readonly audits: AuditsService,
  ) {}

  async dashboard(): Promise<DashboardKpis> {
    const now = new Date();
    const [articles, racks, expeditions, zones, inventory, movements] = await Promise.all([
      this.prisma.article.findMany({ include: ARTICLE_INCLUDE }),
      this.prisma.rack.findMany({ include: { articles: { select: { currentStock: true } } } }),
      this.prisma.expedition.findMany({ where: { status: { not: ExpeditionStatus.ANNULE } } }),
      this.zones.findAll(),
      this.audits.kpis(),
      this.prisma.stockMovement.findMany({ select: { type: true, quantity: true, article: { select: { category: true } } } }),
    ]);

    const views = articles.map(toArticleView);
    const totalUnits = views.reduce((s, a) => s + a.currentStock, 0);
    const totalValuation = round(views.reduce((s, a) => s + a.stockValue, 0), 2);

    // OTIF : bons livrés à temps / (bons livrés + bons en retard non livrés)
    const served = expeditions.filter((e) => e.status === ExpeditionStatus.LIVRE && e.servedAt);
    const lateOpen = expeditions.filter((e) => e.status !== ExpeditionStatus.LIVRE && e.dueAt < now);
    const onTime = served.filter((e) => (e.servedAt as Date) <= e.dueAt).length;
    const otifTotal = served.length + lateOpen.length;

    const rackUnits = racks.reduce((s, r) => s + r.articles.reduce((t, a) => t + a.currentStock, 0), 0);
    const rackCapacity = racks.reduce((s, r) => s + r.capacity, 0);

    const prepDurations = served.map((e) => ((e.servedAt as Date).getTime() - e.requestedAt.getTime()) / 60_000);
    const avgPrepMinutes = prepDurations.length
      ? Math.round(prepDurations.reduce((s, d) => s + d, 0) / prepDurations.length)
      : null;

    let cumulative = 0;
    const abc: AbcSlice[] = [AbcClass.A, AbcClass.B, AbcClass.C].map((abcClass) => {
      const items = views.filter((a) => a.abcClass === abcClass);
      const value = items.reduce((s, a) => s + a.stockValue, 0);
      const share = pct(value, totalValuation);
      cumulative += value;
      return {
        abcClass,
        articleCount: items.length,
        units: items.reduce((s, a) => s + a.currentStock, 0),
        value: round(value, 2),
        valueSharePct: share,
        cumulativeSharePct: pct(cumulative, totalValuation),
      };
    });

    const flows = (type: MovementType): CategoryFlow[] =>
      Object.values(ArticleCategory)
        .map((category) => ({
          category,
          quantity: movements
            .filter((m) => m.type === type && m.article.category === category)
            .reduce((s, m) => s + m.quantity, 0),
        }))
        .filter((f) => f.quantity > 0)
        .sort((a, b) => b.quantity - a.quantity);

    return {
      totalUnits,
      totalValuation,
      articleCount: views.length,
      zonesWithStock: zones.filter((z) => z.units > 0).length,
      otif: { value: pct(onTime, otifTotal), onTime, total: otifTotal },
      ira: {
        value: inventory.ira,
        countedLines: inventory.countedLines,
        accurateLines: inventory.accurateLines,
        lastAuditDate: inventory.lastAuditDate,
      },
      rackSaturation: { value: pct(rackUnits, rackCapacity), units: rackUnits, capacity: rackCapacity, rackCount: racks.length },
      avgPrepMinutes,
      abc,
      zones,
      alerts: views
        .filter((a) => a.alertStatus === 'CRITIQUE')
        .map((a) => ({
          articleId: a.id,
          code: a.code,
          designation: a.designation,
          currentStock: a.currentStock,
          minStock: a.minStock,
          rackLocation: a.rackLocation,
        })),
      flowsByCategory: { IN: flows(MovementType.IN), OUT: flows(MovementType.OUT) },
      generatedAt: now,
    };
  }
}

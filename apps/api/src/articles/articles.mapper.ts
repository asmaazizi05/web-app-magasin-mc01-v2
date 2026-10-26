import { Article, Rack, Zone } from '@prisma/client';
import { AlertStatus, computeAlertStatus, toNumber } from '../common/stock';

export type ArticleWithPlace = Article & { zone: Zone; rack: Rack | null };

export interface ArticleView {
  id: number;
  code: string;
  designation: string;
  category: Article['category'];
  origin: Article['origin'];
  originLabel: string;
  zoneId: number;
  zoneName: string;
  rackId: number | null;
  rackCode: string | null;
  rackLevel: number | null;
  rackLocation: string;
  currentStock: number;
  minStock: number;
  unitCostCMP: number;
  stockValue: number;
  abcClass: Article['abcClass'];
  alertStatus: AlertStatus;
  updatedAt: Date;
}

export function toArticleView(a: ArticleWithPlace): ArticleView {
  const unitCost = toNumber(a.unitCostCMP);
  return {
    id: a.id,
    code: a.code,
    designation: a.designation,
    category: a.category,
    origin: a.origin,
    originLabel: a.originLabel,
    zoneId: a.zoneId,
    zoneName: a.zone.name,
    rackId: a.rackId,
    rackCode: a.rack?.code ?? null,
    rackLevel: a.rackLevel,
    rackLocation: a.rackLocation,
    currentStock: a.currentStock,
    minStock: a.minStock,
    unitCostCMP: unitCost,
    stockValue: unitCost * a.currentStock,
    abcClass: a.abcClass,
    alertStatus: computeAlertStatus(a.currentStock, a.minStock),
    updatedAt: a.updatedAt,
  };
}

export const ARTICLE_INCLUDE = { zone: true, rack: true } as const;

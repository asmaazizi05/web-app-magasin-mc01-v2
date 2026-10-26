import { Rack } from '@prisma/client';
import { ArticleView, ArticleWithPlace, toArticleView } from '../articles/articles.mapper';
import { AlertStatus, pct } from '../common/stock';

export type RackStatus = AlertStatus | 'VIDE';

export interface RackView extends Rack {
  units: number;
  saturationPct: number;
  status: RackStatus;
  articles: ArticleView[];
}

export function toRackView(rack: Rack & { articles: ArticleWithPlace[] }): RackView {
  const articles = rack.articles.map(toArticleView).sort((a, b) => (b.rackLevel ?? 0) - (a.rackLevel ?? 0));
  const units = articles.reduce((s, a) => s + a.currentStock, 0);
  const status: RackStatus =
    articles.length === 0
      ? 'VIDE'
      : articles.some((a) => a.alertStatus === 'CRITIQUE')
        ? 'CRITIQUE'
        : articles.some((a) => a.alertStatus === 'LIMITE')
          ? 'LIMITE'
          : 'CONFORME';
  const { articles: _raw, ...base } = rack;
  return { ...base, units, saturationPct: pct(units, rack.capacity), status, articles };
}

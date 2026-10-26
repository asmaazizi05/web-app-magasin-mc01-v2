import { AlertCircle, ArrowRightLeft, Filter, X } from 'lucide-react';
import Link from 'next/link';
import { ArticleForm } from '@/components/forms/ArticleForm';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { LiveSearch } from '@/components/ui/LiveSearch';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api } from '@/lib/api';
import { fmtDH, fmtUnits } from '@/lib/format';
import { ALERT_LABEL, ORIGIN_LABEL } from '@/lib/labels';
import { groupOptions, type SearchOption } from '@/lib/search';
import type { Article, ArticleOrigin } from '@/lib/types';
import { getT } from '@/lib/i18n/server';

const ORIGINS: (ArticleOrigin | 'ALL')[] = ['ALL', 'JESA', 'OCP', 'CESSION', 'ANNEXE_D'];
const STOCK_TEXT = {
  CRITIQUE: 'font-extrabold text-red-600 dark:text-red-400',
  LIMITE: 'font-bold text-amber-600 dark:text-amber-400',
  CONFORME: 'font-bold text-green-600 dark:text-green-400',
} as const;

function nextArticleCode(codes: string[]): string {
  const max = codes.reduce((m, c) => Math.max(m, Number(c.replace('ART-', '')) || 0), 1000);
  return `ART-${max + 1}`;
}

export default async function StockPage({ searchParams }: { searchParams: Promise<{ origin?: string; q?: string }> }) {
  const tr = await getT();
  const params = await searchParams;
  const origin = (['JESA', 'OCP', 'CESSION', 'ANNEXE_D'] as const).find((o) => o === params.origin);
  const q = params.q?.trim() || undefined;
  // Une seule zone de recherche : le serveur cherche à la fois dans la référence, la désignation et l'emplacement
  const [articles, all, zones, racks] = await Promise.all([api.articles({ origin, q }), api.articles(), api.zones(), api.racks()]);

  // Propositions de recherche : emplacements (regroupés), puis références et désignations
  const scope = origin ? all.filter((a) => a.origin === origin) : all;
  const atPlace = (n: number) => tr('{0} article(s) à cet emplacement', n);
  const searchOptions: SearchOption[] = [
    ...groupOptions(scope.map((a) => a.zoneName), tr('Emplacement'), 'pin', atPlace),
    ...groupOptions(scope.map((a) => a.rackCode), tr('Emplacement'), 'pin', atPlace),
    ...scope.map((a): SearchOption => ({ kind: tr('Référence'), title: a.code, detail: a.designation, query: a.code, icon: 'hash' })),
    ...scope.map((a): SearchOption => ({ kind: tr('Désignation'), title: a.designation, detail: `${a.code} · ${a.rackLocation}`, query: a.code, icon: 'package' })),
  ];

  const href = (o: ArticleOrigin | 'ALL') => {
    const sp = new URLSearchParams();
    if (o !== 'ALL') sp.set('origin', o);
    if (q) sp.set('q', q);
    const s = sp.toString();
    return s ? `/stock?${s}` : '/stock';
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr("Gestion du Stock & Catalogue d'Articles")}
        subtitle={tr('Filtrage par origine des articles (JESA, OCP, et Cessions intra-site OCP).')}
        actions={<ArticleForm zones={zones} racks={racks} nextCode={nextArticleCode(all.map((a) => a.code))} />}
      />

      {/* Recherche avec propositions pendant la saisie ; le filtre d'origine en cours est conservé */}
      <Card padding="sm">
        <LiveSearch
          initial={q ?? ''}
          basePath="/stock"
          params={{ origin }}
          placeholder={tr('Tapez une référence, une désignation ou un emplacement (ex. ART-1002, vanne, Grand Abri, R3)…')}
          options={searchOptions}
        />
      </Card>

      <Card padding="sm" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-bold text-gray-700 dark:text-gray-300">
            <Filter className="h-3.5 w-3.5 text-jesa-light" /> {tr('Origine :')}
          </span>
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-300 bg-gray-100 p-1 dark:border-gray-700 dark:bg-navy-dark">
            {ORIGINS.map((o) => {
              const active = (o === 'ALL' && !origin) || o === origin;
              return (
                <Link
                  key={o}
                  href={href(o)}
                  className={`rounded-lg px-3 py-1 text-xs transition ${
                    active ? 'bg-jesa font-bold text-white shadow' : 'font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                  }`}
                >
                  {o === 'ALL' ? tr('Tous') : ORIGIN_LABEL[o].filter}
                </Link>
              );
            })}
          </div>
          {q && (
            <Link href={origin ? `/stock?origin=${origin}` : '/stock'} className="flex items-center gap-1 rounded-lg bg-jesa/20 px-2 py-1 text-xs font-semibold text-jesa-light">
              {tr('Recherche : «')} {q} {tr('»')} <X className="h-3 w-3" />
            </Link>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {tr('Résultat :')}{' '}
          <strong className="text-gray-900 dark:text-white">
            {articles.length} {tr('article')}{articles.length > 1 ? 's' : ''}
          </strong>{' '}
          {tr('affichés')}
        </div>
      </Card>

      <Card className="space-y-3">
        <DataTable<Article>
          rows={articles}
          rowKey={(a) => a.id}
          rowClassName={(a) => (a.alertStatus === 'CRITIQUE' ? 'bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500' : '')}
          empty={tr('Aucun article ne correspond aux filtres.')}
          columns={[
            {
              key: 'code',
              header: tr('Code Article'),
              render: (a) => (
                <span className={`font-mono ${a.alertStatus === 'CRITIQUE' ? 'font-bold text-red-600 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'}`}>{a.code}</span>
              ),
            },
            { key: 'des', header: tr('Désignation'), className: 'font-bold text-gray-900 dark:text-white', render: (a) => a.designation },
            {
              key: 'origin',
              header: tr('Origine / Source'),
              render: (a) => (
                <StatusBadge tone={ORIGIN_LABEL[a.origin].tone} label={a.originLabel} shape="tag" icon={a.origin === 'CESSION' ? ArrowRightLeft : undefined} />
              ),
            },
            { key: 'loc', header: tr('Emplacement'), className: 'text-gray-600 dark:text-gray-300', render: (a) => a.rackLocation },
            { key: 'stock', header: tr('Stock Actuel'), render: (a) => <span className={STOCK_TEXT[a.alertStatus]}>{fmtUnits(a.currentStock)}</span> },
            {
              key: 'min',
              header: tr('Stock Min'),
              render: (a) => <span className={`text-gray-500 dark:text-gray-400 ${a.alertStatus === 'CRITIQUE' ? 'font-bold' : ''}`}>{fmtUnits(a.minStock)}</span>,
            },
            { key: 'cmp', header: tr('Prix Unitaire (CMP)'), className: 'text-gray-600 dark:text-gray-300', render: (a) => fmtDH(a.unitCostCMP) },
            {
              key: 'alert',
              header: tr('Statut Alerte'),
              render: (a) => (
                <StatusBadge
                  tone={ALERT_LABEL[a.alertStatus].tone}
                  label={tr(ALERT_LABEL[a.alertStatus].label)}
                  icon={a.alertStatus === 'CRITIQUE' ? AlertCircle : undefined}
                  weight={a.alertStatus === 'CRITIQUE' ? 'extrabold' : 'bold'}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

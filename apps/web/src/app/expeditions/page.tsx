import { Check, Clock } from 'lucide-react';
import { ExpeditionActions } from '@/components/forms/ExpeditionActions';
import { ExpeditionForm } from '@/components/forms/ExpeditionForm';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { DateFilter } from '@/components/ui/DateFilter';
import { LiveSearch } from '@/components/ui/LiveSearch';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api } from '@/lib/api';
import { fmtDate, fmtTime, fmtUnits, siteDayOf } from '@/lib/format';
import { EXPEDITION_STATUS, PRIORITY } from '@/lib/labels';
import { groupOptions, inPeriod, matches, readPeriod, type SearchOption } from '@/lib/search';
import type { Expedition } from '@/lib/types';
import { useT } from '@/lib/i18n';
import { getT } from '@/lib/i18n/server';

function statusLabel(e: Expedition): string {
  const tr = useT();
  const base = tr(EXPEDITION_STATUS[e.status].label);
  return e.status === 'EN_PICKING' && e.pickingPost ? tr('{0} (Poste {1})', base, e.pickingPost) : base;
}

export default async function ExpeditionsPage({ searchParams }: { searchParams: Promise<{ q?: string; year?: string; month?: string; date?: string }> }) {
  const tr = await getT();
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const period = readPeriod(params);
  const [all, articles, storekeepers] = await Promise.all([api.expeditions(), api.articles(), api.storekeepers()]);
  // Recherche : n° de bon, demandeur, article (code ou désignation), préparateur, priorité, statut
  const years = [...new Set(all.map((e) => Number(siteDayOf(e.requestedAt).slice(0, 4))))].sort((a, b) => b - a);
  const expeditions = all.filter((e) => inPeriod(siteDayOf(e.requestedAt), period)).filter((e) =>
    matches(q, e.number, e.requesterService, e.article.code, e.article.designation, e.preparer?.name, tr(PRIORITY[e.priority].label), tr(EXPEDITION_STATUS[e.status].label)),
  );
  const notes = (n: number) => tr('{0} bon(s)', n);
  const searchOptions: SearchOption[] = [
    ...groupOptions(all.map((e) => e.requesterService), tr('Demandeur'), 'building', notes),
    ...groupOptions(all.map((e) => e.article.designation), tr('Article'), 'package', notes),
    ...groupOptions(all.map((e) => e.preparer?.name), tr('Magasinier'), 'user', notes),
    ...all.map((e): SearchOption => ({ kind: tr('N° de bon'), title: e.number, detail: `${e.requesterService} · ${e.article.designation}`, query: e.number, icon: 'doc' })),
    ...groupOptions(all.map((e) => e.article.code), tr('Référence'), 'hash', notes),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr('Sorties de Stock & Expéditions Chantier')}
        subtitle={tr("Suivi chronologique des ordres d'extraction pour la maintenance et les chantiers OCP.")}
        actions={<ExpeditionForm articles={articles} storekeepers={storekeepers} />}
      />
      <Card padding="sm">
        <LiveSearch
          initial={q ?? ''}
          basePath="/expeditions"
          params={period}
          placeholder={tr('Tapez un n° de bon, un demandeur, un article ou un magasinier (ex. BS-2026-0412, maintenance, joint)…')}
          options={searchOptions}
        />
        <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-800">
          <DateFilter basePath="/expeditions" params={{ q }} years={years} {...period} />
        </div>
      </Card>
      <p className="text-right text-xs text-gray-500 dark:text-gray-400">
        {tr('Résultat :')} <strong className="text-gray-900 dark:text-white">{tr('{0} bon(s)', expeditions.length)}</strong> {tr('sur {0}', all.length)}
      </p>
      <Card className="space-y-3">
        <DataTable<Expedition>
          rows={expeditions}
          rowKey={(e) => e.id}
          empty={q ? tr('Aucun bon ne correspond à la recherche.') : tr('Aucun bon de sortie.')}
          columns={[
            { key: 'num', header: tr('N° Bon Sortie'), className: 'font-mono font-bold text-blue-600 dark:text-blue-400', render: (e) => e.number },
            {
              key: 'date',
              header: tr('Date Demande'),
              className: 'whitespace-nowrap font-semibold text-gray-900 dark:text-white',
              render: (e) => (
                <>
                  {e.status === 'LIVRE' ? (
                    <Check className="mr-1 inline h-3 w-3 text-green-500" />
                  ) : (
                    <Clock className={`mr-1 inline h-3 w-3 ${e.priority === 'URGENT' ? 'text-red-500' : 'text-gray-400'}`} />
                  )}
                  {fmtDate(e.requestedAt)} <span className="text-[10px] text-gray-400">{fmtTime(e.requestedAt)}</span>
                </>
              ),
            },
            { key: 'svc', header: tr('Demandeur / Service'), className: 'text-gray-800 dark:text-gray-200', render: (e) => e.requesterService },
            { key: 'art', header: tr('Article Demandé'), className: 'text-gray-700 dark:text-gray-300', render: (e) => e.article.designation },
            { key: 'qty', header: tr('Quantité'), className: 'font-bold text-gray-900 dark:text-white', render: (e) => fmtUnits(e.quantity) },
            { key: 'prio', header: tr('Priorité'), render: (e) => <StatusBadge tone={PRIORITY[e.priority].tone} label={tr(PRIORITY[e.priority].label)} shape="tag" /> },
            { key: 'st', header: tr('Statut Picking'), render: (e) => <StatusBadge tone={EXPEDITION_STATUS[e.status].tone} label={statusLabel(e)} /> },
            { key: 'act', header: '', render: (e) => <ExpeditionActions expedition={e} /> },
          ]}
        />
      </Card>
    </div>
  );
}

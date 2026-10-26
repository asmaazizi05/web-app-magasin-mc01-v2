import { Calendar } from 'lucide-react';
import { ReceptionForm } from '@/components/forms/ReceptionForm';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { DateFilter } from '@/components/ui/DateFilter';
import { LiveSearch } from '@/components/ui/LiveSearch';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api } from '@/lib/api';
import { fmtDate, fmtTime, fmtUnits, siteDayOf } from '@/lib/format';
import { RECEPTION_STATUS } from '@/lib/labels';
import { groupOptions, inPeriod, matches, readPeriod, type SearchOption } from '@/lib/search';
import type { Reception } from '@/lib/types';
import { getT } from '@/lib/i18n/server';

const isCession = (r: Reception) => r.supplier.toLowerCase().startsWith('cession');

export default async function ReceptionsPage({ searchParams }: { searchParams: Promise<{ q?: string; year?: string; month?: string; date?: string }> }) {
  const tr = await getT();
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const period = readPeriod(params);
  const [all, articles, storekeepers] = await Promise.all([api.receptions(), api.articles(), api.storekeepers()]);
  // Recherche : n° de bon, fournisseur, article (code ou désignation), magasinier, statut
  const years = [...new Set(all.map((r) => Number(siteDayOf(r.receivedAt).slice(0, 4))))].sort((a, b) => b - a);
  const receptions = all.filter((r) => inPeriod(siteDayOf(r.receivedAt), period)).filter((r) => matches(q, r.number, r.supplier, r.article.code, r.article.designation, r.receiver.name, tr(RECEPTION_STATUS[r.status].label)));
  const notes = (n: number) => tr('{0} bon(s)', n);
  const searchOptions: SearchOption[] = [
    ...groupOptions(all.map((r) => r.supplier), tr('Fournisseur'), 'building', notes),
    ...groupOptions(all.map((r) => r.article.designation), tr('Article'), 'package', notes),
    ...groupOptions(all.map((r) => r.receiver.name), tr('Magasinier'), 'user', notes),
    ...all.map((r): SearchOption => ({ kind: tr('N° de bon'), title: r.number, detail: `${r.supplier} · ${r.article.designation}`, query: r.number, icon: 'doc' })),
    ...groupOptions(all.map((r) => r.article.code), tr('Référence'), 'hash', notes),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr('Réceptions & Entrées de Stock')}
        subtitle={tr('Historique des Bons de Réception (BR) contrôlés et enregistrés dans SAP.')}
        actions={<ReceptionForm articles={articles} storekeepers={storekeepers} />}
      />
      <Card padding="sm">
        <LiveSearch
          initial={q ?? ''}
          basePath="/receptions"
          params={period}
          placeholder={tr('Tapez un n° de bon, un fournisseur, un article ou un magasinier (ex. BR-2026-0893, SKF, huile)…')}
          options={searchOptions}
        />
        <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-800">
          <DateFilter basePath="/receptions" params={{ q }} years={years} {...period} />
        </div>
      </Card>
      <p className="text-right text-xs text-gray-500 dark:text-gray-400">
        {tr('Résultat :')} <strong className="text-gray-900 dark:text-white">{tr('{0} bon(s)', receptions.length)}</strong> {tr('sur {0}', all.length)}
      </p>
      <Card className="space-y-3">
        <DataTable<Reception>
          rows={receptions}
          rowKey={(r) => r.id}
          empty={q ? tr('Aucun bon ne correspond à la recherche.') : tr('Aucun bon de réception.')}
          columns={[
            { key: 'num', header: tr('N° BR (SAP)'), className: 'font-mono font-bold text-jesa-light', render: (r) => r.number },
            {
              key: 'date',
              header: tr('Date & Heure Réception'),
              className: 'whitespace-nowrap font-semibold text-gray-900 dark:text-white',
              render: (r) => (
                <>
                  <Calendar
                    className={`mr-1 inline h-3 w-3 ${r.status === 'CONTROLE_QUALITE' ? 'text-amber-500' : isCession(r) ? 'text-purple-400' : 'text-jesa-light'}`}
                  />
                  {fmtDate(r.receivedAt)} <span className="text-[10px] text-gray-400">{fmtTime(r.receivedAt)}</span>
                </>
              ),
            },
            {
              key: 'sup',
              header: tr('Fournisseur / Origine'),
              render: (r) => (
                <span className={isCession(r) ? 'font-semibold text-purple-600 dark:text-purple-300' : 'text-gray-800 dark:text-gray-200'}>{r.supplier}</span>
              ),
            },
            { key: 'art', header: tr('Articles'), className: 'text-gray-700 dark:text-gray-300', render: (r) => r.article.designation },
            { key: 'qty', header: tr('Quantité'), className: 'font-bold text-gray-900 dark:text-white', render: (r) => fmtUnits(r.quantity) },
            { key: 'rcv', header: tr('Magasinier Récepteur'), className: 'text-gray-700 dark:text-gray-300', render: (r) => r.receiver.name },
            { key: 'st', header: tr('Statut'), render: (r) => <StatusBadge tone={RECEPTION_STATUS[r.status].tone} label={tr(RECEPTION_STATUS[r.status].label)} /> },
          ]}
        />
      </Card>
    </div>
  );
}

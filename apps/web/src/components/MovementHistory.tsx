'use client';

import { ArrowDownLeft, ArrowUpRight, History } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { fmtDate, fmtInt, fmtTime } from '@/lib/format';
import type { Movement, MovementType } from '@/lib/types';
import { CardTitle } from './ui/Card';
import { DataTable } from './ui/DataTable';
import { StatusBadge } from './ui/StatusBadge';
import { useT } from '@/lib/i18n';

type Filter = 'ALL' | MovementType;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'Tous' },
  { key: 'IN', label: 'Entrées' },
  { key: 'OUT', label: 'Sorties' },
];

/** Historique chronologique des mouvements ; le filtre interroge GET /movements?type=IN|OUT. */
export function MovementHistory({ initial }: { initial: Movement[] }) {
  const tr = useT();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [rows, setRows] = useState<Movement[]>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const select = async (f: Filter) => {
    setFilter(f);
    setLoading(true);
    setError(null);
    try {
      setRows(await api.movements(f === 'ALL' ? undefined : f));
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('Erreur de chargement.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-navy-light">
      <CardTitle
        icon={<History className="h-4 w-4 text-jesa-light" />}
        aside={
          <div className="flex items-center gap-1 rounded-xl border border-gray-300 bg-gray-100 p-1 text-xs font-semibold dark:border-gray-700 dark:bg-navy-dark">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => void select(f.key)}
                className={`rounded-lg px-3 py-1 transition ${
                  filter === f.key ? 'bg-jesa text-white shadow' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                }`}
              >
                {tr(f.label)}
              </button>
            ))}
          </div>
        }
      >
        {tr('Historique Chronologique des Mouvements de Stock')}
      </CardTitle>
      {error && <p className="text-xs text-red-500">{tr(error)}</p>}
      <div className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
        <DataTable<Movement>
          rows={rows}
          rowKey={(m) => m.id}
          empty={tr('Aucun mouvement pour ce filtre.')}
          columns={[
            {
              key: 'date',
              header: tr('Date & Heure'),
              className: 'whitespace-nowrap font-semibold text-gray-900 dark:text-white',
              render: (m) => (
                <>
                  {fmtDate(m.date)} <span className="text-[10px] text-gray-400">{fmtTime(m.date)}</span>
                </>
              ),
            },
            {
              key: 'type',
              header: tr('Type'),
              render: (m) =>
                m.type === 'IN' ? (
                  <StatusBadge tone="green" label={tr('Entrée')} icon={ArrowDownLeft} />
                ) : (
                  <StatusBadge tone="blue" label={tr('Sortie')} icon={ArrowUpRight} />
                ),
            },
            {
              key: 'doc',
              header: tr('N° Document'),
              render: (m) => <span className={`font-mono font-bold ${m.type === 'IN' ? 'text-jesa-light' : 'text-blue-600 dark:text-blue-400'}`}>{m.documentNumber}</span>,
            },
            {
              key: 'art',
              header: tr('Article'),
              render: (m) => (
                <>
                  <span className="font-mono text-gray-500 dark:text-gray-400">{m.article.code}</span>{' '}
                  <span className="text-gray-800 dark:text-gray-200">{m.article.designation}</span>
                </>
              ),
            },
            {
              key: 'qty',
              header: tr('Quantité'),
              render: (m) => (
                <span className={`font-bold ${m.type === 'IN' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {m.signedQuantity > 0 ? '+' : '−'}
                  {fmtInt(m.quantity)}
                </span>
              ),
            },
            {
              key: 'party',
              header: tr('Origine / Destination'),
              className: 'text-gray-700 dark:text-gray-300',
              render: (m) => (m.type === 'IN' ? m.source : m.destination) ?? '—',
            },
            { key: 'sk', header: tr('Magasinier'), className: 'text-gray-700 dark:text-gray-300', render: (m) => m.storekeeper?.name ?? '—' },
            { key: 'after', header: tr('Stock Après'), className: 'font-bold text-gray-900 dark:text-white', render: (m) => fmtInt(m.stockAfter) },
          ]}
        />
      </div>
    </div>
  );
}

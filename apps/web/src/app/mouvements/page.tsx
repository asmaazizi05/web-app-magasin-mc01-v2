import { ArrowDownLeft, ArrowUpRight, ExternalLink, FileSpreadsheet, History } from 'lucide-react';
import { StockSheetForm } from '@/components/forms/StockSheetForm';
import { Card, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api, assetUrl } from '@/lib/api';
import { fmtDate, fmtInt, fmtTime } from '@/lib/format';
import { SHIFT } from '@/lib/labels';
import type { ShiftType, StockSheet } from '@/lib/types';
import { getT } from '@/lib/i18n/server';

export default async function MouvementsPage() {
  const tr = await getT();
  const [options, articles, storekeepers, shifts, sheets] = await Promise.all([
    api.stockSheetOptions(),
    api.articles(),
    api.storekeepers(),
    api.currentShifts(),
    api.stockSheets(50),
  ]);

  const currentPosts: Record<number, ShiftType> = {};
  for (const p of shifts.posts) for (const s of p.storekeepers) currentPosts[s.id] = p.type;

  return (
    <div className="space-y-8">
      <div className="mx-auto max-w-3xl">
        <StockSheetForm options={options} articles={articles} storekeepers={storekeepers} currentPosts={currentPosts} />
      </div>

      <Card padding="lg" className="space-y-3">
        <CardTitle icon={<History className="h-4 w-4 text-jesa-light" />}>{tr('Dernières saisies (fiches E/S)')}</CardTitle>
        <DataTable<StockSheet>
          rows={sheets}
          rowKey={(s) => s.id}
          empty={tr('Aucune fiche saisie pour le moment.')}
          columns={[
            {
              key: 'date',
              header: tr('Date'),
              className: 'whitespace-nowrap font-semibold text-gray-900 dark:text-white',
              render: (s) => (
                <>
                  {fmtDate(s.date)} <span className="text-[10px] text-gray-400">{fmtTime(s.date)}</span>
                  {s.imported && (
                    <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-gray-200 px-1 py-0.5 text-[9px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400" title={tr('Importé depuis Google Sheet')}>
                      <FileSpreadsheet className="h-2.5 w-2.5" /> {tr('Import')}
                    </span>
                  )}
                </>
              ),
            },
            {
              key: 'type',
              header: tr('Type'),
              render: (s) =>
                s.type === 'IN' ? <StatusBadge tone="green" label={tr('Entrée')} icon={ArrowDownLeft} /> : <StatusBadge tone="blue" label={tr('Sortie')} icon={ArrowUpRight} />,
            },
            {
              key: 'doc',
              header: tr('N° Document'),
              render: (s) => <span className={`font-mono font-bold ${s.type === 'IN' ? 'text-jesa-light' : 'text-blue-600 dark:text-blue-400'}`}>{s.documentNumber}</span>,
            },
            {
              key: 'des',
              header: tr('Désignation / Référence'),
              render: (s) => (
                <>
                  <span className="font-mono text-gray-500 dark:text-gray-400">{s.article.code}</span>{' '}
                  <span className="text-gray-800 dark:text-gray-200">{s.article.designation}</span>
                </>
              ),
            },
            { key: 'cat', header: tr('Catégorie'), className: 'text-gray-700 dark:text-gray-300', render: (s) => tr(s.category) },
            {
              key: 'qty',
              header: tr('Quantité'),
              className: 'whitespace-nowrap font-bold text-gray-900 dark:text-white',
              render: (s) => `${fmtInt(s.quantity)} ${s.unit}`,
            },
            {
              key: 'req',
              header: tr('Demandeur'),
              className: 'text-gray-700 dark:text-gray-300',
              render: (s) => (
                <>
                  <span className="font-semibold">{s.requesterType}</span> – {s.requesterName}
                </>
              ),
            },
            {
              key: 'party',
              header: tr('Fournisseur / Destination'),
              className: 'text-gray-700 dark:text-gray-300',
              render: (s) =>
                s.type === 'IN' ? (
                  (s.supplier ?? '—')
                ) : s.destinationZone ? (
                  <>
                    <span className="font-semibold">{s.destinationZone}</span>
                    {s.destinationArea ? ` – ${s.destinationArea}` : ''}
                  </>
                ) : (
                  '—'
                ),
            },
            { key: 'sk', header: tr('Magasinier'), className: 'text-gray-700 dark:text-gray-300', render: (s) => s.storekeeper.name },
            { key: 'post', header: tr('Poste'), render: (s) => <StatusBadge tone={SHIFT[s.post].tone} label={tr(SHIFT[s.post].rotationLabel)} shape="tag" weight="semibold" /> },
            {
              key: 'photos',
              header: tr('Photos'),
              render: (s) => (
                <div className="flex gap-1">
                  {s.photos.map((p) =>
                    p.external ? (
                      // Lien Google Drive : fichier privé, non intégrable en image
                      <a
                        key={p.id}
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-gray-200 px-1.5 py-1 text-[10px] font-semibold text-jesa-light hover:border-jesa dark:border-gray-700"
                      >
                        <ExternalLink className="h-3 w-3" /> {tr('Drive')}
                      </a>
                    ) : (
                      <a key={p.id} href={assetUrl(p.url)} target="_blank" rel="noreferrer" title={p.originalName}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={assetUrl(p.url)} alt={p.originalName} className="h-9 w-9 rounded-md border border-gray-200 object-cover dark:border-gray-700" />
                      </a>
                    ),
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

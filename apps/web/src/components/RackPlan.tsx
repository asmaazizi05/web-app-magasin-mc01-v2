'use client';

import { useState } from 'react';
import type { Rack } from '@/lib/types';
import type { RackStatus } from '@/lib/types';
import { fmtInt } from '@/lib/format';
import { useT } from '@/lib/i18n';

const RACK_BORDER: Record<RackStatus, string> = {
  CRITIQUE: 'border-red-500',
  LIMITE: 'border-amber-500',
  CONFORME: 'border-green-500',
  VIDE: 'border-gray-400 dark:border-gray-600',
};

const RACK_TITLE: Record<RackStatus, string> = {
  CRITIQUE: 'text-red-600 dark:text-red-400',
  LIMITE: 'text-amber-600 dark:text-amber-400',
  CONFORME: 'text-green-600 dark:text-green-400',
  VIDE: 'text-gray-500 dark:text-gray-400',
};

const CHIP = {
  CRITIQUE: 'bg-red-200 dark:bg-red-600/50 text-red-900 dark:text-red-200 font-bold',
  LIMITE: 'bg-amber-100 dark:bg-amber-600/30 text-amber-800 dark:text-amber-200',
  CONFORME: 'bg-green-100 dark:bg-green-600/30 text-green-800 dark:text-green-200',
} as const;

const DETAIL_BADGE: Record<RackStatus, { label: string; className: string }> = {
  CRITIQUE: { label: 'Alerte Stock Critique', className: 'bg-red-600' },
  LIMITE: { label: 'Limite Approche', className: 'bg-amber-500' },
  CONFORME: { label: 'Statut: Conforme', className: 'bg-jesa' },
  VIDE: { label: 'Rayonnage vide', className: 'bg-gray-500' },
};

function RackDetails({ rack }: { rack: Rack }) {
  const tr = useT();
  const levels = Array.from({ length: rack.levels }, (_, i) => rack.levels - i);
  const badge = DETAIL_BADGE[rack.status];
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-300 pb-2 dark:border-gray-700/80">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
          {tr('Contenu détaillé du Rayonnage : Allée')} {rack.aisle} {tr('- Rack')} {rack.code}
        </h4>
        <span className={`rounded px-2 py-0.5 text-[10px] font-bold text-white ${badge.className}`}>{tr(badge.label)}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 pt-1 text-[11px] sm:grid-cols-3">
        {levels.map((level) => {
          const items = rack.articles.filter((a) => a.rackLevel === level);
          const critical = items.some((a) => a.alertStatus === 'CRITIQUE');
          return (
            <div
              key={level}
              className={`rounded-lg border p-2 ${
                critical
                  ? 'border-red-500 bg-red-100 font-bold text-red-900 dark:bg-red-900/40 dark:text-red-200'
                  : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-navy-light'
              }`}
            >
              <strong>{tr('Niveau')} {level} :</strong>{' '}
              {items.length === 0
                ? tr('Emplacement libre')
                : items
                    .map((a) =>
                      a.alertStatus === 'CRITIQUE'
                        ? tr('{0} ({1} pcs - MIN: {2})', a.designation, fmtInt(a.currentStock), fmtInt(a.minStock))
                        : tr('{0} ({1} pcs)', a.designation, fmtInt(a.currentStock)),
                    )
                    .join(' · ')}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-500 dark:text-gray-400">
        {tr('Saturation :')} {fmtInt(rack.units)} / {fmtInt(rack.capacity)} {tr('unités (')}{rack.saturationPct}%)
      </p>
    </>
  );
}

/** Plan 2D du hangar : 6 rayonnages cliquables entre la zone de manœuvre et l'entrée principale. */
export function RackPlan({ racks }: { racks: Rack[] }) {
  const tr = useT();
  const [selected, setSelected] = useState<Rack | null>(null);

  return (
    <>
      <div className="custom-scrollbar relative min-h-[460px] overflow-x-auto rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-navy-dark">
        <div className="w-full min-w-[680px] space-y-6 rounded-lg border-4 border-gray-400 bg-gray-100 p-4 dark:border-gray-600 dark:bg-navy">
          <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3 text-[10px] text-gray-600 dark:border-gray-700 dark:bg-navy-light/80 dark:text-gray-300">
            <span>{tr('ZONE MANŒUVRE NORD (Passage Chariot 200cm)')}</span>
            <span className="rounded border border-amber-300 bg-amber-100 px-2 py-0.5 text-amber-800 dark:border-amber-500/50 dark:bg-amber-500/20 dark:text-amber-300">
              {tr('Chariot Élévateur 85x200')}
            </span>
          </div>

          <div className="stagger grid gap-2.5 text-center" style={{ gridTemplateColumns: `repeat(${Math.max(racks.length, 1)}, minmax(0, 1fr))` }}>
            {racks.map((rack) => (
              <button
                key={rack.id}
                onClick={() => setSelected(rack)}
                className={`flex h-52 flex-col justify-between rounded border-2 bg-white p-2 transition hover:border-gray-900 dark:bg-navy-light dark:hover:border-white ${RACK_BORDER[rack.status]} ${
                  selected?.id === rack.id ? 'ring-2 ring-jesa-light' : ''
                }`}
              >
                <span className={`text-[10px] font-bold ${RACK_TITLE[rack.status]}`}>
                  {tr('RACK')} {rack.code}
                  {rack.status === 'CRITIQUE' ? tr(' (ALERTE)') : ''}
                </span>
                <div className="space-y-1">
                  {rack.articles.length === 0 && <div className="rounded p-1 text-[9px] text-gray-400">{tr('Vide')}</div>}
                  {rack.articles.map((a) => (
                    <div key={a.id} className={`rounded p-1 text-[9px] ${CHIP[a.alertStatus]}`}>
                      {a.designation}
                      {a.alertStatus === 'CRITIQUE' ? ` (${a.currentStock})` : ''}
                    </div>
                  ))}
                </div>
                <span className="text-[9px] text-gray-500 dark:text-gray-400">{rack.aisleLabel}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3 text-[10px] text-gray-600 dark:border-gray-700 dark:bg-navy-light/80 dark:text-gray-300">
            <span className="font-bold text-gray-900 dark:text-white">{tr('ENTRÉE PRINCIPALE MAGASIN (Largeur 648.5cm)')}</span>
            <span>{tr('Dégagement Réception : 519cm x 625cm')}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-100 p-4 text-xs dark:border-gray-800 dark:bg-navy-dark">
        {selected ? (
          <RackDetails rack={selected} />
        ) : (
          <p className="font-bold text-jesa-light">{tr('Cliquez sur un Rayonnage (R1 à R')}{racks.length}{tr(') dans le plan ci-dessus pour afficher la liste des pièces stockées.')}</p>
        )}
      </div>
    </>
  );
}

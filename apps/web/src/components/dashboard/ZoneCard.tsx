import type { Tone } from '@/lib/labels';
import { fmtDH, fmtPct, fmtUnits } from '@/lib/format';
import type { Zone } from '@/lib/types';
import { BADGE_TONE, BAR_TONE, TEXT_TONE } from '../ui/tones';
import { useT } from '@/lib/i18n';

/** Couleur d'accent par position de zone (ordre de la maquette) */
export const ZONE_TONE: Tone[] = ['jesa', 'green', 'amber', 'purple', 'gray'];

export function ZoneCard({ zone, tone }: { zone: Zone; tone: Tone }) {
  const tr = useT();
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-navy-light">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">{zone.category}</span>
          <h4 className="mt-0.5 text-xs font-extrabold text-gray-900 dark:text-white">{zone.description}</h4>
        </div>
        <span className={`whitespace-nowrap rounded-lg px-2 py-0.5 text-[10px] font-bold ${BADGE_TONE[tone]}`}>
          {fmtPct(zone.occupancyPct)} {tr('Occupé')}
        </span>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between text-gray-600 dark:text-gray-300">
          <span>{tr('Articles Stockés :')}</span>
          <strong className="text-gray-900 dark:text-white">{fmtUnits(zone.units)}</strong>
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-300">
          <span>{tr('Reste à Stocker :')}</span>
          <strong className={TEXT_TONE[tone]}>{fmtUnits(zone.remaining)}</strong>
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-300">
          <span>{tr('Valorisation :')}</span>
          <strong className="text-gray-900 dark:text-white">{fmtDH(zone.valuation)}</strong>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div className={`h-full origin-left animate-bar rounded-full ${BAR_TONE[tone]}`} style={{ width: `${Math.min(zone.occupancyPct, 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

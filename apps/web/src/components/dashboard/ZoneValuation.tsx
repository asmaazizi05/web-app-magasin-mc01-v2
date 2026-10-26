import type { Tone } from '@/lib/labels';
import { fmtDH, fmtPct } from '@/lib/format';
import type { Zone } from '@/lib/types';
import { BAR_TONE } from '../ui/tones';

export function ZoneValuation({ zones, tones }: { zones: Zone[]; tones: Map<number, Tone> }) {
  const total = zones.reduce((s, z) => s + z.valuation, 0);
  const max = Math.max(...zones.map((z) => z.valuation), 1);
  const sorted = [...zones].sort((a, b) => b.valuation - a.valuation);
  return (
    <div className="space-y-2.5">
      {sorted.map((z) => (
        <div key={z.id} className="space-y-1" title={`${z.name} : ${fmtDH(z.valuation)}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-700 dark:text-gray-300">{z.name}</span>
            <span className="font-bold text-gray-900 dark:text-white">
              {fmtDH(z.valuation)} <span className="font-normal text-gray-500 dark:text-gray-400">({fmtPct(total ? (z.valuation / total) * 100 : 0)})</span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div className={`h-full origin-left animate-bar rounded-full ${BAR_TONE[tones.get(z.id) ?? 'gray']}`} style={{ width: `${(z.valuation / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

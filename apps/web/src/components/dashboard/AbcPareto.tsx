import { fmtDH, fmtPct } from '@/lib/format';
import type { AbcClass, AbcSlice } from '@/lib/types';
import { useT } from '@/lib/i18n';

const CLASS_COLOR: Record<AbcClass, string> = { A: 'bg-jesa', B: 'bg-blue-500', C: 'bg-slate-500' };
const CLASS_HINT: Record<AbcClass, string> = {
  A: 'Forte valeur – suivi rapproché',
  B: 'Valeur intermédiaire',
  C: 'Faible valeur – gestion simplifiée',
};

/** Pareto ABC : part de valorisation par classe et cumul (une seule échelle 0–100 %). */
export function AbcPareto({ slices }: { slices: AbcSlice[] }) {
  const tr = useT();
  return (
    <div className="space-y-3">
      {slices.map((s) => (
        <div key={s.abcClass} className="space-y-1" title={tr('Classe {0} : {1} – cumul {2}', s.abcClass, fmtDH(s.value), fmtPct(s.cumulativeSharePct))}>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <span className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-extrabold text-white ${CLASS_COLOR[s.abcClass]}`}>{s.abcClass}</span>
              <span className="text-gray-600 dark:text-gray-300">
                {s.articleCount} {tr('réf. ·')} {tr(CLASS_HINT[s.abcClass])}
              </span>
            </span>
            <strong className="text-gray-900 dark:text-white">{fmtPct(s.valueSharePct)}</strong>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="absolute inset-y-0 left-0 origin-left animate-bar rounded-full bg-gray-400/40 dark:bg-white/10" style={{ width: `${s.cumulativeSharePct}%` }} />
            <div
              className={`absolute inset-y-0 rounded-full ${CLASS_COLOR[s.abcClass]}`}
              style={{ left: `${s.cumulativeSharePct - s.valueSharePct}%`, width: `${s.valueSharePct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
            <span>{fmtDH(s.value)}</span>
            <span>{tr('Cumul :')} {fmtPct(s.cumulativeSharePct)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

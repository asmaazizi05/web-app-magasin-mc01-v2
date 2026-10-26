import { CATEGORY_COLOR, CATEGORY_LABEL } from '@/lib/labels';
import { fmtInt, fmtPct } from '@/lib/format';
import type { CategoryFlow } from '@/lib/types';
import { useT } from '@/lib/i18n';
import { useId } from 'react';

const R = 60;
const STROKE = 26;
const C = 2 * Math.PI * R;
/** Espace de 2px entre segments (couleur de surface) */
const GAP = 2;

export function CategoryDonut({ flows, unitLabel }: { flows: CategoryFlow[]; unitLabel: string }) {
  const tr = useT();
  const maskId = useId();
  const total = flows.reduce((s, f) => s + f.quantity, 0);
  if (total === 0) {
    return <p className="flex h-60 items-center justify-center text-xs text-gray-500 dark:text-gray-400">{tr('Aucun mouvement enregistré.')}</p>;
  }

  let offset = 0;
  const arcs = flows.map((f) => {
    const len = (f.quantity / total) * C;
    const arc = { ...f, dash: Math.max(len - (flows.length > 1 ? GAP : 0), 0.5), offset };
    offset += len;
    return arc;
  });

  return (
    <div className="flex h-60 flex-col items-center justify-center gap-5 sm:flex-row">
      <svg viewBox="0 0 160 160" className="h-44 w-44 flex-shrink-0 -rotate-90" role="img" aria-label={tr('Répartition par catégorie, total {0} {1}', total, unitLabel)}>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <circle cx="80" cy="80" r={R} fill="none" stroke="white" strokeWidth={STROKE + 2} className="donut-draw" />
        </mask>
        <g mask={`url(#${maskId})`}>
        {arcs.map((a) => (
          <circle
            key={a.category}
            cx="80"
            cy="80"
            r={R}
            fill="none"
            stroke={CATEGORY_COLOR[a.category]}
            strokeWidth={STROKE}
            strokeDasharray={`${a.dash} ${C - a.dash}`}
            strokeDashoffset={-a.offset}
            className="transition-opacity hover:opacity-80"
          >
            <title>{`${tr(CATEGORY_LABEL[a.category])} : ${fmtInt(a.quantity)} ${unitLabel} (${fmtPct((a.quantity / total) * 100)})`}</title>
          </circle>
        ))}
        </g>
        <text x="80" y="80" textAnchor="middle" dominantBaseline="central" transform="rotate(90 80 80)" className="fill-gray-900 text-[18px] font-extrabold dark:fill-white">
          {fmtInt(total)}
        </text>
      </svg>
      <ul className="space-y-1.5 text-[11px]">
        {flows.map((f) => (
          <li key={f.category} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-sm" style={{ backgroundColor: CATEGORY_COLOR[f.category] }} />
            <span className="text-gray-700 dark:text-gray-300">{tr(CATEGORY_LABEL[f.category])}</span>
            <span className="ml-auto pl-3 font-bold text-gray-900 dark:text-white">{fmtPct((f.quantity / total) * 100, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

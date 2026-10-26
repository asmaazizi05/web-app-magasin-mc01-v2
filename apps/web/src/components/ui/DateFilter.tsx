'use client';

import { CalendarDays, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLang, useT } from '@/lib/i18n';

interface DateFilterProps {
  /** Page à filtrer, ex. « /receptions » */
  basePath: string;
  /** Autres filtres de la page à conserver (ex. recherche) */
  params?: Record<string, string | undefined>;
  /** Années présentes dans les données */
  years: number[];
  year?: string;
  /** « 1 » à « 12 » */
  month?: string;
  /** « YYYY-MM-DD » */
  date?: string;
}

const inputClass =
  'rounded-xl border border-gray-300 bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-900 outline-none focus:ring-2 focus:ring-jesa dark:border-gray-700 dark:bg-navy-dark dark:text-white dark:[color-scheme:dark]';

/** Filtre de période d'une liste : par année, par mois ou par date précise (la date précise l'emporte) */
export function DateFilter({ basePath, params, years, year, month, date }: DateFilterProps) {
  const tr = useT();
  const lang = useLang();
  const router = useRouter();

  const apply = (next: { year?: string; month?: string; date?: string }) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...next })) if (v) sp.set(k, v);
    const s = sp.toString();
    router.replace(s ? `${basePath}?${s}` : basePath, { scroll: false });
  };

  const monthName = (m: number) => {
    const s = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'fr-FR', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, m - 1, 1)));
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const active = !!(year || month || date);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300">
        <CalendarDays className="h-3.5 w-3.5 text-jesa-light" /> {tr('Période :')}
      </span>
      <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
        {tr('Année')}
        <select value={date ? '' : (year ?? '')} onChange={(e) => apply({ year: e.target.value, month: e.target.value ? month : undefined })} className={inputClass}>
          <option value="">{tr('Toutes')}</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
        {tr('Mois')}
        <select value={date ? '' : (month ?? '')} onChange={(e) => apply({ year, month: e.target.value })} className={inputClass}>
          <option value="">{tr('Tous')}</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {monthName(m)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
        {tr('Date précise')}
        <input type="date" value={date ?? ''} onChange={(e) => apply(e.target.value ? { date: e.target.value } : { year, month })} className={inputClass} />
      </label>
      {active && (
        <button onClick={() => apply({})} className="flex items-center gap-1 rounded-lg bg-jesa-light/15 px-2 py-1 font-semibold text-jesa-light hover:bg-jesa-light/25">
          <X className="h-3 w-3" /> {tr('Effacer la période')}
        </button>
      )}
    </div>
  );
}

import type { LucideIcon } from 'lucide-react';
import type { Tone } from '@/lib/labels';
import { CountUp } from './CountUp';
import { BAR_TONE, TEXT_TONE } from './tones';

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone: Tone;
  /** Jauge optionnelle 0–100 */
  gauge?: number;
}

export function KpiCard({ label, value, hint, icon: Icon, tone, gauge }: KpiCardProps) {
  return (
    <div className="lift space-y-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-navy-light">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">{label}</span>
        <Icon className={`h-4 w-4 ${TEXT_TONE[tone]}`} />
      </div>
      <p className={`text-2xl font-extrabold tracking-tight ${TEXT_TONE[tone]}`}><CountUp value={value} /></p>
      {gauge !== undefined && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div className={`h-full origin-left animate-bar rounded-full ${BAR_TONE[tone]}`} style={{ width: `${Math.min(Math.max(gauge, 0), 100)}%` }} />
        </div>
      )}
      {hint && <p className="text-[10px] text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

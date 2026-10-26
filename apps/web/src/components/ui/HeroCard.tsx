import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { CountUp } from './CountUp';

interface HeroCardProps {
  label: string;
  value: string;
  unit: string;
  footer: ReactNode;
  footerIcon: LucideIcon;
  watermark: LucideIcon;
  variant: 'navy' | 'jesa';
}

export function HeroCard({ label, value, unit, footer, footerIcon: FooterIcon, watermark: Watermark, variant }: HeroCardProps) {
  const jesa = variant === 'jesa';
  return (
    <div
      className={`lift relative isolate flex items-center justify-between overflow-hidden rounded-2xl p-6 shadow-lg transition-colors ${
        jesa ? 'bg-jesa text-white' : 'border border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-navy-light dark:text-white'
      }`}
    >
      <div className="z-10 space-y-2">
        <p className={`text-[11px] font-semibold uppercase tracking-wider ${jesa ? 'text-blue-100' : 'text-blue-600 dark:text-blue-200'}`}>{label}</p>
        <h3 className="text-3xl font-extrabold tracking-tight">
          <CountUp value={value} /> <span className={`text-lg font-normal ${jesa ? 'text-gray-100' : 'text-gray-500 dark:text-gray-300'}`}>{unit}</span>
        </h3>
        <p className={`flex items-center gap-1 pt-1 text-xs ${jesa ? 'text-blue-100' : 'text-blue-600 dark:text-blue-200'}`}>
          <FooterIcon className={`h-3.5 w-3.5 ${jesa ? '' : 'text-jesa-light'}`} /> {footer}
        </p>
      </div>
      <div className={`z-0 ${jesa ? 'text-white/10' : 'text-blue-500/10 dark:text-blue-400/10'}`}>
        <Watermark className="h-28 w-28" />
      </div>
    </div>
  );
}

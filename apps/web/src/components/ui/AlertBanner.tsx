import { AlertTriangle, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface AlertBannerProps {
  title: string;
  badge: string;
  children: ReactNode;
  actionLabel: string;
  actionHref: string;
}

export function AlertBanner({ title, badge, children, actionLabel, actionHref }: AlertBannerProps) {
  return (
    <div className="alert-halo flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-red-500/80 bg-red-100 p-4 shadow-lg dark:bg-red-900/30">
      <div className="flex items-center gap-3.5">
        <div className="rounded-xl border border-red-500/40 bg-red-500/20 p-2.5 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-6 w-6 animate-pulse" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-red-900 dark:text-red-200">{title}</h4>
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">{badge}</span>
          </div>
          <div className="mt-0.5 text-xs text-gray-700 dark:text-gray-300">{children}</div>
        </div>
      </div>
      <Link
        href={actionHref}
        className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow transition hover:bg-red-500"
      >
        <ShoppingCart className="h-3.5 w-3.5" /> {actionLabel}
      </Link>
    </div>
  );
}

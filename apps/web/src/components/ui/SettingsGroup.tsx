import { ChevronDown, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface SettingsGroupProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Résumé affiché à droite quand la rubrique est repliée (ex. « 4 réglages ») */
  badge?: string;
  /** Rubrique ouverte à l'arrivée sur la page */
  open?: boolean;
  children: ReactNode;
}

/** Rubrique repliable de la page Paramètres (toutes de la même largeur) : un clic sur l'en-tête la développe */
export function SettingsGroup({ icon: Icon, title, description, badge, open, children }: SettingsGroupProps) {
  return (
    <details
      open={open}
      className={`settings-group group rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors open:border-jesa-light/50 dark:border-gray-800 dark:bg-navy-light`}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl p-4 transition hover:bg-gray-50 dark:hover:bg-navy-dark/40 [&::-webkit-details-marker]:hidden">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-jesa-light/15 text-jesa-light">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-gray-900 dark:text-white">{title}</span>
          <span className="block text-[11px] text-gray-500 dark:text-gray-400">{description}</span>
        </span>
        {badge && <span className="hidden rounded-lg bg-jesa-light/15 px-2 py-1 text-[10px] font-bold text-jesa-light sm:inline">{badge}</span>}
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-gray-200 p-5 dark:border-gray-800">{children}</div>
    </details>
  );
}

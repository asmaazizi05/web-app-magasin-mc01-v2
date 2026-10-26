import type { ReactNode } from 'react';
import { EditOnly } from '../layout/ProfileContext';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {/* Boutons d'ajout / de création : masqués en consultation seule */}
      {actions && <EditOnly>{actions}</EditOnly>}
    </div>
  );
}

export function SectionTitle({ icon, children, action }: { icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {icon}
        {children}
      </p>
      {action}
    </div>
  );
}

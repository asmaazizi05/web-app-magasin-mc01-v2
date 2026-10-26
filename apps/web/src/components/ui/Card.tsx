import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  const pad = { sm: 'p-3', md: 'p-4', lg: 'p-5' }[padding];
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-navy-light ${pad} ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ icon, children, aside }: { icon?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
        {icon}
        {children}
      </h3>
      {aside}
    </div>
  );
}

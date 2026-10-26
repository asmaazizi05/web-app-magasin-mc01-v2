import type { ReactNode } from 'react';
import { useT } from '@/lib/i18n';

export const inputClass =
  'w-full rounded-xl border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs text-gray-900 outline-none transition focus:ring-2 focus:ring-jesa dark:border-gray-700/60 dark:bg-navy-dark dark:text-white';

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1 text-xs ${className}`}>
      <span className="font-semibold text-gray-700 dark:text-gray-300">{label}</span>
      {children}
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  const tr = useT();
  if (!message) return null;
  return <p key={message} className="shake rounded-lg border border-red-500/50 bg-red-100 p-2 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-200">{tr(message)}</p>;
}

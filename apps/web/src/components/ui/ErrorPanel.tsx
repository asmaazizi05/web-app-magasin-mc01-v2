import { ServerCrash } from 'lucide-react';
import { useT } from '@/lib/i18n';

export function ErrorPanel({ message }: { message: string }) {
  const tr = useT();
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-500/60 bg-red-100 p-5 text-xs text-red-900 dark:bg-red-900/30 dark:text-red-200">
      <ServerCrash className="h-5 w-5 flex-shrink-0" />
      <div className="space-y-1">
        <p className="text-sm font-bold">{tr('Données indisponibles')}</p>
        <p>{tr(message)}</p>
      </div>
    </div>
  );
}

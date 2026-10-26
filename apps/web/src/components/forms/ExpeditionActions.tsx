'use client';

import { Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Expedition, ExpeditionStatus } from '@/lib/types';
import { useSubmit } from './useSubmit';
import { useT } from '@/lib/i18n';

export function ExpeditionActions({ expedition }: { expedition: Expedition }) {
  const tr = useT();
  const { pending, error, run } = useSubmit(() => undefined);
  if (expedition.status === 'LIVRE' || expedition.status === 'ANNULE') return null;
  const set = (status: ExpeditionStatus) => void run(() => api.updateExpeditionStatus(expedition.id, status));

  return (
    <div className="flex items-center gap-1" title={error ?? undefined}>
      <button
        disabled={pending}
        onClick={() => set('LIVRE')}
        className="flex items-center gap-1 rounded-lg bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-green-500 disabled:opacity-60"
      >
        <Check className="h-3 w-3" /> {tr('Servi')}
      </button>
      <button
        disabled={pending}
        onClick={() => set('ANNULE')}
        className="flex items-center gap-1 rounded-lg bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-800 hover:bg-gray-300 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <X className="h-3 w-3" /> {tr('Annuler')}
      </button>
      {error && <span className="text-[10px] text-red-500">{tr(error)}</span>}
    </div>
  );
}

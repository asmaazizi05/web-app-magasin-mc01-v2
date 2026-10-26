import { Clock, Coffee, Moon } from 'lucide-react';
import { SHIFT } from '@/lib/labels';
import type { ShiftType, Storekeeper } from '@/lib/types';
import { BAR_TONE, BORDER_TONE, TEXT_TONE } from '../ui/tones';
import { useT } from '@/lib/i18n';

export type ShiftState = 'active' | 'next' | 'rest' | 'off';

const PILL: Record<ShiftType, string> = {
  MATIN: 'bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-300',
  APRES_MIDI: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300',
  NUIT: 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300',
  OFF: 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  CONGE: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300',
  FORMATION: 'bg-jesa/20 text-jesa-light',
  ABSENT: 'bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-300',
};

interface ShiftCardProps {
  type: ShiftType;
  storekeepers: Storekeeper[];
  state: ShiftState;
}

export function ShiftCard({ type, storekeepers, state }: ShiftCardProps) {
  const tr = useT();
  const meta = SHIFT[type];
  const tone = TEXT_TONE[meta.tone];
  const lead = storekeepers[0];
  const startLabel = meta.hours.split(' - ')[0]?.replace(':', 'h');

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-white p-4 shadow-sm dark:bg-navy-light ${BORDER_TONE[meta.tone]}`}>
      <div className={`absolute left-0 top-0 h-full w-1.5 ${BAR_TONE[meta.tone]}`} />
      <div className="space-y-1.5 pl-2">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[11px] font-bold ${tone}`}>{tr(meta.cardLabel)}</span>
          <span className={`rounded px-1.5 py-0.5 font-mono text-[9px] ${PILL[type]}`}>{meta.hours}</span>
        </div>
        {storekeepers.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">{tr('Aucun magasinier affecté')}</p>
        ) : (
          storekeepers.map((s) => (
            <div key={s.id}>
              <p className="text-xs font-bold text-gray-900 dark:text-white">
                {s.name} <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">({tr(s.role)})</span>
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{tr('Spécialité :')} {s.specialty}</p>
            </div>
          ))
        )}
        <div className={`flex items-center gap-1 pt-1 text-[10px] font-semibold ${state === 'off' ? 'text-gray-500 dark:text-gray-400' : tone}`}>
          {state === 'active' && (
            <>
              <span className={`h-2 w-2 animate-ping rounded-full ${BAR_TONE[meta.tone]}`} /> {tr('En Service Actif')}{lead ? ` (${lead.specialty})` : ''}
            </>
          )}
          {state === 'next' && (
            <>
              <Clock className="h-3 w-3" /> {tr('Prochain Shift (À venir)')}
            </>
          )}
          {state === 'rest' && (
            <>
              <Moon className="h-3 w-3" /> {tr('En Repos (Début')} {startLabel})
            </>
          )}
          {state === 'off' && (
            <>
              <Coffee className="h-3 w-3" /> {tr('Journée Admin / OFF')}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { CalendarPlus, Eraser, Lock, LockOpen, Pin, PinOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { fmtDay, fmtDayShort } from '@/lib/format';
import { SHIFT, SHIFT_CHOICES } from '@/lib/labels';
import type { PlanningCell, PlanningView, PlanningWeek, ShiftType, Storekeeper } from '@/lib/types';
import { FormError, inputClass } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { BADGE_TONE } from '../ui/tones';
import { useT } from '@/lib/i18n';

type CellTarget = { storekeeper: Storekeeper; week: PlanningWeek; cell: PlanningCell | null };

/** Postes de travail dont la couverture est contrôlée (au moins une personne par semaine) */
const COVERED: ShiftType[] = ['MATIN', 'APRES_MIDI', 'NUIT'];
const SHORT: Record<ShiftType, string> = {
  MATIN: 'M',
  APRES_MIDI: 'AM',
  NUIT: 'N',
  OFF: 'Nor.',
  CONGE: 'Congé',
  FORMATION: 'Form.',
  ABSENT: 'Abs.',
};

function useAction() {
  const tr = useT();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<unknown>, onDone?: () => void) => {
    setPending(true);
    setError(null);
    try {
      await action();
      onDone?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('Erreur inattendue.'));
    } finally {
      setPending(false);
    }
  };
  return { pending, error, setError, run };
}

export function PlanningBoard({ planning, defaultExtendWeeks = 4 }: { planning: PlanningView; defaultExtendWeeks?: number }) {
  const tr = useT();
  const [target, setTarget] = useState<CellTarget | null>(null);
  const [fixing, setFixing] = useState<Storekeeper | null>(null);
  const [extending, setExtending] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {SHIFT_CHOICES.map((t) => (
            <span key={t} className={`rounded px-1.5 py-0.5 font-semibold ${BADGE_TONE[SHIFT[t].tone]}`}>
              {tr(SHIFT[t].rotationLabel)}
            </span>
          ))}
          <span className="flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 font-semibold text-gray-700 dark:bg-navy-dark dark:text-gray-300">
            <Lock className="h-3 w-3" /> {tr('Semaine verrouillée')}
          </span>
          <span className="flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 font-semibold text-gray-700 dark:bg-navy-dark dark:text-gray-300">
            <Pin className="h-3 w-3" /> {tr('Poste fixe')}
          </span>
        </div>
        <button
          onClick={() => setExtending(true)}
          className="flex items-center gap-1.5 rounded-xl bg-jesa px-3 py-1.5 text-xs font-bold text-white shadow transition hover:bg-jesa-dark"
        >
          <CalendarPlus className="h-4 w-4" /> {tr('Prolonger la rotation')}
        </button>
      </div>

      <div className="custom-scrollbar overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-gray-100 font-semibold uppercase text-gray-600 dark:bg-navy-dark dark:text-gray-400">
            <tr>
              <th className="p-3">{tr('Magasinier')}</th>
              {planning.weeks.map((w) => (
                <th key={w.weekStart} className={`p-3 text-center ${w.isCurrent ? 'bg-jesa/15 text-jesa-light' : ''}`}>
                  <div>{tr('Semaine')} {w.isoWeek}</div>
                  <div className="text-[10px] font-normal normal-case text-gray-500 dark:text-gray-400">
                    {fmtDayShort(w.weekStart)} → {fmtDayShort(w.weekEnd)}
                    {w.isCurrent ? tr(' · actuelle') : ''}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {planning.rows.map(({ storekeeper: sk, cells }) => (
              <tr key={sk.id}>
                <td className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <Link href={`/shifts/magasiniers/${sk.id}`} className="font-bold text-gray-900 hover:text-jesa-light hover:underline dark:text-white">
                        {sk.name}
                      </Link>
                      <div className="font-mono text-[10px] text-gray-500 dark:text-gray-400">{sk.matricule}</div>
                    </div>
                    <button
                      onClick={() => setFixing(sk)}
                      title={sk.fixedPost ? tr('Poste fixe : {0}', SHIFT[sk.fixedPost].rotationLabel) : tr('Fixer un poste')}
                      className={`flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-semibold transition ${
                        sk.fixedPost ? BADGE_TONE[SHIFT[sk.fixedPost].tone] : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-dark'
                      }`}
                    >
                      <Pin className="h-3 w-3" />
                      {sk.fixedPost ? SHORT[sk.fixedPost] : ''}
                    </button>
                  </div>
                </td>
                {planning.weeks.map((w) => {
                  const cell = cells[w.weekStart];
                  return (
                    <td key={w.weekStart} className={`p-1.5 text-center ${w.isCurrent ? 'bg-jesa/5' : ''}`}>
                      <button
                        onClick={() => setTarget({ storekeeper: sk, week: w, cell })}
                        className={`flex w-full items-center justify-center gap-1 rounded-lg px-2 py-2 font-semibold transition hover:ring-2 hover:ring-jesa ${
                          cell ? BADGE_TONE[SHIFT[cell.type].tone] : 'border border-dashed border-gray-300 text-gray-400 dark:border-gray-700'
                        }`}
                        aria-label={tr('{0}, semaine {1}', sk.name, w.isoWeek)}
                      >
                        {cell ? tr(SHIFT[cell.type].rotationLabel) : '+'}
                        {cell?.locked && <Lock className="h-3 w-3 flex-shrink-0" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 text-[10px] dark:bg-navy-dark">
            <tr>
              <td className="p-3 font-bold uppercase text-gray-500 dark:text-gray-400">{tr('Couverture')}</td>
              {planning.weeks.map((w) => {
                const c = planning.coverage[w.weekStart] ?? {};
                return (
                  <td key={w.weekStart} className="p-2 text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {COVERED.map((t) => (
                        <span
                          key={t}
                          title={tr('{0} : {1} magasinier(s)', tr(SHIFT[t].rotationLabel), c[t] ?? 0)}
                          className={`rounded px-1 font-bold ${(c[t] ?? 0) === 0 ? 'bg-red-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}
                        >
                          {SHORT[t]} {c[t] ?? 0}
                        </span>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {target && <CellEditor target={target} onClose={() => setTarget(null)} />}
      {fixing && <FixedPostEditor storekeeper={fixing} onClose={() => setFixing(null)} />}
      {extending && <ExtendRotation lastPlannedWeek={planning.lastPlannedWeek} defaultWeeks={defaultExtendWeeks} onClose={() => setExtending(false)} />}
    </>
  );
}

function CellEditor({ target, onClose }: { target: CellTarget; onClose: () => void }) {
  const tr = useT();
  const { storekeeper: sk, week, cell } = target;
  const { pending, error, run } = useAction();
  const locked = cell?.locked ?? false;
  const set = (body: { type?: ShiftType | null; locked?: boolean }) =>
    run(() => api.setShift({ storekeeperId: sk.id, weekStart: week.weekStart, ...body }), onClose);

  return (
    <Modal open title={tr('{0} — Semaine {1} ({2} → {3})', sk.name, week.isoWeek, fmtDay(week.weekStart), fmtDay(week.weekEnd))} onClose={onClose}>
      <div className="space-y-4">
        {locked ? (
          <p className="flex items-center gap-2 rounded-lg bg-gray-100 p-3 text-xs text-gray-700 dark:bg-navy-dark dark:text-gray-300">
            <Lock className="h-4 w-4" /> {tr('Semaine verrouillée sur')} <strong>{cell ? tr(SHIFT[cell.type].rotationLabel) : ''}</strong>{tr('. Déverrouillez-la pour la modifier.')}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {SHIFT_CHOICES.map((t) => (
              <button
                key={t}
                disabled={pending}
                onClick={() => set({ type: t })}
                className={`rounded-xl px-3 py-2 text-left text-xs font-semibold transition hover:ring-2 hover:ring-jesa disabled:opacity-50 ${BADGE_TONE[SHIFT[t].tone]} ${
                  cell?.type === t ? 'ring-2 ring-jesa' : ''
                }`}
              >
                {tr(SHIFT[t].rotationLabel)}
                {SHIFT[t].hours !== '—' && <span className="block text-[10px] font-normal opacity-80">{SHIFT[t].hours}</span>}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
          {cell && (
            <button
              disabled={pending}
              onClick={() => set({ locked: !locked })}
              className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-50 dark:bg-navy-dark dark:text-gray-200"
            >
              {locked ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {locked ? tr('Déverrouiller la semaine') : tr('Verrouiller la semaine')}
            </button>
          )}
          {cell && !locked && (
            <button
              disabled={pending}
              onClick={() => set({ type: null })}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
            >
              <Eraser className="h-3.5 w-3.5" /> {tr('Effacer')}
            </button>
          )}
        </div>
        <FormError message={error} />
      </div>
    </Modal>
  );
}

function FixedPostEditor({ storekeeper: sk, onClose }: { storekeeper: Storekeeper; onClose: () => void }) {
  const tr = useT();
  const { pending, error, run } = useAction();
  const save = (fixedPost: ShiftType | null) => run(() => api.updateStorekeeper(sk.id, { fixedPost }), onClose);
  return (
    <Modal open title={tr('Poste fixe — {0}', sk.name)} onClose={onClose}>
      <div className="space-y-3 text-xs">
        <p className="text-gray-600 dark:text-gray-400">
          {tr('Un magasinier « fixé » ne tourne plus : son poste est appliqué à toutes les semaines déjà planifiées à partir de cette semaine (sauf les semaines verrouillées) et aux prochaines prolongations de la rotation. Les congés ou formations restent modifiables case par case.')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(['MATIN', 'APRES_MIDI', 'NUIT', 'OFF'] as ShiftType[]).map((t) => (
            <button
              key={t}
              disabled={pending}
              onClick={() => save(t)}
              className={`rounded-xl px-3 py-2 text-left font-semibold transition hover:ring-2 hover:ring-jesa disabled:opacity-50 ${BADGE_TONE[SHIFT[t].tone]} ${
                sk.fixedPost === t ? 'ring-2 ring-jesa' : ''
              }`}
            >
              <Pin className="mr-1 inline h-3 w-3" />
              {tr(SHIFT[t].rotationLabel)}
            </button>
          ))}
        </div>
        {sk.fixedPost && (
          <button
            disabled={pending}
            onClick={() => save(null)}
            className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-50 dark:bg-navy-dark dark:text-gray-200"
          >
            <PinOff className="h-3.5 w-3.5" /> {tr('Remettre dans la rotation')}
          </button>
        )}
        <FormError message={error} />
      </div>
    </Modal>
  );
}

function ExtendRotation({ lastPlannedWeek, defaultWeeks, onClose }: { lastPlannedWeek: string | null; defaultWeeks: number; onClose: () => void }) {
  const tr = useT();
  const { pending, error, run } = useAction();
  const [weeks, setWeeks] = useState(defaultWeeks);
  const [result, setResult] = useState<string | null>(null);
  return (
    <Modal open title={tr('Prolonger la rotation')} onClose={onClose}>
      <div className="space-y-3 text-xs">
        <p className="text-gray-600 dark:text-gray-400">
          {tr('Génère les semaines suivant la dernière semaine planifiée')}{lastPlannedWeek ? tr(' (semaine du {0})', fmtDay(lastPlannedWeek)) : ''} {tr(": chaque magasinier reprend le poste qu'il avait 4 semaines plus tôt (cycle de rotation) ; les postes fixes sont respectés. Les cases restent modifiables ensuite.")}
        </p>
        <label className="flex items-center gap-2">
          <span className="font-semibold text-gray-700 dark:text-gray-300">{tr('Nombre de semaines :')}</span>
          <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className={`${inputClass} w-24`}>
            {[1, 2, 3, 4, 5, 6, 8, 12].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {result ? (
          <p className="rounded-lg bg-jesa/15 p-3 font-semibold text-jesa-light">{result}</p>
        ) : (
          <button
            disabled={pending}
            onClick={() =>
              run(async () => {
                const r = await api.extendRotation(weeks);
                setResult(tr('{0} affectation(s) créée(s) du {1} au {2}.', r.created, fmtDay(r.from), fmtDay(r.to)));
              })
            }
            className="flex items-center gap-1.5 rounded-xl bg-jesa px-3 py-1.5 font-bold text-white hover:bg-jesa-dark disabled:opacity-50"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> {pending ? tr('Génération…') : tr('Générer')}
          </button>
        )}
        <FormError message={error} />
      </div>
    </Modal>
  );
}

'use client';

import { CheckSquare, Square, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useProfile } from '../layout/ProfileContext';

interface SelectionValue {
  active: boolean;
  selected: number[];
  setActive: (on: boolean) => void;
  toggle: (id: number) => void;
  setSelected: (ids: number[]) => void;
}

const SelectionContext = createContext<SelectionValue | null>(null);
const useSelection = (): SelectionValue => {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('SelectionDelete manquant.');
  return ctx;
};

/** Mode sélection d'une liste de cartes (engins, magasiniers…) : on coche les éléments à supprimer, puis on confirme */
export function SelectionDelete({ children }: { children: ReactNode }) {
  const [active, setActiveState] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const setActive = (on: boolean) => {
    setActiveState(on);
    setSelected([]);
  };
  const toggle = (id: number) => setSelected((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  return <SelectionContext.Provider value={{ active, selected, setActive, toggle, setSelected }}>{children}</SelectionContext.Provider>;
}

/** Bouton d'en-tête : entre dans le mode sélection */
export function SelectToDeleteButton({ label }: { label: string }) {
  const { active, setActive } = useSelection();
  const { canEdit } = useProfile();
  if (active || !canEdit) return null;
  return (
    <button
      onClick={() => setActive(true)}
      className="ml-auto flex w-fit items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:border-red-400 hover:text-red-600 dark:border-gray-700 dark:bg-navy-light dark:text-gray-200 dark:hover:border-red-500/60 dark:hover:text-red-400"
    >
      <CheckSquare className="h-4 w-4" /> {label}
    </button>
  );
}

interface SelectionBarProps {
  /** Éléments affichés (code = repère dans les messages d'erreur) */
  items: { id: number; code: string }[];
  /** Ressource API : « /engins » → DELETE /engins/:id */
  basePath: string;
  hint: string;
  note: string;
}

/** Barre d'action du mode sélection (au-dessus de la liste) */
export function SelectionDeleteBar({ items, basePath, hint, note }: SelectionBarProps) {
  const tr = useT();
  const router = useRouter();
  const { active, selected, setActive, setSelected } = useSelection();
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // La confirmation retombe si la sélection change ou après quelques secondes
  useEffect(() => setArmed(false), [selected]);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);

  if (!active) return null;
  const allSelected = items.length > 0 && items.every((e) => selected.includes(e.id));

  const remove = async () => {
    if (!armed) return setArmed(true);
    setPending(true);
    const failed: string[] = [];
    const kept: number[] = [];
    for (const id of selected) {
      const code = items.find((e) => e.id === id)?.code ?? String(id);
      try {
        await api.remove(`${basePath}/${id}`);
      } catch (e) {
        kept.push(id);
        failed.push(`${code} : ${tr(e instanceof Error ? e.message : 'Erreur inattendue.')}`);
      }
    }
    setPending(false);
    setErrors(failed);
    router.refresh();
    if (failed.length) setSelected(kept);
    else setActive(false);
  };

  return (
    <div className="space-y-2 rounded-2xl border border-red-500/50 bg-red-50 p-3 text-xs dark:bg-red-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-gray-800 dark:text-gray-200">
          {hint} <span className="font-bold text-red-600 dark:text-red-400">{tr('{0} sélectionné(s)', selected.length)}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setSelected(allSelected ? [] : items.map((e) => e.id))} className="rounded-lg px-2 py-1 font-bold text-jesa-light hover:underline">
            {allSelected ? tr('Tout décocher') : tr('Tout cocher')}
          </button>
          <button
            onClick={() => void remove()}
            disabled={pending || selected.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {pending ? tr('Suppression…') : armed ? tr('Confirmer la suppression ?') : tr('Supprimer la sélection ({0})', selected.length)}
          </button>
          <button
            onClick={() => setActive(false)}
            disabled={pending}
            className="flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-navy-dark"
          >
            <X className="h-3.5 w-3.5" /> {tr('Annuler')}
          </button>
        </div>
      </div>
      <p className="text-[11px] text-gray-600 dark:text-gray-400">
        {note}
      </p>
      {errors.length > 0 && (
        <ul className="space-y-0.5 font-semibold text-red-700 dark:text-red-300">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Carte : en mode sélection, un clic coche la carte au lieu d'ouvrir la fiche */
export function SelectableCard({ id, label, children }: { id: number; label: string; children: ReactNode }) {
  const { active, selected, toggle } = useSelection();
  const on = selected.includes(id);
  return (
    <div className={`relative rounded-2xl ${active && on ? 'ring-2 ring-red-500' : ''}`}>
      {children}
      {active && (
        <button
          onClick={() => toggle(id)}
          role="checkbox"
          aria-checked={on}
          aria-label={label}
          className={`absolute inset-0 flex items-start justify-start rounded-2xl p-1.5 transition ${on ? 'bg-red-500/10' : 'hover:bg-jesa-light/10'}`}
        >
          <span className={`rounded-md bg-white shadow dark:bg-navy-dark ${on ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
            {on ? <CheckSquare className="h-6 w-6" /> : <Square className="h-6 w-6" />}
          </span>
        </button>
      )}
    </div>
  );
}

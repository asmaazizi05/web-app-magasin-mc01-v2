'use client';

import { ArrowDown, ArrowUp, ListChecks, Plus, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import type { EnginDetail } from '@/lib/types';
import { useSubmit } from '../forms/useSubmit';
import { FormError, inputClass } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { useT } from '@/lib/i18n';

type Row = { key?: string; label: string; id: number };

/** Édition de la check-list de prise de poste propre à un engin */
export function ChecklistEditor({ engin }: { engin: EnginDetail }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const { pending, error, run } = useSubmit(() => setOpen(false));

  const start = () => {
    setRows(engin.checklist.map((c, i) => ({ key: c.key, label: c.label, id: i })));
    setOpen(true);
  };
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const copy = [...r];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  const nextId = () => Math.max(0, ...rows.map((r) => r.id)) + 1;

  const save = () =>
    void run(() => api.setEnginChecklist(engin.id, { items: rows.filter((r) => r.label.trim()).map((r) => ({ key: r.key, label: r.label.trim() })) }));

  return (
    <>
      <button
        onClick={start}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-navy-dark"
      >
        <ListChecks className="h-3.5 w-3.5" /> {tr('Modifier la check-list')}
      </button>
      <Modal open={open} title={tr('Check-list de prise de poste — {0} {1}', engin.code, engin.name)} onClose={() => setOpen(false)}>
        <div className="space-y-3 text-xs">
          <p className="text-gray-600 dark:text-gray-400">
            {tr('Points vérifiés par le conducteur avant chaque utilisation de')} <strong>{tr('cet engin')}</strong>{tr(". Les check-lists déjà remplies conservent leurs points d'origine.")}
          </p>
          <ol className="space-y-1.5">
            {rows.map((r, i) => (
              <li key={r.id} className="flex items-center gap-1.5">
                <span className="w-5 text-right font-bold text-gray-400">{i + 1}.</span>
                <input
                  value={r.label}
                  onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))}
                  className={`${inputClass} flex-1`}
                  aria-label={tr('Point {0}', i + 1)}
                />
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-navy-dark" aria-label={tr('Monter')}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-navy-dark" aria-label={tr('Descendre')}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={tr('Supprimer le point')}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, { label: '', id: nextId() }])}
            className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 font-semibold text-gray-600 hover:border-jesa hover:text-jesa-light dark:border-gray-700 dark:text-gray-300"
          >
            <Plus className="h-3.5 w-3.5" /> {tr('Ajouter un point')}
          </button>
          <FormError message={error} />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
            {engin.checklistCustom ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => void run(() => api.setEnginChecklist(engin.id, { reset: true }))}
                className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-60 dark:text-gray-400 dark:hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" /> {tr('Revenir à la liste type')}
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="rounded-xl bg-jesa px-4 py-1.5 font-bold text-white hover:bg-jesa-dark disabled:opacity-60"
            >
              {pending ? tr('Enregistrement…') : tr('Enregistrer la check-list')}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/** Charge le parc de démonstration */
export function LoadDemoButton() {
  const tr = useT();
  const { pending, error, run } = useSubmit(() => undefined);
  return (
    <span className="inline-flex flex-col items-end">
      <button
        disabled={pending}
        onClick={() => void run(() => api.loadDemoEngins())}
        className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 hover:border-jesa disabled:opacity-60 dark:border-gray-700 dark:bg-navy-dark dark:text-gray-200"
      >
        {pending ? tr('Chargement…') : tr('Charger les données de démo')}
      </button>
      {error && <span className="text-[10px] text-red-500">{tr(error)}</span>}
    </span>
  );
}

'use client';

import { FileText } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import type { Article, ExpeditionPriority, Storekeeper } from '@/lib/types';
import { Field, FormError, inputClass } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { useSubmit } from './useSubmit';
import { useT } from '@/lib/i18n';

export function ExpeditionForm({ articles, storekeepers }: { articles: Article[]; storekeepers: Storekeeper[] }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useSubmit(() => setOpen(false));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const preparer = Number(f.get('preparerId'));
    void run(() =>
      api.createExpedition({
        requesterService: String(f.get('requesterService')),
        articleId: Number(f.get('articleId')),
        quantity: Number(f.get('quantity')),
        priority: f.get('priority') as ExpeditionPriority,
        preparerId: preparer > 0 ? preparer : undefined,
      }),
    );
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow transition hover:bg-blue-500">
        <FileText className="h-4 w-4" /> {tr('Créer Bon de Sortie / Picking')}
      </button>
      <Modal open={open} title={tr('Créer Bon de Sortie / Picking')} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <Field label={tr('Demandeur / Service')}>
            <input name="requesterService" required className={inputClass} placeholder={tr('ex. Maintenance Engrais (Urgence)')} />
          </Field>
          <Field label={tr('Article Demandé')}>
            <select name="articleId" required className={inputClass}>
              {articles.map((a) => (
                <option key={a.id} value={a.id} disabled={a.currentStock === 0}>
                  {a.code} – {a.designation} {tr('(dispo :')} {a.currentStock})
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('Quantité')}>
              <input name="quantity" type="number" min={1} required defaultValue={1} className={inputClass} />
            </Field>
            <Field label={tr('Priorité')}>
              <select name="priority" className={inputClass} defaultValue="NORMALE">
                <option value="URGENT">{tr('Urgent')}</option>
                <option value="HAUTE">{tr('Haute')}</option>
                <option value="NORMALE">{tr('Normale')}</option>
              </select>
            </Field>
          </div>
          <Field label={tr('Magasinier Préparateur')}>
            <select name="preparerId" className={inputClass} defaultValue="0">
              <option value="0">{tr('— Non affecté (En Attente) —')}</option>
              {storekeepers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.matricule})
                </option>
              ))}
            </select>
          </Field>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">{tr('La sortie est refusée si le stock disponible est insuffisant.')}</p>
          <FormError message={error} />
          <button disabled={pending} className="w-full rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-60">
            {pending ? tr('Enregistrement…') : tr('Valider le bon de sortie')}
          </button>
        </form>
      </Modal>
    </>
  );
}

'use client';

import { PlusCircle } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import type { ArticleRef, ReceptionStatus, Storekeeper } from '@/lib/types';
import { Field, FormError, inputClass } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { useSubmit } from './useSubmit';
import { useT } from '@/lib/i18n';

export function ReceptionForm({ articles, storekeepers }: { articles: ArticleRef[]; storekeepers: Storekeeper[] }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useSubmit(() => setOpen(false));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(() =>
      api.createReception({
        supplier: String(f.get('supplier')),
        articleId: Number(f.get('articleId')),
        quantity: Number(f.get('quantity')),
        receiverId: Number(f.get('receiverId')),
        status: f.get('status') as ReceptionStatus,
      }),
    );
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-jesa px-3 py-1.5 text-xs font-bold text-white shadow transition hover:bg-jesa-dark">
        <PlusCircle className="h-4 w-4" /> {tr('Créer Bon de Réception (BR)')}
      </button>
      <Modal open={open} title={tr('Créer Bon de Réception (BR)')} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <Field label={tr('Fournisseur / Origine')}>
            <input name="supplier" required className={inputClass} placeholder={tr('ex. SKF Maroc SA, Cession Site OCP Jorf')} />
          </Field>
          <Field label={tr('Article')}>
            <select name="articleId" required className={inputClass}>
              {articles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} – {a.designation}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('Quantité')}>
              <input name="quantity" type="number" min={1} required defaultValue={1} className={inputClass} />
            </Field>
            <Field label={tr('Statut')}>
              <select name="status" className={inputClass} defaultValue="VALIDE">
                <option value="VALIDE">{tr('Validé SAP')}</option>
                <option value="CONTROLE_QUALITE">{tr('Contrôle Qualité')}</option>
              </select>
            </Field>
          </div>
          <Field label={tr('Magasinier Récepteur')}>
            <select name="receiverId" required className={inputClass}>
              {storekeepers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.matricule})
                </option>
              ))}
            </select>
          </Field>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">{tr("Le N° BR est attribué automatiquement ; l'entrée en stock et le mouvement sont enregistrés dans la même transaction.")}</p>
          <FormError message={error} />
          <button disabled={pending} className="w-full rounded-xl bg-jesa px-3 py-2 text-xs font-bold text-white hover:bg-jesa-dark disabled:opacity-60">
            {pending ? tr('Enregistrement…') : tr('Valider la réception')}
          </button>
        </form>
      </Modal>
    </>
  );
}

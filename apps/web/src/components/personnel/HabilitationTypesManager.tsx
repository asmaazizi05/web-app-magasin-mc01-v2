'use client';

import { Pencil, Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import type { HabilitationTypeView } from '@/lib/types';
import { useSubmit } from '../forms/useSubmit';
import { ConfirmButton } from '../ui/ConfirmButton';
import { Field, FormError, inputClass } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { type Translate, useT } from '@/lib/i18n';

const validity = (m: number, tr: Translate) => (m % 12 === 0 ? tr(m > 12 ? '{0} ans' : '{0} an', m / 12) : tr('{0} mois', m));

function TypeForm({ type }: { type?: HabilitationTypeView }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useSubmit(() => setOpen(false));
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      name: String(f.get('name')).trim(),
      description: String(f.get('description')).trim() || undefined,
      validityMonths: Number(f.get('validityMonths')),
    };
    void run(() => (type ? api.updateHabilitationType(type.id, body) : api.createHabilitationType(body)));
  };
  return (
    <>
      {type ? (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-navy-dark">
          <Pencil className="h-3 w-3" /> {tr('Modifier')}
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-jesa px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-jesa-dark">
          <Plus className="h-4 w-4" /> {tr('Ajouter un type')}
        </button>
      )}
      <Modal open={open} title={type ? tr('Modifier — {0}', type.name) : tr("Ajouter un type d'habilitation")} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <Field label={tr('Nom')}>
            <input name="name" required defaultValue={type?.name} className={inputClass} />
          </Field>
          <Field label={tr('Description')}>
            <input name="description" defaultValue={type?.description ?? ''} className={inputClass} />
          </Field>
          <Field label={tr('Durée de validité (mois)')}>
            <input name="validityMonths" type="number" min={1} max={240} required defaultValue={type?.validityMonths ?? 36} className={`${inputClass} max-w-[8rem]`} />
          </Field>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            {tr("La durée sert à calculer la date d'expiration des nouvelles habilitations (les habilitations déjà saisies gardent leur date).")}
          </p>
          <FormError message={error} />
          <button disabled={pending} className="flex w-full justify-center rounded-xl bg-jesa px-3 py-2 text-xs font-bold text-white hover:bg-jesa-dark disabled:opacity-60">
            {pending ? tr('Enregistrement…') : tr('Enregistrer')}
          </button>
        </form>
      </Modal>
    </>
  );
}

export function HabilitationTypesManager({ types }: { types: HabilitationTypeView[] }) {
  const tr = useT();
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <TypeForm />
      </div>
      <div className="custom-scrollbar overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-100 font-semibold uppercase text-gray-600 dark:bg-navy-dark dark:text-gray-400">
            <tr>
              <th className="p-2">{tr('Habilitation')}</th>
              <th className="p-2">{tr('Validité')}</th>
              <th className="p-2">{tr('Utilisée')}</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {types.map((t) => (
              <tr key={t.id}>
                <td className="p-2">
                  <span className="font-bold text-gray-900 dark:text-white">{t.name}</span>
                  {t.description && <span className="block text-[10px] text-gray-500 dark:text-gray-400">{t.description}</span>}
                </td>
                <td className="whitespace-nowrap p-2 font-semibold">{validity(t.validityMonths, tr)}</td>
                <td className="p-2 text-gray-600 dark:text-gray-300">{t.usage > 0 ? tr("{0} fois", t.usage) : "—"}</td>
                <td className="p-2">
                  <div className="flex justify-end gap-1">
                    <TypeForm type={t} />
                    {t.usage === 0 && <ConfirmButton deletePath={`/habilitation-types/${t.id}`} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

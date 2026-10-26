'use client';

import { BadgePlus, GraduationCap, Pencil, RefreshCw, UserPlus } from 'lucide-react';
import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDay, siteToday } from '@/lib/format';
import type { HabilitationTypeView, HabilitationView, Storekeeper } from '@/lib/types';
import { useSubmit } from '../forms/useSubmit';
import { Field, FormError, inputClass } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { useT } from '@/lib/i18n';

const primaryBtn = 'flex items-center gap-1.5 rounded-xl bg-jesa px-3 py-1.5 text-xs font-bold text-white shadow transition hover:bg-jesa-dark disabled:opacity-60';
const ghostBtn =
  'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-navy-dark';

function SubmitRow({ pending, label, error }: { pending: boolean; label: string; error: string | null }) {
  const tr = useT();
  return (
    <>
      <FormError message={error} />
      <button disabled={pending} className={`${primaryBtn} w-full justify-center py-2`}>
        {pending ? tr('Enregistrement…') : label}
      </button>
    </>
  );
}

const fileField = (onChange: (f: File | null) => void): ReactNode => (
  <input
    type="file"
    accept="application/pdf,image/jpeg,image/png,image/webp"
    onChange={(e) => onChange(e.target.files?.[0] ?? null)}
    className="block w-full text-xs text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-jesa/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-jesa-light dark:text-gray-400"
  />
);

/** Création (sans `storekeeper`) ou modification d'un magasinier */
export function StorekeeperForm({ storekeeper, suggestedMatricule }: { storekeeper?: Storekeeper; suggestedMatricule?: string }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useSubmit(() => setOpen(false));
  const editing = Boolean(storekeeper);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      matricule: String(f.get('matricule')).trim(),
      name: String(f.get('name')).trim(),
      role: String(f.get('role')).trim(),
      specialty: String(f.get('specialty')).trim(),
      phone: String(f.get('phone')).trim() || undefined,
      // null : efface la valeur à la modification
      email: String(f.get('email')).trim() || null,
      company: String(f.get('company')).trim() || null,
      hireDate: String(f.get('hireDate')) || undefined,
    };
    void run(() => (storekeeper ? api.updateStorekeeper(storekeeper.id, body) : api.createStorekeeper(body)));
  };

  return (
    <>
      {editing ? (
        <button onClick={() => setOpen(true)} className={ghostBtn}>
          <Pencil className="h-3 w-3" /> {tr('Modifier')}
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className={primaryBtn}>
          <UserPlus className="h-4 w-4" /> {tr('Ajouter un magasinier')}
        </button>
      )}
      <Modal open={open} title={editing ? tr('Modifier — {0}', storekeeper?.name ?? '') : tr('Ajouter un magasinier')} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label={tr('Matricule')}>
              <input name="matricule" required pattern="M-\d{4}" defaultValue={storekeeper?.matricule ?? suggestedMatricule} className={inputClass} />
            </Field>
            <Field label={tr('Nom complet')} className="col-span-2">
              <input name="name" required defaultValue={storekeeper?.name} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('Fonction')}>
              <input name="role" required defaultValue={storekeeper?.role ?? 'Magasinier'} className={inputClass} />
            </Field>
            <Field label={tr('Spécialité')}>
              <input name="specialty" required defaultValue={storekeeper?.specialty} placeholder={tr('ex. Réceptions, Picking…')} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('Adresse e-mail')}>
              <input name="email" type="email" maxLength={160} defaultValue={storekeeper?.email ?? ''} placeholder={tr('ex. prenom.nom@jesagroup.com')} className={inputClass} />
            </Field>
            <Field label={tr('Société')}>
              <input name="company" maxLength={120} defaultValue={storekeeper?.company ?? ''} placeholder={tr('ex. JESA, sous-traitant…')} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('Téléphone')}>
              <input name="phone" type="tel" defaultValue={storekeeper?.phone ?? ''} className={inputClass} />
            </Field>
            <Field label={tr("Date d'entrée")}>
              <input name="hireDate" type="date" defaultValue={storekeeper?.hireDate ?? ''} className={inputClass} />
            </Field>
          </div>
          <SubmitRow pending={pending} error={error} label={editing ? tr('Enregistrer') : tr('Ajouter')} />
        </form>
      </Modal>
    </>
  );
}

const addMonths = (day: string, months: number): string => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};

/** Ajout d'une habilitation, ou renouvellement (type pré-sélectionné) : l'expiration est calculée depuis la durée de validité du type */
export function HabilitationForm({ storekeeperId, types, renew }: { storekeeperId: number; types: HabilitationTypeView[]; renew?: HabilitationView }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState<number>(renew?.typeId ?? types[0]?.id ?? 0);
  const [obtainedAt, setObtainedAt] = useState(siteToday());
  const [expiresAt, setExpiresAt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const { pending, error, run } = useSubmit(() => setOpen(false));
  const type = types.find((t) => t.id === typeId);
  const computed = useMemo(() => (type && obtainedAt ? addMonths(obtainedAt, type.validityMonths) : ''), [type, obtainedAt]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(() =>
      api.addHabilitation(
        storekeeperId,
        {
          typeId,
          obtainedAt,
          expiresAt: expiresAt || undefined,
          reference: String(f.get('reference')).trim(),
          organization: String(f.get('organization')).trim(),
        },
        file,
      ),
    );
  };

  return (
    <>
      {renew ? (
        <button onClick={() => setOpen(true)} className={ghostBtn} title={tr("Enregistrer le nouveau certificat (l'ancien passe dans l'historique)")}>
          <RefreshCw className="h-3 w-3" /> {tr('Renouveler')}
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className={primaryBtn}>
          <BadgePlus className="h-4 w-4" /> {tr('Ajouter une habilitation')}
        </button>
      )}
      <Modal open={open} title={renew ? tr('Renouveler — {0}', renew.typeName) : tr('Ajouter une habilitation')} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <Field label={tr('Habilitation')}>
            <select value={typeId} onChange={(e) => setTypeId(Number(e.target.value))} disabled={Boolean(renew)} className={inputClass}>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {tr('(validité')} {t.validityMonths >= 12 && t.validityMonths % 12 === 0 ? tr('{0} an(s)', t.validityMonths / 12) : tr('{0} mois', t.validityMonths)})
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr("Date d'obtention")}>
              <input type="date" required value={obtainedAt} onChange={(e) => setObtainedAt(e.target.value)} className={inputClass} />
            </Field>
            <Field label={tr("Date d'expiration")}>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputClass} />
            </Field>
          </div>
          {!expiresAt && computed && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {tr('Expiration calculée automatiquement :')} <strong className="text-gray-900 dark:text-white">{fmtDay(computed)}</strong> {tr('(modifiable ci-dessus).')}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('N° de certificat')}>
              <input name="reference" defaultValue={renew?.reference ?? ''} className={inputClass} />
            </Field>
            <Field label={tr('Organisme')}>
              <input name="organization" defaultValue={renew?.organization ?? ''} className={inputClass} />
            </Field>
          </div>
          <Field label={tr('Justificatif (PDF ou photo, optionnel)')}>{fileField(setFile)}</Field>
          <SubmitRow pending={pending} error={error} label={renew ? tr('Enregistrer le renouvellement') : tr("Ajouter l'habilitation")} />
        </form>
      </Modal>
    </>
  );
}

/** Correction des dates / références d'une habilitation existante */
export function HabilitationEditForm({ habilitation }: { habilitation: HabilitationView }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useSubmit(() => setOpen(false));
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(() =>
      api.updateHabilitation(habilitation.id, {
        obtainedAt: String(f.get('obtainedAt')),
        expiresAt: String(f.get('expiresAt')),
        reference: String(f.get('reference')).trim(),
        organization: String(f.get('organization')).trim(),
      }),
    );
  };
  return (
    <>
      <button onClick={() => setOpen(true)} className={ghostBtn}>
        <Pencil className="h-3 w-3" /> {tr('Modifier')}
      </button>
      <Modal open={open} title={tr('Modifier — {0}', habilitation.typeName)} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr("Date d'obtention")}>
              <input name="obtainedAt" type="date" required defaultValue={habilitation.obtainedAt} className={inputClass} />
            </Field>
            <Field label={tr("Date d'expiration")}>
              <input name="expiresAt" type="date" required defaultValue={habilitation.expiresAt} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('N° de certificat')}>
              <input name="reference" defaultValue={habilitation.reference ?? ''} className={inputClass} />
            </Field>
            <Field label={tr('Organisme')}>
              <input name="organization" defaultValue={habilitation.organization ?? ''} className={inputClass} />
            </Field>
          </div>
          <SubmitRow pending={pending} error={error} label={tr('Enregistrer')} />
        </form>
      </Modal>
    </>
  );
}

export function TrainingForm({ storekeeperId }: { storekeeperId: number }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { pending, error, run } = useSubmit(() => setOpen(false));
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const hours = String(f.get('durationHours'));
    void run(() =>
      api.addTraining(
        storekeeperId,
        {
          title: String(f.get('title')).trim(),
          organization: String(f.get('organization')).trim(),
          date: String(f.get('date')),
          durationHours: hours ? Number(hours) : undefined,
        },
        file,
      ),
    );
  };
  return (
    <>
      <button onClick={() => setOpen(true)} className={primaryBtn}>
        <GraduationCap className="h-4 w-4" /> {tr('Ajouter une formation')}
      </button>
      <Modal open={open} title={tr('Ajouter une formation')} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <Field label={tr('Intitulé de la formation')}>
            <input name="title" required placeholder={tr('ex. Gestion des stocks SAP MM, Manutention sécurisée…')} className={inputClass} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={tr('Date')}>
              <input name="date" type="date" required defaultValue={siteToday()} className={inputClass} />
            </Field>
            <Field label={tr('Durée (heures)')}>
              <input name="durationHours" type="number" min={1} max={2000} className={inputClass} />
            </Field>
            <Field label={tr('Organisme')}>
              <input name="organization" className={inputClass} />
            </Field>
          </div>
          <Field label={tr('Certificat / attestation (PDF ou photo, optionnel)')}>{fileField(setFile)}</Field>
          <SubmitRow pending={pending} error={error} label={tr('Ajouter la formation')} />
        </form>
      </Modal>
    </>
  );
}

'use client';

import { AlertOctagon, CheckCircle2, ClipboardCheck, Power, PowerOff, Wrench, XCircle } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { siteToday } from '@/lib/format';
import { MAINTENANCE_TYPE } from '@/lib/labels';
import type { EnginDetail, MaintenanceType, Storekeeper } from '@/lib/types';
import { useSubmit } from '../forms/useSubmit';
import { Field, FormError, inputClass } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { useT } from '@/lib/i18n';

const btn = 'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold shadow transition disabled:opacity-60';
const submitBtn = 'flex w-full justify-center rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-60';
const optNum = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').replace(',', '.').trim();
  return s === '' ? undefined : Number(s);
};
const optStr = (v: FormDataEntryValue | null) => String(v ?? '').trim() || undefined;

export function BreakdownButton({ engin }: { engin: EnginDetail }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useSubmit(() => setOpen(false));
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(() => api.declareBreakdown(engin.id, { description: String(f.get('description')).trim(), date: String(f.get('date')), hourMeter: optNum(f.get('hourMeter')) }));
  };
  return (
    <>
      <button onClick={() => setOpen(true)} className={`${btn} bg-red-600 text-white hover:bg-red-500`}>
        <AlertOctagon className="h-4 w-4" /> {tr('Déclarer une panne')}
      </button>
      <Modal open={open} title={tr('Déclarer une panne — {0} {1}', engin.code, engin.name)} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <p className="rounded-lg bg-red-50 p-2 text-[11px] text-red-800 dark:bg-red-950/30 dark:text-red-200">
            {tr("L'engin passe « En panne » : il est signalé partout (tâches, tableau de bord) jusqu'à sa remise en service.")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('Date de la panne')}>
              <input name="date" type="date" required defaultValue={siteToday()} className={inputClass} />
            </Field>
            <Field label={tr("Compteur d'heures")}>
              <input name="hourMeter" type="number" min={0} defaultValue={engin.hourMeter ?? ''} className={inputClass} />
            </Field>
          </div>
          <Field label={tr('Description de la panne')}>
            <textarea name="description" required rows={3} placeholder={tr('ex. Fuite hydraulique au vérin de levée, mât bloqué en position haute…')} className={inputClass} />
          </Field>
          <FormError message={error} />
          <button disabled={pending} className={`${submitBtn} bg-red-600 hover:bg-red-500`}>
            {pending ? tr('Enregistrement…') : tr('Déclarer la panne')}
          </button>
        </form>
      </Modal>
    </>
  );
}

/** Clôture d'une panne / intervention en cours → remise en service */
export function CloseIssueButton({ recordId, compact = false }: { recordId: number; compact?: boolean }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useSubmit(() => setOpen(false));
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(() =>
      api.closeMaintenance(recordId, {
        endDate: String(f.get('endDate')),
        cost: optNum(f.get('cost')),
        partsReplaced: optStr(f.get('partsReplaced')),
        provider: optStr(f.get('provider')),
      }),
    );
  };
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={compact ? 'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30' : `${btn} bg-green-600 text-white hover:bg-green-500`}
      >
        <CheckCircle2 className={compact ? 'h-3 w-3' : 'h-4 w-4'} /> {tr('Remettre en service')}
      </button>
      <Modal open={open} title={tr('Remise en service')} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('Date de remise en service')}>
              <input name="endDate" type="date" required defaultValue={siteToday()} className={inputClass} />
            </Field>
            <Field label={tr('Coût de la réparation (DH)')}>
              <input name="cost" type="number" min={0} step="0.01" className={inputClass} />
            </Field>
          </div>
          <Field label={tr('Pièces remplacées')}>
            <input name="partsReplaced" className={inputClass} />
          </Field>
          <Field label={tr('Réparé par (atelier / prestataire)')}>
            <input name="provider" className={inputClass} />
          </Field>
          <FormError message={error} />
          <button disabled={pending} className={`${submitBtn} bg-green-600 hover:bg-green-500`}>
            {pending ? tr('Enregistrement…') : tr('Confirmer la remise en service')}
          </button>
        </form>
      </Modal>
    </>
  );
}

export function StatusToggle({ engin }: { engin: EnginDetail }) {
  const tr = useT();
  const { pending, error, run } = useSubmit(() => undefined);
  const outOfService = engin.status === 'HORS_SERVICE';
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        disabled={pending}
        onClick={() => void run(() => api.setEnginStatus(engin.id, outOfService ? 'DISPONIBLE' : 'HORS_SERVICE'))}
        className={`${btn} border border-gray-300 bg-white text-gray-800 hover:border-jesa dark:border-gray-700 dark:bg-navy-dark dark:text-gray-200`}
      >
        {outOfService ? <Power className="h-4 w-4 text-green-600" /> : <PowerOff className="h-4 w-4 text-gray-500" />}
        {outOfService ? tr('Remettre disponible') : tr('Mettre hors service')}
      </button>
      {error && <span className="text-[10px] text-red-500">{tr(error)}</span>}
    </span>
  );
}

export function MaintenanceForm({ engin, inspectionResults, defaultType = 'PREVENTIVE' }: { engin: EnginDetail; inspectionResults: string[]; defaultType?: MaintenanceType }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MaintenanceType>(defaultType);
  const [file, setFile] = useState<File | null>(null);
  const { pending, error, run } = useSubmit(() => setOpen(false));
  const isControl = type === 'CONTROLE_PERIODIQUE';
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(() =>
      api.addMaintenance(
        engin.id,
        {
          type,
          date: String(f.get('date')),
          endDate: isControl ? undefined : optStr(f.get('endDate')),
          hourMeter: optNum(f.get('hourMeter')),
          description: String(f.get('description')).trim(),
          partsReplaced: isControl ? undefined : optStr(f.get('partsReplaced')),
          cost: optNum(f.get('cost')),
          provider: optStr(f.get('provider')),
          result: isControl ? String(f.get('result')) : undefined,
        },
        file,
      ),
    );
  };
  const label = defaultType === 'CONTROLE_PERIODIQUE' ? tr('Enregistrer un contrôle') : tr('Enregistrer une intervention');
  return (
    <>
      <button onClick={() => setOpen(true)} className={`${btn} bg-jesa text-white hover:bg-jesa-dark`}>
        <Wrench className="h-4 w-4" /> {label}
      </button>
      <Modal open={open} title={`${label} — ${engin.code}`} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <Field label={tr('Type')}>
            <select value={type} onChange={(e) => setType(e.target.value as MaintenanceType)} className={inputClass}>
              {(Object.keys(MAINTENANCE_TYPE) as MaintenanceType[]).map((t) => (
                <option key={t} value={t}>
                  {tr(MAINTENANCE_TYPE[t].label)}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={isControl ? tr('Date du contrôle') : tr('Date de début')}>
              <input name="date" type="date" required defaultValue={siteToday()} className={inputClass} />
            </Field>
            {!isControl && (
              <Field label={tr('Remise en service')}>
                <input name="endDate" type="date" defaultValue={siteToday()} className={inputClass} />
              </Field>
            )}
            <Field label={tr("Compteur d'heures")}>
              <input name="hourMeter" type="number" min={0} defaultValue={engin.hourMeter ?? ''} className={inputClass} />
            </Field>
          </div>
          {!isControl && (
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{tr("Laissez « Remise en service » vide si l'engin est encore immobilisé.")}</p>
          )}
          <Field label={isControl ? tr('Observations du contrôle') : tr('Travaux réalisés')}>
            <textarea
              name="description"
              required
              rows={3}
              placeholder={isControl ? tr('ex. Vérification générale périodique — RAS') : tr('ex. Vidange moteur, remplacement filtres huile et air, graissage du mât')}
              className={inputClass}
            />
          </Field>
          {isControl ? (
            <Field label={tr('Résultat')}>
              <select name="result" defaultValue="Conforme" className={inputClass}>
                {inspectionResults.map((r) => (
                  <option key={r} value={r}>
                    {tr(r)}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label={tr('Pièces remplacées')}>
              <input name="partsReplaced" className={inputClass} />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={isControl ? tr('Organisme de contrôle') : tr('Intervenant (atelier / prestataire)')}>
              <input name="provider" className={inputClass} />
            </Field>
            <Field label={tr('Coût (DH)')}>
              <input name="cost" type="number" min={0} step="0.01" className={inputClass} />
            </Field>
          </div>
          <Field label={isControl ? tr('Rapport de contrôle (PDF / photo)') : tr('Bon d’intervention / facture (optionnel)')}>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-jesa/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-jesa-light dark:text-gray-400"
            />
          </Field>
          {isControl && (
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{tr("Un résultat « Non conforme » met automatiquement l'engin hors service.")}</p>
          )}
          <FormError message={error} />
          <button disabled={pending} className={`${submitBtn} bg-jesa hover:bg-jesa-dark`}>
            {pending ? tr('Enregistrement…') : tr('Enregistrer')}
          </button>
        </form>
      </Modal>
    </>
  );
}

export function CheckForm({ engin, storekeepers }: { engin: EnginDetail; storekeepers: Storekeeper[] }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [operator, setOperator] = useState<number>(storekeepers[0]?.id ?? 0);
  const [stop, setStop] = useState(true);
  const { pending, error, run } = useSubmit(() => {
    setOpen(false);
    setAnswers({});
  });
  const ok = (key: string) => answers[key] !== false;
  const anomalies = engin.checklist.filter((c) => !ok(c.key)).length;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(() =>
      api.addEnginCheck(engin.id, {
        storekeeperId: operator > 0 ? operator : undefined,
        operatorName: operator > 0 ? undefined : optStr(f.get('operatorName')),
        hourMeter: optNum(f.get('hourMeter')),
        items: engin.checklist.map((c) => ({ key: c.key, ok: ok(c.key) })),
        comment: optStr(f.get('comment')),
        stopEngin: anomalies > 0 && stop,
      }),
    );
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className={`${btn} bg-blue-600 text-white hover:bg-blue-500`}>
        <ClipboardCheck className="h-4 w-4" /> {tr('Check-list de prise de poste')}
      </button>
      <Modal open={open} title={tr('Check-list de prise de poste — {0} {1}', engin.code, engin.name)} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('Conducteur')}>
              <select value={operator} onChange={(e) => setOperator(Number(e.target.value))} className={inputClass}>
                {storekeepers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value={0}>{tr('Autre (saisir le nom)')}</option>
              </select>
            </Field>
            <Field label={tr("Compteur d'heures")}>
              <input name="hourMeter" type="number" min={0} defaultValue={engin.hourMeter ?? ''} className={inputClass} />
            </Field>
          </div>
          {operator === 0 && (
            <Field label={tr('Nom du conducteur')}>
              <input name="operatorName" required className={inputClass} />
            </Field>
          )}
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {engin.checklist.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                <span className="text-gray-800 dark:text-gray-200">{tr(c.label)}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, [c.key]: true }))}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 font-bold ${ok(c.key) ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 dark:bg-navy-dark'}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, [c.key]: false }))}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 font-bold ${!ok(c.key) ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500 dark:bg-navy-dark'}`}
                  >
                    <XCircle className="h-3.5 w-3.5" /> {tr('Anomalie')}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Field label={tr('Commentaire')}>
            <textarea name="comment" rows={2} className={inputClass} />
          </Field>
          {anomalies > 0 && (
            <label className="flex items-start gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-800 dark:bg-red-950/30 dark:text-red-200">
              <input type="checkbox" checked={stop} onChange={(e) => setStop(e.target.checked)} className="mt-0.5 accent-red-600" />
              {anomalies} {tr("anomalie(s) : mettre l'engin à l'arrêt (une panne est déclarée automatiquement).")}
            </label>
          )}
          <FormError message={error} />
          <button disabled={pending} className={`${submitBtn} ${anomalies ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}>
            {pending ? tr('Enregistrement…') : anomalies ? tr('Enregistrer ({0} anomalie(s))', anomalies) : tr('Valider : engin conforme')}
          </button>
        </form>
      </Modal>
    </>
  );
}

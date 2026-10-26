'use client';

import { Pencil, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useState } from 'react';
import { api } from '@/lib/api';
import { enginFamily } from '@/lib/labels';
import type { Engin, EnginInput, EnginOptions, EnginOwnership, HabilitationTypeView } from '@/lib/types';
import { Field, FormError, inputClass } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { useT } from '@/lib/i18n';

const OWNER_SERVICES = ['Magasin Central MC01', 'Maintenance OCP', 'JESA Maintenance', 'Service Logistique OCP', 'Service Production'];

/** Habilitation suggérée selon le type d'engin (ex. nacelle → CACES R486) */
function suggestedHabilitation(type: string, types: HabilitationTypeView[]): number | undefined {
  const t = type.toLowerCase();
  const code = t.includes('gerbeur') ? 'R485' : t.includes('nacelle') ? 'R486' : t.includes('pont') ? 'R484' : t.includes('chariot') ? 'R489' : null;
  return code ? types.find((h) => h.name.includes(code))?.id : undefined;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
      <legend className="px-1 text-[11px] font-bold uppercase tracking-wide text-jesa-light">{title}</legend>
      {children}
    </fieldset>
  );
}

const num = (f: FormData, k: string): number | undefined => {
  const v = String(f.get(k) ?? '').replace(',', '.').trim();
  return v === '' ? undefined : Number(v);
};
const str = (f: FormData, k: string): string | undefined => {
  const v = String(f.get(k) ?? '').trim();
  return v === '' ? undefined : v;
};

interface EnginFormProps {
  engin?: Engin;
  habilitationTypes: HabilitationTypeView[];
  options: EnginOptions;
  /** Contrôle périodique proposé pour un nouvel engin (réglage « Parc engins ») */
  defaultInspectionMonths?: number;
}

/** Ajout (sans `engin`) ou modification complète d'une fiche engin */
export function EnginForm({ engin, habilitationTypes, options, defaultInspectionMonths = 6 }: EnginFormProps) {
  const tr = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(engin?.type ?? '');
  const [energy, setEnergy] = useState(engin?.energy ?? '');
  const [ownership, setOwnership] = useState<EnginOwnership>(engin?.ownership ?? 'PROPRE');
  const [habilitation, setHabilitation] = useState<number>(engin?.requiredHabilitationTypeId ?? 0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const family = enginFamily(type);

  const onType = (v: string) => {
    setType(v);
    if (!engin && !habilitation) setHabilitation(suggestedHabilitation(v, habilitationTypes) ?? 0);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: EnginInput = {
      name: String(f.get('name')).trim(),
      type: type.trim(),
      requiredHabilitationTypeId: habilitation > 0 ? habilitation : null,
      brand: str(f, 'brand'),
      model: str(f, 'model'),
      serialNumber: str(f, 'serialNumber'),
      reference: str(f, 'reference'),
      commissioningYear: num(f, 'commissioningYear'),
      ownership,
      ownerService: ownership === 'PROPRE' ? str(f, 'ownerService') : undefined,
      rentalCompany: ownership === 'LOCATION' ? str(f, 'rentalCompany') : undefined,
      rentalEndDate: ownership === 'LOCATION' ? (str(f, 'rentalEndDate') ?? null) : null,
      energy: energy || undefined,
      capacityKg: num(f, 'capacityKg'),
      weightKg: num(f, 'weightKg'),
      liftHeightM: num(f, 'liftHeightM'),
      workingHeightM: num(f, 'workingHeightM'),
      forkLengthMm: num(f, 'forkLengthMm'),
      batteryVoltage: num(f, 'batteryVoltage'),
      batteryCapacityAh: num(f, 'batteryCapacityAh'),
      maxPersons: num(f, 'maxPersons'),
      usage: str(f, 'usage'),
      dimensions: str(f, 'dimensions'),
      notes: str(f, 'notes'),
      hourMeter: num(f, 'hourMeter'),
      serviceIntervalHours: num(f, 'serviceIntervalHours'),
      serviceIntervalMonths: num(f, 'serviceIntervalMonths'),
      lastServiceDate: str(f, 'lastServiceDate') ?? null,
      lastServiceHours: num(f, 'lastServiceHours'),
      inspectionIntervalMonths: num(f, 'inspectionIntervalMonths'),
      lastInspectionDate: str(f, 'lastInspectionDate') ?? null,
    };
    setPending(true);
    setError(null);
    try {
      const saved = engin ? await api.updateEngin(engin.id, body) : await api.createEngin(body);
      if (photo) await api.setEnginPhoto(saved.id, photo);
      setOpen(false);
      if (!engin) router.push(`/shifts/engins/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('Erreur inattendue.'));
    } finally {
      setPending(false);
    }
  };

  const v = (n: number | null | undefined) => (n === null || n === undefined ? '' : n);

  return (
    <>
      {engin ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-navy-dark"
        >
          <Pencil className="h-3.5 w-3.5" /> {tr('Modifier la fiche')}
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-jesa px-3 py-1.5 text-xs font-bold text-white shadow transition hover:bg-jesa-dark">
          <Plus className="h-4 w-4" /> {tr('Ajouter un engin')}
        </button>
      )}
      <Modal open={open} size="lg" title={engin ? tr('Modifier la fiche — {0} {1}', engin.code, engin.name) : tr('Ajouter un engin au parc')} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <Section title={tr('Identification')}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label={tr("Type d'engin")}>
                <input required list="engin-types" value={type} onChange={(e) => onType(e.target.value)} placeholder={tr('ex. Nacelle ciseaux')} className={inputClass} />
                <datalist id="engin-types">
                  {options.types.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </Field>
              <Field label={tr('Désignation')} className="sm:col-span-2">
                <input name="name" required defaultValue={engin?.name} placeholder={tr('ex. Nacelle ciseaux 12 m électrique')} className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Field label={tr('Marque')}>
                <input name="brand" defaultValue={engin?.brand ?? ''} placeholder={tr('Toyota, Linde…')} className={inputClass} />
              </Field>
              <Field label={tr('Modèle')}>
                <input name="model" defaultValue={engin?.model ?? ''} className={inputClass} />
              </Field>
              <Field label={tr('N° de série')}>
                <input name="serialNumber" defaultValue={engin?.serialNumber ?? ''} className={inputClass} />
              </Field>
              <Field label={tr('Immat. / n° de parc')}>
                <input name="reference" defaultValue={engin?.reference ?? ''} className={inputClass} />
              </Field>
              <Field label={tr('Mise en service (année)')}>
                <input name="commissioningYear" type="number" min={1950} max={2100} defaultValue={v(engin?.commissioningYear)} className={inputClass} />
              </Field>
            </div>
          </Section>

          <Section title={tr('Propriété')}>
            <div className="flex gap-2 text-xs">
              {(['PROPRE', 'LOCATION'] as EnginOwnership[]).map((o) => (
                <label
                  key={o}
                  className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 ${ownership === o ? 'border-jesa bg-jesa/10 font-semibold' : 'border-gray-200 dark:border-gray-700'}`}
                >
                  <input type="radio" checked={ownership === o} onChange={() => setOwnership(o)} className="accent-[#003088]" />
                  {o === 'PROPRE' ? tr('Engin propre (service d’origine)') : tr('Engin en location')}
                </label>
              ))}
            </div>
            {ownership === 'PROPRE' ? (
              <Field label={tr("Service d'origine / propriétaire")}>
                <input name="ownerService" list="owner-services" defaultValue={engin?.ownerService ?? ''} className={inputClass} />
                <datalist id="owner-services">
                  {OWNER_SERVICES.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Field>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label={tr('Société de location')}>
                  <input name="rentalCompany" required defaultValue={engin?.rentalCompany ?? ''} className={inputClass} />
                </Field>
                <Field label={tr('Fin du contrat de location')}>
                  <input name="rentalEndDate" type="date" defaultValue={engin?.rentalEndDate ?? ''} className={inputClass} />
                </Field>
              </div>
            )}
          </Section>

          <Section title={tr('Caractéristiques techniques')}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label={tr('Énergie')}>
                <select value={energy} onChange={(e) => setEnergy(e.target.value)} className={inputClass}>
                  <option value="">—</option>
                  {options.energies.map((x) => (
                    <option key={x} value={x}>
                      {tr(x)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={tr('Capacité de charge (kg)')}>
                <input name="capacityKg" type="number" min={0} defaultValue={v(engin?.capacityKg)} className={inputClass} />
              </Field>
              <Field label={tr('Poids à vide (kg)')}>
                <input name="weightKg" type="number" min={0} defaultValue={v(engin?.weightKg)} className={inputClass} />
              </Field>
              <Field label={tr('Utilisation')}>
                <select name="usage" defaultValue={engin?.usage ?? ''} className={inputClass}>
                  <option value="">—</option>
                  {options.usages.map((x) => (
                    <option key={x} value={x}>
                      {tr(x)}
                    </option>
                  ))}
                </select>
              </Field>
              {family === 'FOURCHES' && (
                <>
                  <Field label={tr('Hauteur de levée (m)')}>
                    <input name="liftHeightM" type="number" step="0.01" min={0} defaultValue={v(engin?.liftHeightM)} className={inputClass} />
                  </Field>
                  <Field label={tr('Longueur fourches (mm)')}>
                    <input name="forkLengthMm" type="number" min={0} defaultValue={v(engin?.forkLengthMm)} className={inputClass} />
                  </Field>
                </>
              )}
              {family === 'NACELLE' && (
                <>
                  <Field label={tr('Hauteur de travail (m)')}>
                    <input name="workingHeightM" type="number" step="0.01" min={0} defaultValue={v(engin?.workingHeightM)} className={inputClass} />
                  </Field>
                  <Field label={tr('Personnes max. en nacelle')}>
                    <input name="maxPersons" type="number" min={1} max={20} defaultValue={v(engin?.maxPersons)} className={inputClass} />
                  </Field>
                </>
              )}
              {family === 'PONT' && (
                <Field label={tr('Hauteur de levage (m)')}>
                  <input name="liftHeightM" type="number" step="0.01" min={0} defaultValue={v(engin?.liftHeightM)} className={inputClass} />
                </Field>
              )}
              {energy === 'Électrique' && (
                <>
                  <Field label={tr('Batterie : tension (V)')}>
                    <input name="batteryVoltage" type="number" min={0} defaultValue={v(engin?.batteryVoltage)} className={inputClass} />
                  </Field>
                  <Field label={tr('Batterie : capacité (Ah)')}>
                    <input name="batteryCapacityAh" type="number" min={0} defaultValue={v(engin?.batteryCapacityAh)} className={inputClass} />
                  </Field>
                </>
              )}
              <Field label={tr('Dimensions (L × l × h)')} className="col-span-2">
                <input name="dimensions" defaultValue={engin?.dimensions ?? ''} placeholder={tr('ex. 2,45 × 1,15 × 2,10 m')} className={inputClass} />
              </Field>
            </div>
            <Field label={tr('Équipements / remarques')}>
              <textarea name="notes" rows={2} defaultValue={engin?.notes ?? ''} placeholder={tr('ex. Positionneur de fourches, gyrophare, cabine…')} className={inputClass} />
            </Field>
          </Section>

          <Section title={tr('Compteur et plan de maintenance')}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label={tr("Compteur d'heures actuel")}>
                <input name="hourMeter" type="number" min={0} defaultValue={v(engin?.hourMeter)} className={inputClass} />
              </Field>
              <Field label={tr('Entretien tous les … heures')}>
                <input name="serviceIntervalHours" type="number" min={1} defaultValue={v(engin?.serviceIntervalHours)} placeholder={tr('ex. 250')} className={inputClass} />
              </Field>
              <Field label={tr('… ou tous les … mois')}>
                <input name="serviceIntervalMonths" type="number" min={1} max={60} defaultValue={v(engin?.serviceIntervalMonths)} placeholder={tr('ex. 6')} className={inputClass} />
              </Field>
              <Field label={tr('Contrôle périodique (mois)')}>
                <input name="inspectionIntervalMonths" type="number" min={1} max={60} defaultValue={engin?.inspectionIntervalMonths ?? defaultInspectionMonths} className={inputClass} />
              </Field>
              <Field label={tr('Dernier entretien : date')}>
                <input name="lastServiceDate" type="date" defaultValue={engin?.lastServiceDate ?? ''} className={inputClass} />
              </Field>
              <Field label={tr('Dernier entretien : compteur')}>
                <input name="lastServiceHours" type="number" min={0} defaultValue={v(engin?.lastServiceHours)} className={inputClass} />
              </Field>
              <Field label={tr('Dernier contrôle périodique')} className="col-span-2">
                <input name="lastInspectionDate" type="date" defaultValue={engin?.lastInspectionDate ?? ''} className={inputClass} />
              </Field>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {tr("Les prochaines échéances sont calculées automatiquement (le premier seuil atteint, heures ou mois, déclenche l'alerte). Ensuite, chaque entretien ou contrôle enregistré dans l'historique les met à jour.")}
            </p>
          </Section>

          <Section title={tr('Conduite et photo')}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={tr('Habilitation requise pour conduire')}>
                <select value={habilitation} onChange={(e) => setHabilitation(Number(e.target.value))} className={inputClass}>
                  <option value={0}>{tr('Aucune')}</option>
                  {habilitationTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={engin?.photoUrl ? tr('Remplacer la photo') : tr("Photo de l'engin")}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-jesa/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-jesa-light dark:text-gray-400"
                />
              </Field>
            </div>
          </Section>

          <FormError message={error} />
          <button disabled={pending} className="flex w-full justify-center rounded-xl bg-jesa px-3 py-2 text-xs font-bold text-white hover:bg-jesa-dark disabled:opacity-60">
            {pending ? tr('Enregistrement…') : engin ? tr('Enregistrer la fiche') : tr("Ajouter l'engin")}
          </button>
        </form>
      </Modal>
    </>
  );
}

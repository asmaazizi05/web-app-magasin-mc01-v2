'use client';

import { ClipboardPlus, NotebookPen, Pencil, Plus, Printer, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { siteToday } from '@/lib/format';
import { ENGIN_STATUS, INTERVENTION_STATUS, PROVIDER_KIND, TASK_STATUS } from '@/lib/labels';
import type {
  Engin,
  InterventionDetail,
  InterventionMember,
  InterventionStatus,
  InterventionSummary,
  InterventionTask,
  ProviderKind,
  TaskStatus,
  Zone,
} from '@/lib/types';
import { useSubmit } from '../forms/useSubmit';
import { Field, FormError, inputClass } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { BADGE_TONE } from '../ui/tones';
import { useT } from '@/lib/i18n';

const primaryBtn = 'flex items-center gap-1.5 rounded-xl bg-jesa px-3 py-1.5 text-xs font-bold text-white shadow transition hover:bg-jesa-dark disabled:opacity-60';
const smallBtn = 'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-navy-dark';
const PROGRESS_STEPS = [0, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100];

function Submit({ pending, error, label }: { pending: boolean; error: string | null; label: string }) {
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

/** Création (sans `intervention`) ou modification des informations générales */
export function InterventionForm({ intervention, zones, workTypes }: { intervention?: InterventionSummary; zones: Zone[]; workTypes: string[] }) {
  const tr = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ProviderKind>(intervention?.providerKind ?? 'PRESTATAIRE');
  const { pending, error, run } = useSubmit(() => setOpen(false));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const zone = Number(f.get('zoneId'));
    const body = {
      title: String(f.get('title')).trim(),
      workType: String(f.get('workType')).trim(),
      providerKind: kind,
      company: String(f.get('company')).trim(),
      managerName: String(f.get('managerName')).trim(),
      managerPhone: String(f.get('managerPhone')).trim() || undefined,
      zoneId: zone > 0 ? zone : null,
      description: String(f.get('description')).trim() || undefined,
      plannedStart: String(f.get('plannedStart')),
      plannedEnd: String(f.get('plannedEnd')),
    };
    void run(async () => {
      if (intervention) await api.updateIntervention(intervention.id, body);
      else {
        const created = await api.createIntervention(body);
        router.push(`/shifts/prestations/${created.id}`);
      }
    });
  };

  return (
    <>
      {intervention ? (
        <button onClick={() => setOpen(true)} className={smallBtn}>
          <Pencil className="h-3 w-3" /> {tr('Modifier les informations')}
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className={primaryBtn}>
          <ClipboardPlus className="h-4 w-4" /> {tr('Nouvelle intervention')}
        </button>
      )}
      <Modal open={open} title={intervention ? tr('Modifier — {0}', intervention.code) : tr('Nouvelle intervention (équipe support / prestataire)')} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <Field label={tr('Projet / intitulé des travaux')}>
            <input name="title" required defaultValue={intervention?.title} placeholder={tr('ex. Réimplantation des rayonnages R1 à R3')} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('Type de travaux')}>
              <input name="workType" required list="work-types" defaultValue={intervention?.workType} className={inputClass} />
              <datalist id="work-types">
                {workTypes.map((w) => (
                  <option key={w} value={w} />
                ))}
              </datalist>
            </Field>
            <Field label={tr('Zone du magasin')}>
              <select name="zoneId" defaultValue={intervention?.zone?.id ?? 0} className={inputClass}>
                <option value={0}>{tr('Plusieurs zones / non précisée')}</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex gap-2">
            {(Object.keys(PROVIDER_KIND) as ProviderKind[]).map((k) => (
              <label
                key={k}
                className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                  kind === k ? 'border-jesa bg-jesa/10 font-semibold' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <input type="radio" checked={kind === k} onChange={() => setKind(k)} className="accent-[#003088]" />
                {tr(PROVIDER_KIND[k].label)}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label={kind === 'PRESTATAIRE' ? tr('Société prestataire') : tr('Équipe / service')}>
              <input name="company" required defaultValue={intervention?.company} className={inputClass} />
            </Field>
            <Field label={tr('Responsable sur place')}>
              <input name="managerName" required defaultValue={intervention?.managerName} className={inputClass} />
            </Field>
            <Field label={tr('Téléphone')}>
              <input name="managerPhone" type="tel" defaultValue={intervention?.managerPhone ?? ''} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('Début prévu')}>
              <input name="plannedStart" type="date" required defaultValue={intervention?.plannedStart ?? siteToday()} className={inputClass} />
            </Field>
            <Field label={tr('Fin prévue')}>
              <input name="plannedEnd" type="date" required defaultValue={intervention?.plannedEnd ?? siteToday()} className={inputClass} />
            </Field>
          </div>
          <Field label={tr('Description / objectifs (optionnel)')}>
            <textarea name="description" rows={3} defaultValue={intervention?.description ?? ''} className={inputClass} />
          </Field>
          <Submit pending={pending} error={error} label={intervention ? tr('Enregistrer') : tr("Créer l'intervention")} />
        </form>
      </Modal>
    </>
  );
}

export function StatusSelect({ intervention }: { intervention: InterventionSummary }) {
  const tr = useT();
  const { pending, error, run } = useSubmit(() => undefined);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <select
        value={intervention.status}
        disabled={pending}
        onChange={(e) => void run(() => api.updateIntervention(intervention.id, { status: e.target.value as InterventionStatus }))}
        className={`cursor-pointer rounded-lg px-2 py-1 text-xs font-bold outline-none ${BADGE_TONE[INTERVENTION_STATUS[intervention.status].tone]}`}
        aria-label={tr("Statut de l'intervention")}
      >
        {(Object.keys(INTERVENTION_STATUS) as InterventionStatus[]).map((s) => (
          <option key={s} value={s} className="bg-white text-gray-900 dark:bg-slate-900 dark:text-white">
            {tr(INTERVENTION_STATUS[s].label)}
          </option>
        ))}
      </select>
      {error && <span className="text-[10px] text-red-500">{tr(error)}</span>}
    </span>
  );
}

export function MemberForm({ interventionId, defaultCompany }: { interventionId: number; defaultCompany: string }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useSubmit(() => setOpen(false));
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(() =>
      api.addMember(interventionId, {
        name: String(f.get('name')).trim(),
        role: String(f.get('role')).trim(),
        company: String(f.get('company')).trim() || undefined,
        phone: String(f.get('phone')).trim() || undefined,
      }),
    );
  };
  return (
    <>
      <button onClick={() => setOpen(true)} className={primaryBtn}>
        <UserPlus className="h-4 w-4" /> {tr('Ajouter un intervenant')}
      </button>
      <Modal open={open} title={tr('Ajouter un intervenant')} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('Nom complet')}>
              <input name="name" required className={inputClass} />
            </Field>
            <Field label={tr('Fonction')}>
              <input name="role" required list="member-roles" placeholder={tr("ex. Chef d'équipe, Agent…")} className={inputClass} />
              <datalist id="member-roles">
                {[tr("Chef d'équipe"), tr('Agent de nettoyage'), tr('Cariste'), tr('Manutentionnaire'), tr('Monteur rayonnage'), tr('Compteur inventaire'), tr('Superviseur HSE')].map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('Société')}>
              <input name="company" defaultValue={defaultCompany} className={inputClass} />
            </Field>
            <Field label={tr('Téléphone')}>
              <input name="phone" type="tel" className={inputClass} />
            </Field>
          </div>
          <Submit pending={pending} error={error} label={tr("Ajouter à l'équipe")} />
        </form>
      </Modal>
    </>
  );
}

/** Création (sans `task`) ou modification d'une tâche : intervenants et engins nécessaires */
export function TaskForm({ intervention, engins, task }: { intervention: InterventionDetail; engins: Engin[]; task?: InterventionTask }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<number[]>(task?.members.map((m) => m.id) ?? []);
  const [enginIds, setEnginIds] = useState<number[]>(task?.engins.map((e) => e.id) ?? []);
  const { pending, error, run } = useSubmit(() => setOpen(false));
  const toggle = (list: number[], id: number) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      title: String(f.get('title')).trim(),
      description: String(f.get('description')).trim() || undefined,
      plannedStart: String(f.get('plannedStart')),
      plannedEnd: String(f.get('plannedEnd')),
      memberIds: members,
      enginIds,
    };
    void run(() => (task ? api.updateTask(task.id, body) : api.addTask(intervention.id, body)));
  };

  return (
    <>
      {task ? (
        <button onClick={() => setOpen(true)} className={smallBtn}>
          <Pencil className="h-3 w-3" /> {tr('Modifier')}
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className={primaryBtn}>
          <Plus className="h-4 w-4" /> {tr('Ajouter une tâche')}
        </button>
      )}
      <Modal open={open} title={task ? tr('Modifier la tâche — {0}', task.title) : tr('Ajouter une tâche')} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <Field label={tr('Tâche')}>
            <input name="title" required defaultValue={task?.title} placeholder={tr('ex. Démontage des lisses R1')} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('Début prévu')}>
              <input name="plannedStart" type="date" required defaultValue={task?.plannedStart ?? intervention.plannedStart} className={inputClass} />
            </Field>
            <Field label={tr('Fin prévue')}>
              <input name="plannedEnd" type="date" required defaultValue={task?.plannedEnd ?? intervention.plannedEnd} className={inputClass} />
            </Field>
          </div>
          <Field label={tr('Détail (optionnel)')}>
            <textarea name="description" rows={2} defaultValue={task?.description ?? ''} className={inputClass} />
          </Field>
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-gray-700 dark:text-gray-300">{tr('Intervenants affectés')}</p>
            {intervention.members.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">{tr("Ajoutez d'abord les intervenants dans « Équipe ».")}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {intervention.members.map((m: InterventionMember) => (
                  <label
                    key={m.id}
                    className={`cursor-pointer rounded-lg border px-2 py-1 ${members.includes(m.id) ? 'border-jesa bg-jesa/10 font-semibold' : 'border-gray-200 dark:border-gray-700'}`}
                  >
                    <input type="checkbox" className="mr-1 accent-[#003088]" checked={members.includes(m.id)} onChange={() => setMembers((l) => toggle(l, m.id))} />
                    {m.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-gray-700 dark:text-gray-300">{tr('Engins nécessaires')}</p>
            {engins.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">{tr('Aucun engin dans le parc (menu « Parc engins »).')}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {engins.map((e) => (
                  <label
                    key={e.id}
                    className={`cursor-pointer rounded-lg border px-2 py-1 ${enginIds.includes(e.id) ? 'border-jesa bg-jesa/10 font-semibold' : 'border-gray-200 dark:border-gray-700'}`}
                  >
                    <input type="checkbox" className="mr-1 accent-[#003088]" checked={enginIds.includes(e.id)} onChange={() => setEnginIds((l) => toggle(l, e.id))} />
                    {e.code} {e.name}
                    {e.status !== 'DISPONIBLE' && <span className="ml-1 text-[10px] text-red-500">({tr(ENGIN_STATUS[e.status].label)})</span>}
                  </label>
                ))}
              </div>
            )}
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{tr("Un avertissement s'affiche si un engin est déjà prévu ailleurs aux mêmes dates.")}</p>
          </div>
          <Submit pending={pending} error={error} label={task ? tr('Enregistrer') : tr('Ajouter la tâche')} />
        </form>
      </Modal>
    </>
  );
}

/** Mise à jour rapide de l'avancement et du statut d'une tâche */
export function TaskQuickEdit({ task }: { task: InterventionTask }) {
  const tr = useT();
  const { pending, error, run } = useSubmit(() => undefined);
  const steps = PROGRESS_STEPS.includes(task.progress) ? PROGRESS_STEPS : [...PROGRESS_STEPS, task.progress].sort((a, b) => a - b);
  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex items-center gap-1">
        <select
          value={task.progress}
          disabled={pending}
          onChange={(e) => void run(() => api.updateTask(task.id, { progress: Number(e.target.value) }))}
          className="rounded-lg border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-bold dark:border-gray-700 dark:bg-navy-dark"
          aria-label={tr('Avancement')}
        >
          {steps.map((p) => (
            <option key={p} value={p}>
              {p} %
            </option>
          ))}
        </select>
        <select
          value={task.status}
          disabled={pending}
          onChange={(e) => void run(() => api.updateTask(task.id, { status: e.target.value as TaskStatus }))}
          className={`rounded-lg px-1.5 py-0.5 text-[10px] font-bold outline-none ${BADGE_TONE[TASK_STATUS[task.status].tone]}`}
          aria-label={tr('Statut de la tâche')}
        >
          {(Object.keys(TASK_STATUS) as TaskStatus[]).map((s) => (
            <option key={s} value={s} className="bg-white text-gray-900 dark:bg-slate-900 dark:text-white">
              {tr(TASK_STATUS[s].label)}
            </option>
          ))}
        </select>
      </span>
      {error && <span className="text-[10px] text-red-500">{tr(error)}</span>}
    </span>
  );
}

export function LogForm({ intervention }: { intervention: InterventionDetail }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState<number>(0);
  const { pending, error, run } = useSubmit(() => setOpen(false));
  const task = intervention.tasks.find((t) => t.id === taskId);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const progress = String(f.get('progressAfter'));
    void run(() =>
      api.addLog(intervention.id, {
        date: String(f.get('date')),
        description: String(f.get('description')).trim(),
        author: String(f.get('author')).trim(),
        taskId: taskId > 0 ? taskId : undefined,
        progressAfter: taskId > 0 && progress !== '' ? Number(progress) : undefined,
      }),
    );
  };
  return (
    <>
      <button onClick={() => setOpen(true)} className={primaryBtn}>
        <NotebookPen className="h-4 w-4" /> {tr('Ajouter un compte rendu')}
      </button>
      <Modal open={open} title={tr('Compte rendu des travaux exécutés')} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('Date')}>
              <input name="date" type="date" required defaultValue={siteToday()} className={inputClass} />
            </Field>
            <Field label={tr('Rédigé par')}>
              <input name="author" required defaultValue={intervention.managerName} className={inputClass} />
            </Field>
          </div>
          <Field label={tr('Tâche concernée (optionnel)')}>
            <select value={taskId} onChange={(e) => setTaskId(Number(e.target.value))} className={inputClass}>
              <option value={0}>{tr("Général (toute l'intervention)")}</option>
              {intervention.tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} {tr('(actuellement')} {t.progress} %)
                </option>
              ))}
            </select>
          </Field>
          {task && (
            <Field label={tr('Avancement atteint par la tâche')}>
              <select key={task.id} name="progressAfter" defaultValue={task.progress} className={inputClass}>
                {PROGRESS_STEPS.map((p) => (
                  <option key={p} value={p}>
                    {p} %
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label={tr('Travaux exécutés')}>
            <textarea name="description" required rows={4} placeholder={tr('ex. Démontage de 12 lisses sur R1, évacuation des palettes vides…')} className={inputClass} />
          </Field>
          <Submit pending={pending} error={error} label={tr('Enregistrer le compte rendu')} />
        </form>
      </Modal>
    </>
  );
}

export function PrintButton() {
  const tr = useT();
  return (
    <button onClick={() => window.print()} className={primaryBtn}>
      <Printer className="h-4 w-4" /> {tr('Imprimer / Enregistrer en PDF')}
    </button>
  );
}

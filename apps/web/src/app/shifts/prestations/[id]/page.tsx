import { AlertTriangle, ArrowLeft, FileSpreadsheet, FileText, History, ListChecks, Phone, Users } from 'lucide-react';
import Link from 'next/link';
import { LogForm, MemberForm, InterventionForm, StatusSelect, TaskForm, TaskQuickEdit } from '@/components/interventions/InterventionForms';
import { Card, CardTitle } from '@/components/ui/Card';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { DataTable } from '@/components/ui/DataTable';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BADGE_TONE } from '@/components/ui/tones';
import { api, apiUrl } from '@/lib/api';
import { fmtDay, fmtDayShort } from '@/lib/format';
import { ENGIN_STATUS, PROVIDER_KIND } from '@/lib/labels';
import type { InterventionMember, InterventionTask } from '@/lib/types';
import { getT } from '@/lib/i18n/server';

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <div className="text-xs font-semibold text-gray-900 dark:text-white">{children}</div>
    </div>
  );
}

export default async function InterventionPage({ params }: { params: Promise<{ id: string }> }) {
  const tr = await getT();
  const { id } = await params;
  const [i, engins, zones, options] = await Promise.all([api.intervention(Number(id)), api.engins(), api.zones(), api.interventionOptions()]);
  const warnings = i.tasks.flatMap((t) => t.warnings.map((w) => `${t.title} : ${tr(w)}`));

  return (
    <div className="space-y-5">
      <Link href="/shifts/prestations" className="inline-flex items-center gap-1 text-xs font-semibold text-jesa-light hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> {tr('Toutes les interventions')}
      </Link>

      {/* En-tête & avancement global */}
      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-mono text-xs font-bold text-jesa-light">{i.code}</p>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{i.title}</h2>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <StatusBadge tone={PROVIDER_KIND[i.providerKind].tone} label={tr(PROVIDER_KIND[i.providerKind].label)} shape="tag" />
              <StatusBadge tone="gray" label={i.workType} shape="tag" />
              {i.late && <StatusBadge tone="red" label={tr('En retard sur la fin prévue')} icon={AlertTriangle} />}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusSelect intervention={i} />
            <Link
              href={`/shifts/prestations/${i.id}/rapport`}
              className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 hover:border-jesa dark:border-gray-700 dark:bg-navy-dark dark:text-gray-200"
            >
              <FileText className="h-4 w-4 text-red-500" /> {tr('Rapport PDF')}
            </Link>
            <a
              href={apiUrl(`/interventions/${i.id}/export.xlsx`)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 hover:border-jesa dark:border-gray-700 dark:bg-navy-dark dark:text-gray-200"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" /> {tr('Excel')}
            </a>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {tr('Avancement global ·')} {i.doneTasks}/{i.taskCount} {tr('tâche(s) terminée(s)')}
            </span>
            <strong className="text-lg text-gray-900 dark:text-white">{i.progress} %</strong>
          </div>
          <ProgressBar value={i.progress} late={i.late} size="lg" />
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4 dark:border-gray-800 md:grid-cols-4">
          <Info label={i.providerKind === 'PRESTATAIRE' ? tr('Société') : tr('Équipe')}>{i.company}</Info>
          <Info label={tr('Responsable sur place')}>
            {i.managerName}
            {i.managerPhone && (
              <span className="flex items-center gap-1 font-normal text-gray-500 dark:text-gray-400">
                <Phone className="h-3 w-3" /> {i.managerPhone}
              </span>
            )}
          </Info>
          <Info label={tr('Zone du magasin')}>{i.zone?.name ?? tr('Plusieurs / non précisée')}</Info>
          <Info label={tr('Période prévue')}>
            {fmtDay(i.plannedStart)} → {fmtDay(i.plannedEnd)}
          </Info>
          <Info label={tr('Démarrage réel')}>{i.actualStart ? fmtDay(i.actualStart) : '—'}</Info>
          <Info label={tr('Fin réelle')}>{i.actualEnd ? fmtDay(i.actualEnd) : '—'}</Info>
          <div className="col-span-2">
            <Info label={tr('Description')}>{i.description ? <span className="font-normal">{i.description}</span> : '—'}</Info>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
          <InterventionForm intervention={i} zones={zones} workTypes={options.workTypes} />
          <ConfirmButton deletePath={`/interventions/${i.id}`} label={tr("Supprimer l'intervention")} redirectTo="/shifts/prestations" />
        </div>
      </Card>

      {warnings.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/60 bg-amber-50 p-4 text-xs dark:bg-amber-900/20">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-200">{tr("Conflits d'engins à vérifier")}</p>
            <ul className="mt-1 list-inside list-disc text-gray-700 dark:text-gray-300">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tâches */}
      <Card padding="lg" className="space-y-3">
        <CardTitle icon={<ListChecks className="h-4 w-4 text-jesa-light" />} aside={<TaskForm intervention={i} engins={engins} />}>
          {tr('Tâches (')}{i.taskCount})
        </CardTitle>
        <DataTable<InterventionTask>
          rows={i.tasks}
          rowKey={(t) => t.id}
          empty={tr("Aucune tâche : découpez les travaux en tâches pour suivre l'avancement.")}
          columns={[
            {
              key: 'title',
              header: tr('Tâche'),
              render: (t) => (
                <>
                  <span className="font-bold text-gray-900 dark:text-white">{t.title}</span>
                  {t.description && <span className="block text-[10px] text-gray-500 dark:text-gray-400">{t.description}</span>}
                </>
              ),
            },
            {
              key: 'dates',
              header: tr('Prévu'),
              className: 'whitespace-nowrap',
              render: (t) => (
                <span className={t.late ? 'font-bold text-red-500' : ''}>
                  {fmtDayShort(t.plannedStart)} → {fmtDayShort(t.plannedEnd)}
                  {t.late && <span className="block text-[10px]">{tr('en retard')}</span>}
                </span>
              ),
            },
            {
              key: 'who',
              header: tr('Intervenants'),
              className: 'text-gray-700 dark:text-gray-300',
              render: (t) => (t.members.length ? t.members.map((m) => m.name).join(', ') : <span className="text-gray-400">—</span>),
            },
            {
              key: 'engins',
              header: tr('Engins'),
              render: (t) =>
                t.engins.length ? (
                  <div className="flex flex-wrap gap-1">
                    {t.engins.map((e) => (
                      <span
                        key={e.id}
                        title={tr(ENGIN_STATUS[e.status].label)}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${e.status === 'DISPONIBLE' ? BADGE_TONE.gray : BADGE_TONE.red}`}
                      >
                        {e.code} {e.name}
                      </span>
                    ))}
                    {t.warnings.length > 0 && (
                      <span title={t.warnings.map((w) => tr(w)).join("\n")} className="text-[10px] font-bold text-amber-500">
                        {tr('⚠ conflit')}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                ),
            },
            {
              key: 'progress',
              header: tr('Avancement'),
              className: 'min-w-[150px]',
              render: (t) => (
                <div className="space-y-1">
                  <ProgressBar value={t.progress} late={t.late} size="sm" />
                  <TaskQuickEdit task={t} />
                </div>
              ),
            },
            {
              key: 'act',
              header: '',
              render: (t) => (
                <div className="flex justify-end gap-1">
                  <TaskForm intervention={i} engins={engins} task={t} />
                  <ConfirmButton deletePath={`/intervention-tasks/${t.id}`} />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Équipe */}
      <Card padding="lg" className="space-y-3">
        <CardTitle icon={<Users className="h-4 w-4 text-jesa-light" />} aside={<MemberForm interventionId={i.id} defaultCompany={i.company} />}>
          {tr('Équipe (')}{i.memberCount})
        </CardTitle>
        <DataTable<InterventionMember>
          rows={i.members}
          rowKey={(m) => m.id}
          empty={tr('Aucun intervenant enregistré.')}
          columns={[
            { key: 'name', header: tr('Nom'), className: 'font-bold text-gray-900 dark:text-white', render: (m) => m.name },
            { key: 'role', header: tr('Fonction'), className: 'text-gray-700 dark:text-gray-300', render: (m) => tr(m.role) },
            { key: 'company', header: tr('Société'), className: 'text-gray-600 dark:text-gray-300', render: (m) => m.company ?? i.company },
            { key: 'phone', header: tr('Téléphone'), className: 'font-mono text-gray-600 dark:text-gray-300', render: (m) => m.phone ?? '—' },
            { key: 'tasks', header: tr('Tâches'), render: (m) => m.taskCount },
            {
              key: 'act',
              header: '',
              render: (m) => (
                <div className="flex justify-end">
                  <ConfirmButton deletePath={`/intervention-members/${m.id}`} label={tr('Retirer')} />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Journal */}
      <Card padding="lg" className="space-y-3">
        <CardTitle icon={<History className="h-4 w-4 text-jesa-light" />} aside={<LogForm intervention={i} />}>
          {tr('Journal des travaux exécutés (')}{i.logs.length})
        </CardTitle>
        {i.logs.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">{tr("Aucun compte rendu. Ajoutez chaque jour les travaux réalisés : ils alimentent le rapport d'avancement.")}</p>
        ) : (
          <ol className="space-y-2">
            {i.logs.map((l) => (
              <li key={l.id} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-800 dark:bg-navy-dark">
                <div className="w-20 flex-shrink-0 font-bold text-gray-900 dark:text-white">{fmtDay(l.date)}</div>
                <div className="flex-1 space-y-1">
                  <p className="whitespace-pre-line text-gray-800 dark:text-gray-200">{l.description}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {l.author}
                    {l.task && ` · ${l.task.title}`}
                    {l.progressAfter !== null && ` → ${l.progressAfter} %`}
                  </p>
                </div>
                <ConfirmButton deletePath={`/work-logs/${l.id}`} />
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

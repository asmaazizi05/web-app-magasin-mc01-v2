import { AlertTriangle, CalendarRange, HardHat, ListChecks, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { InterventionForm } from '@/components/interventions/InterventionForms';
import { KpiCard } from '@/components/ui/KpiCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api } from '@/lib/api';
import { fmtDay } from '@/lib/format';
import { INTERVENTION_STATUS, PROVIDER_KIND } from '@/lib/labels';
import type { InterventionStatus } from '@/lib/types';
import { getT } from '@/lib/i18n/server';

const FILTERS: (InterventionStatus | 'ALL')[] = ['ALL', 'EN_COURS', 'PLANIFIEE', 'SUSPENDUE', 'TERMINEE', 'CLOTUREE'];

export default async function PrestationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const tr = await getT();
  const { status: raw } = await searchParams;
  const status = (Object.keys(INTERVENTION_STATUS) as InterventionStatus[]).find((s) => s === raw);
  const [all, zones, options] = await Promise.all([api.interventions(), api.zones(), api.interventionOptions()]);
  const list = status ? all.filter((i) => i.status === status) : all;
  const active = all.filter((i) => i.status === 'EN_COURS' || i.status === 'PLANIFIEE' || i.status === 'SUSPENDUE');
  const avg = active.length ? Math.round(active.reduce((s, i) => s + i.progress, 0) / active.length) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr('Équipes Support & Prestations')}
        subtitle={tr('Suivi de A à Z des équipes externes ou support (nettoyage, réimplantation, inventaire…) : équipe, tâches, engins, avancement et comptes rendus.')}
        actions={<InterventionForm zones={zones} workTypes={options.workTypes} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={tr('En cours')} value={String(all.filter((i) => i.status === 'EN_COURS').length)} icon={HardHat} tone="jesa" />
        <KpiCard label={tr('Planifiées')} value={String(all.filter((i) => i.status === 'PLANIFIEE').length)} icon={CalendarRange} tone="blue" />
        <KpiCard label={tr('En retard')} value={String(all.filter((i) => i.late).length)} hint={tr('Fin prévue dépassée')} icon={AlertTriangle} tone={all.some((i) => i.late) ? 'red' : 'gray'} />
        <KpiCard label={tr('Avancement moyen')} value={`${avg} %`} hint={tr('Interventions actives')} icon={ListChecks} tone="purple" gauge={avg} />
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-xl border border-gray-300 bg-gray-100 p-1 text-xs dark:border-gray-700 dark:bg-navy-dark">
        {FILTERS.map((f) => {
          const on = (f === 'ALL' && !status) || f === status;
          const count = f === 'ALL' ? all.length : all.filter((i) => i.status === f).length;
          return (
            <Link
              key={f}
              href={f === 'ALL' ? '/shifts/prestations' : `/shifts/prestations?status=${f}`}
              className={`rounded-lg px-3 py-1 transition ${on ? 'bg-jesa font-bold text-white shadow' : 'font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}
            >
              {f === 'ALL' ? tr('Toutes') : tr(INTERVENTION_STATUS[f].label)} ({count})
            </Link>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 p-10 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {tr('Aucune intervention')}{status ? tr(' avec ce statut') : ''}{tr(". Cliquez sur « Nouvelle intervention » pour enregistrer l'arrivée d'une équipe.")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {list.map((i) => (
            <Link
              key={i.id}
              href={`/shifts/prestations/${i.id}`}
              className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-jesa dark:border-gray-800 dark:bg-navy-light"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-bold text-jesa-light">{i.code}</p>
                  <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{i.title}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {i.workType} · {i.company}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge tone={INTERVENTION_STATUS[i.status].tone} label={tr(INTERVENTION_STATUS[i.status].label)} />
                  {i.late && <StatusBadge tone="red" label={tr('En retard')} icon={AlertTriangle} />}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-600 dark:text-gray-300">
                    {i.doneTasks}/{i.taskCount} {tr('tâche(s) terminée(s)')}
                  </span>
                  <strong className="text-gray-900 dark:text-white">{i.progress} %</strong>
                </div>
                <ProgressBar value={i.progress} late={i.late} />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <CalendarRange className="h-3 w-3" /> {fmtDay(i.plannedStart)} → {fmtDay(i.plannedEnd)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {i.memberCount} {tr('intervenant(s)')}
                </span>
                {i.zone && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {i.zone.name}
                  </span>
                )}
                <StatusBadge tone={PROVIDER_KIND[i.providerKind].tone} label={tr(PROVIDER_KIND[i.providerKind].label)} shape="tag" weight="semibold" />
                {i.warningCount > 0 && <span className="font-semibold text-amber-500">⚠ {i.warningCount} {tr("conflit(s) d'engin")}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

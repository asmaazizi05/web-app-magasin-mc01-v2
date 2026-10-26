import { AlertTriangle, CheckCircle2, Forklift, Gauge, Wrench } from 'lucide-react';
import Link from 'next/link';
import { PillGroup } from '@/components/ui/PillGroup';
import { DueBadge } from '@/components/engins/DueBadge';
import { LoadDemoButton } from '@/components/engins/ChecklistEditor';
import { EnginForm } from '@/components/engins/EnginForm';
import { SelectableCard, SelectionDelete, SelectionDeleteBar, SelectToDeleteButton } from '@/components/ui/SelectionDelete';
import { KpiCard } from '@/components/ui/KpiCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api, apiUrl } from '@/lib/api';
import { fmtDay, fmtInt } from '@/lib/format';
import { ENGIN_STATUS } from '@/lib/labels';
import { getT } from '@/lib/i18n/server';

export default async function EnginsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const tr = await getT();
  const { type } = await searchParams;
  const [engins, habilitationTypes, options, settings] = await Promise.all([api.engins(), api.habilitationTypes(), api.enginOptions(), api.settings()]);
  const types = [...new Set(engins.map((e) => e.type))].sort();
  const list = type ? engins.filter((e) => e.type === type) : engins;
  const alerts = engins.flatMap((e) => e.alerts);
  const critical = alerts.filter((a) => a.severity === 'critique');
  const demoCount = engins.filter((e) => e.isDemo).length;

  return (
    <SelectionDelete>
    <div className="space-y-5">
      <PageHeader
        title={tr('Parc Engins — Suivi & Maintenance')}
        subtitle={tr('Chariots élévateurs, gerbeurs, nacelles… : caractéristiques techniques, entretiens, contrôles périodiques, pannes et check-lists de prise de poste.')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {demoCount === 0 && <LoadDemoButton />}
            <EnginForm habilitationTypes={habilitationTypes} options={options} defaultInspectionMonths={settings.enginInspectionMonths} />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={tr('Engins au parc')} value={String(engins.length)} icon={Forklift} tone="jesa" />
        <KpiCard label={tr('Disponibles')} value={String(engins.filter((e) => e.status === 'DISPONIBLE').length)} icon={CheckCircle2} tone="green" />
        <KpiCard
          label={tr('En panne / maintenance')}
          value={String(engins.filter((e) => e.status === 'EN_PANNE' || e.status === 'MAINTENANCE').length)}
          icon={Wrench}
          tone={engins.some((e) => e.status === 'EN_PANNE') ? 'red' : 'amber'}
        />
        <KpiCard label={tr('Alertes')} value={String(alerts.length)} hint={tr('{0} critique(s)', critical.length)} icon={AlertTriangle} tone={critical.length ? 'red' : alerts.length ? 'amber' : 'gray'} />
      </div>

      {alerts.length > 0 && (
        <div className="space-y-1.5 rounded-2xl border border-amber-500/60 bg-amber-50 p-4 text-xs dark:bg-amber-900/20">
          <p className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> {tr('Points à traiter')}
          </p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {alerts.map((a) => (
              <li key={`${a.enginId}-${a.message}`}>
                <Link href={`/shifts/engins/${a.enginId}`} className={`hover:underline ${a.severity === 'critique' ? 'font-semibold text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {a.code} {a.name} — {tr(a.message)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {types.length > 1 && (
        <PillGroup className="flex flex-wrap gap-1.5 rounded-xl border border-gray-300 bg-gray-100 p-1 text-xs dark:border-gray-700 dark:bg-navy-dark">
          {[undefined, ...types].map((t) => {
            const on = t === type;
            return (
              <Link
                key={t ?? 'all'}
                href={t ? `/shifts/engins?type=${encodeURIComponent(t)}` : '/shifts/engins'}
                data-active={on}
                className={`rounded-lg px-3 py-1 transition ${on ? 'bg-jesa font-bold text-white shadow' : 'font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}
              >
                {t ? tr(t) : tr('Tous')} ({t ? engins.filter((e) => e.type === t).length : engins.length})
              </Link>
            );
          })}
        </PillGroup>
      )}

      {/* Sélection pour suppression : sous les KPIs et les points à traiter, juste au-dessus de la liste */}
      {list.length > 0 && <SelectToDeleteButton label={tr('Sélectionner des engins à supprimer')} />}
      <SelectionDeleteBar
        items={list.map((e) => ({ id: e.id, code: e.code }))}
        basePath="/engins"
        hint={tr('Cochez les engins à supprimer.')}
        note={tr("La suppression est définitive : la fiche, l'historique de maintenance et les check-lists de l'engin sont effacés.")}
      />

      {list.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 p-10 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {tr('Aucun engin. Cliquez sur « Ajouter un engin » pour créer la première fiche.')}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <SelectableCard key={e.id} id={e.id} label={`${e.code} ${e.name}`}>
            <Link
              href={`/shifts/engins/${e.id}`}
              className="block h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-jesa dark:border-gray-800 dark:bg-navy-light"
            >
              <div className="flex gap-3 p-4">
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 dark:bg-navy-dark">
                  {e.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={apiUrl(e.photoUrl)} alt={e.name} className="h-full w-full object-cover" />
                  ) : (
                    <Forklift className="h-9 w-9 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-[10px] font-bold text-jesa-light">{e.code}{e.isDemo && <span className="ml-1.5 rounded bg-gray-200 px-1 text-[9px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">{tr('DÉMO')}</span>}</p>
                    <StatusBadge tone={ENGIN_STATUS[e.status].tone} label={tr(ENGIN_STATUS[e.status].label)} className="text-[10px]" />
                  </div>
                  <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{e.name}</p>
                  <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                    {tr(e.type)}
                    {e.brand ? ` · ${e.brand}` : ''}
                    {e.model ? ` ${e.model}` : ''}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {e.ownership === 'LOCATION' ? `${tr('Location : {0}', e.rentalCompany ?? '—')}${e.rentalEndDate ? tr(' (fin {0})', fmtDay(e.rentalEndDate)) : ''}` : tr('Propriété : {0}', e.ownerService ?? '—')}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-gray-100 px-4 py-3 text-[10px] dark:border-gray-800">
                <div>
                  <p className="flex items-center gap-1 font-bold uppercase text-gray-500 dark:text-gray-400">
                    <Gauge className="h-3 w-3" /> {tr('Compteur')}
                  </p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{e.hourMeter !== null ? `${fmtInt(e.hourMeter)} h` : '—'}</p>
                </div>
                <div>
                  <p className="font-bold uppercase text-gray-500 dark:text-gray-400">{tr('Entretien')}</p>
                  <DueBadge status={e.nextService.status} />
                  {e.nextService.date && <p className="text-gray-500">{fmtDay(e.nextService.date)}</p>}
                </div>
                <div>
                  <p className="font-bold uppercase text-gray-500 dark:text-gray-400">{tr('Contrôle')}</p>
                  <DueBadge status={e.nextInspection.status} />
                  {e.nextInspection.date && <p className="text-gray-500">{fmtDay(e.nextInspection.date)}</p>}
                </div>
              </div>
            </Link>
            </SelectableCard>
          ))}
        </div>
      )}
    </div>
    </SelectionDelete>
  );
}

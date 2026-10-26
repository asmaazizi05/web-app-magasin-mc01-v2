import { AlertOctagon, ArrowLeft, ClipboardCheck, FileText, Forklift, Gauge, History, ListChecks, Settings2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BreakdownButton, CheckForm, CloseIssueButton, MaintenanceForm, StatusToggle } from '@/components/engins/EnginActions';
import { ChecklistEditor } from '@/components/engins/ChecklistEditor';
import { DueBadge } from '@/components/engins/DueBadge';
import { EnginForm } from '@/components/engins/EnginForm';
import { Card, CardTitle } from '@/components/ui/Card';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { DataTable } from '@/components/ui/DataTable';
import { KpiCard } from '@/components/ui/KpiCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api, apiUrl } from '@/lib/api';
import { fmtDate, fmtDay, fmtDayShort, fmtDH, fmtInt, fmtPct, fmtTime } from '@/lib/format';
import { ENGIN_STATUS, MAINTENANCE_TYPE } from '@/lib/labels';
import type { EnginCheck, MaintenanceRecord } from '@/lib/types';
import { getT } from '@/lib/i18n/server';

function Spec({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-xs font-semibold text-gray-900 dark:text-white">{value}</dd>
    </div>
  );
}

const unit = (v: number | null, u: string) => (v === null ? null : `${fmtInt(v)} ${u}`);
const meters = (v: number | null) => (v === null ? null : `${String(v).replace('.', ',')} m`);

export default async function EnginPage({ params }: { params: Promise<{ id: string }> }) {
  const tr = await getT();
  const { id } = await params;
  const [e, habilitationTypes, options, storekeepers] = await Promise.all([api.engin(Number(id)), api.habilitationTypes(), api.enginOptions(), api.storekeepers()]);
  const open = e.maintenance.filter((m) => m.endDate === null && m.type !== 'CONTROLE_PERIODIQUE');

  return (
    <div className="space-y-5">
      <Link href="/shifts/engins" className="inline-flex items-center gap-1 text-xs font-semibold text-jesa-light hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> {tr('Tout le parc engins')}
      </Link>

      {/* En-tête */}
      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap gap-5">
          <div className="flex h-36 w-36 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gray-100 dark:bg-navy-dark">
            {e.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={apiUrl(e.photoUrl)} alt={e.name} className="h-full w-full object-cover" />
            ) : (
              <Forklift className="h-14 w-14 text-gray-400" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-jesa-light">{e.code}</span>
              {e.isDemo && <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">{tr('Donnée de démo')}</span>}
              <StatusBadge tone={ENGIN_STATUS[e.status].tone} label={tr(ENGIN_STATUS[e.status].label)} className="text-xs" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{e.name}</h2>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {tr(e.type)}
              {e.brand ? ` · ${e.brand}` : ''}
              {e.model ? ` ${e.model}` : ''}
              {e.commissioningYear ? tr(' · mis en service en {0}', e.commissioningYear) : ''}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {e.ownership === 'LOCATION' ? (
                <>
                  {tr('En location chez')} <strong>{e.rentalCompany ?? '—'}</strong>
                  {e.rentalEndDate ? tr(" jusqu'au {0}", fmtDay(e.rentalEndDate)) : ''} {e.rental && <DueBadge status={e.rental.status} />}
                </>
              ) : (
                <>
                  {tr('Propriété :')} <strong>{e.ownerService ?? tr('service non renseigné')}</strong>
                </>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {e.status !== 'EN_PANNE' && <BreakdownButton engin={e} />}
              {open[0] && <CloseIssueButton recordId={open[0].id} />}
              <CheckForm engin={e} storekeepers={storekeepers} />
              <StatusToggle engin={e} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
          <EnginForm engin={e} habilitationTypes={habilitationTypes} options={options} />
          <ConfirmButton deletePath={`/engins/${e.id}`} label={tr("Supprimer l'engin")} redirectTo="/shifts/engins" />
        </div>
      </Card>

      {open.map((m) => (
        <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-red-500/70 bg-red-50 p-4 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <AlertOctagon className="h-6 w-6 flex-shrink-0 text-red-500" />
            <div className="text-xs">
              <p className="font-bold text-red-900 dark:text-red-200">
                {tr(MAINTENANCE_TYPE[m.type].label)} {tr('en cours depuis le')} {fmtDay(m.date)} ({m.downtimeDays ?? 0} {tr("j d'immobilisation)")}
              </p>
              <p className="text-gray-700 dark:text-gray-300">{m.description}</p>
            </div>
          </div>
          <CloseIssueButton recordId={m.id} />
        </div>
      ))}

      {/* Indicateurs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label={tr('Disponibilité (90 j)')}
          value={fmtPct(e.kpis.availability90)}
          hint={tr("{0} j d'immobilisation", e.kpis.downtimeDays90)}
          icon={ShieldCheck}
          tone={e.kpis.availability90 >= 95 ? 'green' : e.kpis.availability90 >= 85 ? 'amber' : 'red'}
          gauge={e.kpis.availability90}
        />
        <KpiCard label={tr('Pannes (12 mois)')} value={String(e.kpis.breakdowns12m)} icon={AlertOctagon} tone={e.kpis.breakdowns12m ? 'red' : 'green'} />
        <KpiCard label={tr('Coût maintenance (12 mois)')} value={fmtDH(e.kpis.cost12m)} hint={tr('Total : {0}', fmtDH(e.kpis.costTotal))} icon={Settings2} tone="purple" />
        <KpiCard
          label={tr("Compteur d'heures")}
          value={e.hourMeter !== null ? `${fmtInt(e.hourMeter)} h` : '—'}
          hint={e.hourMeterAt ? tr('Relevé le {0}', fmtDay(e.hourMeterAt)) : tr('Aucun relevé')}
          icon={Gauge}
          tone="blue"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Échéances */}
        <Card padding="lg" className="space-y-3">
          <CardTitle icon={<ListChecks className="h-4 w-4 text-jesa-light" />}>{tr('Échéances')}</CardTitle>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-navy-dark">
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{tr('Entretien préventif')}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {e.serviceIntervalHours || e.serviceIntervalMonths
                    ? tr('Tous les {0}', [e.serviceIntervalHours ? `${fmtInt(e.serviceIntervalHours)} h` : null, e.serviceIntervalMonths ? tr('{0} mois', e.serviceIntervalMonths) : null].filter(Boolean).join(tr(' ou ')))
                    : tr('Aucun plan défini (« Modifier la fiche »)')}
                  {e.lastServiceDate ? tr(' · dernier le {0}{1}', fmtDay(e.lastServiceDate), e.lastServiceHours !== null ? tr(' à {0} h', fmtInt(e.lastServiceHours)) : '') : ''}
                </p>
                {(e.nextService.date || e.nextService.hours !== null) && (
                  <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                    {tr('Prochain :')} {[e.nextService.date ? fmtDay(e.nextService.date) : null, e.nextService.hours !== null ? `${fmtInt(e.nextService.hours)} h` : null].filter(Boolean).join(' ou ')}
                  </p>
                )}
              </div>
              <DueBadge status={e.nextService.status} />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-navy-dark">
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{tr('Contrôle périodique (organisme agréé)')}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {tr('Tous les')} {e.inspectionIntervalMonths} {tr('mois')}{e.lastInspectionDate ? tr(' · dernier le {0}', fmtDay(e.lastInspectionDate)) : tr(' · aucun contrôle enregistré')}
                </p>
                {e.nextInspection.date && <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{tr('Prochain :')} {fmtDay(e.nextInspection.date)}</p>}
              </div>
              <DueBadge status={e.nextInspection.status} />
            </div>
            {e.rental && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-navy-dark">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{tr('Fin de location')}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {e.rentalEndDate ? fmtDay(e.rentalEndDate) : '—'} ({e.rental.daysLeft >= 0 ? tr('dans {0} j', e.rental.daysLeft) : tr('dépassée de {0} j', -e.rental.daysLeft)})
                  </p>
                </div>
                <DueBadge status={e.rental.status} />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <MaintenanceForm engin={e} inspectionResults={options.inspectionResults} />
            <MaintenanceForm engin={e} inspectionResults={options.inspectionResults} defaultType="CONTROLE_PERIODIQUE" />
          </div>
        </Card>

        {/* Caractéristiques techniques */}
        <Card padding="lg" className="space-y-3">
          <CardTitle icon={<Settings2 className="h-4 w-4 text-jesa-light" />}>{tr('Caractéristiques techniques')}</CardTitle>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Spec label={tr('Type')} value={tr(e.type)} />
            <Spec label={tr('Marque / modèle')} value={[e.brand, e.model].filter(Boolean).join(' ') || null} />
            <Spec label={tr('N° de série')} value={e.serialNumber} />
            <Spec label={tr('Immat. / n° de parc')} value={e.reference} />
            <Spec label={tr('Énergie')} value={e.energy ? tr(e.energy) : e.energy} />
            <Spec label={tr('Capacité de charge')} value={unit(e.capacityKg, 'kg')} />
            <Spec label={tr('Poids à vide')} value={unit(e.weightKg, 'kg')} />
            <Spec label={e.family === 'PONT' ? tr('Hauteur de levage') : tr('Hauteur de levée')} value={meters(e.liftHeightM)} />
            <Spec label={tr('Hauteur de travail')} value={meters(e.workingHeightM)} />
            <Spec label={tr('Longueur fourches')} value={unit(e.forkLengthMm, 'mm')} />
            <Spec label={tr('Personnes max.')} value={e.maxPersons} />
            <Spec label={tr('Batterie')} value={e.batteryVoltage || e.batteryCapacityAh ? [unit(e.batteryVoltage, 'V'), unit(e.batteryCapacityAh, 'Ah')].filter(Boolean).join(' · ') : null} />
            <Spec label={tr('Utilisation')} value={e.usage ? tr(e.usage) : e.usage} />
            <Spec label={tr('Dimensions')} value={e.dimensions} />
            <Spec label={tr('Habilitation requise')} value={e.requiredHabilitation ?? 'Aucune'} />
          </dl>
          {e.notes && <p className="whitespace-pre-line rounded-lg bg-gray-50 p-2 text-xs text-gray-700 dark:bg-navy-dark dark:text-gray-300">{e.notes}</p>}
        </Card>
      </div>

      {/* Historique maintenance */}
      <Card padding="lg" className="space-y-3">
        <CardTitle icon={<History className="h-4 w-4 text-jesa-light" />}>{tr('Historique de maintenance (')}{e.maintenance.length})</CardTitle>
        <DataTable<MaintenanceRecord>
          rows={e.maintenance}
          rowKey={(m) => m.id}
          empty={tr('Aucune intervention enregistrée.')}
          columns={[
            {
              key: 'date',
              header: tr('Date'),
              className: 'whitespace-nowrap font-semibold text-gray-900 dark:text-white',
              render: (m) => (
                <>
                  {fmtDay(m.date)}
                  {m.type !== 'CONTROLE_PERIODIQUE' && (
                    <span className="block text-[10px] font-normal text-gray-500">{m.endDate ? `→ ${fmtDayShort(m.endDate)}` : tr('en cours')}</span>
                  )}
                </>
              ),
            },
            { key: 'type', header: tr('Type'), render: (m) => <StatusBadge tone={MAINTENANCE_TYPE[m.type].tone} label={tr(MAINTENANCE_TYPE[m.type].label)} /> },
            {
              key: 'desc',
              header: tr('Description'),
              render: (m) => (
                <>
                  <span className="text-gray-800 dark:text-gray-200">{m.description}</span>
                  {m.partsReplaced && <span className="block text-[10px] text-gray-500">{tr('Pièces :')} {m.partsReplaced}</span>}
                  {m.result && (
                    <span className={`block text-[10px] font-bold ${m.result === 'Conforme' ? 'text-green-600' : m.result === 'Non conforme' ? 'text-red-600' : 'text-amber-600'}`}>{tr(m.result)}</span>
                  )}
                </>
              ),
            },
            { key: 'meter', header: tr('Compteur'), className: 'whitespace-nowrap', render: (m) => (m.hourMeter !== null ? `${fmtInt(m.hourMeter)} h` : '—') },
            { key: 'down', header: tr('Immobil.'), className: 'whitespace-nowrap', render: (m) => (m.downtimeDays !== null ? `${m.downtimeDays} j` : '—') },
            { key: 'cost', header: tr('Coût'), className: 'whitespace-nowrap', render: (m) => (m.cost !== null ? fmtDH(m.cost) : '—') },
            { key: 'prov', header: tr('Intervenant'), className: 'text-gray-600 dark:text-gray-300', render: (m) => m.provider ?? '—' },
            {
              key: 'doc',
              header: tr('Doc.'),
              render: (m) =>
                m.documentUrl ? (
                  <a href={apiUrl(m.documentUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-jesa-light hover:underline" title={m.documentName ?? undefined}>
                    <FileText className="h-3.5 w-3.5" /> {tr('Voir')}
                  </a>
                ) : (
                  <span className="text-gray-400">—</span>
                ),
            },
            {
              key: 'act',
              header: '',
              render: (m) => (
                <div className="flex justify-end gap-1">
                  {m.endDate === null && m.type !== 'CONTROLE_PERIODIQUE' && <CloseIssueButton recordId={m.id} compact />}
                  <ConfirmButton deletePath={`/maintenance/${m.id}`} />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Check-lists */}
      <Card padding="lg" className="space-y-3">
        <CardTitle
          icon={<ClipboardCheck className="h-4 w-4 text-jesa-light" />}
          aside={
            <div className="flex flex-wrap items-center gap-2">
              <ChecklistEditor engin={e} />
              <CheckForm engin={e} storekeepers={storekeepers} />
            </div>
          }
        >
          {tr('Check-lists de prise de poste (')}{e.checks.length})
        </CardTitle>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          {e.checklistCustom ? tr('Check-list personnalisée pour cet engin') : tr('Liste type de ce genre d’engin (modifiable)')} : {e.checklist.map((c) => tr(c.label)).join(' · ')}.
        </p>
        <DataTable<EnginCheck>
          rows={e.checks}
          rowKey={(c) => c.id}
          dense
          empty={tr('Aucune check-list enregistrée.')}
          columns={[
            {
              key: 'date',
              header: tr('Date'),
              className: 'whitespace-nowrap font-semibold text-gray-900 dark:text-white',
              render: (c) => (
                <>
                  {fmtDate(c.date)} <span className="text-[10px] text-gray-400">{fmtTime(c.date)}</span>
                </>
              ),
            },
            { key: 'op', header: tr('Conducteur'), render: (c) => c.operatorName },
            { key: 'meter', header: tr('Compteur'), render: (c) => (c.hourMeter !== null ? `${fmtInt(c.hourMeter)} h` : '—') },
            {
              key: 'res',
              header: tr('Résultat'),
              render: (c) =>
                c.allOk ? (
                  <StatusBadge tone="green" label={tr('Conforme')} />
                ) : (
                  <>
                    <StatusBadge tone="red" label={tr('{0} anomalie(s)', c.failed.length)} />
                    <span className="block text-[10px] text-red-600 dark:text-red-400">{c.failed.join(', ')}</span>
                  </>
                ),
            },
            { key: 'com', header: tr('Commentaire'), className: 'text-gray-600 dark:text-gray-300', render: (c) => c.comment ?? '—' },
            { key: 'act', header: '', render: (c) => <div className="flex justify-end"><ConfirmButton deletePath={`/engin-checks/${c.id}`} /></div> },
          ]}
        />
      </Card>

      {e.activeTasks.length > 0 && (
        <Card padding="lg" className="space-y-2">
          <CardTitle>{tr('Réservé sur des travaux (équipes support / prestataires)')}</CardTitle>
          <ul className="space-y-1 text-xs">
            {e.activeTasks.map((t) => (
              <li key={t.taskId}>
                <Link href={`/shifts/prestations/${t.interventionId}`} className="text-jesa-light hover:underline">
                  {t.interventionCode} · {t.title}
                </Link>{' '}
                <span className="text-gray-500">
                  ({fmtDayShort(t.plannedStart)} → {fmtDayShort(t.plannedEnd)})
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

import { ArrowDownToLine, ArrowRightLeft, ArrowUpFromLine, CalendarCheck } from 'lucide-react';
import { MovementHistory } from '@/components/MovementHistory';
import { Card, CardTitle } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api } from '@/lib/api';
import { fmtDate, fmtDayMonth, fmtInt, fmtMonthYear, fmtPct, siteYearMonth } from '@/lib/format';
import { AUDIT_STATUS } from '@/lib/labels';
import type { Audit } from '@/lib/types';
import { useT } from '@/lib/i18n';
import { getLang, getT } from '@/lib/i18n/server';

function auditStatusLabel(a: Audit): string {
  const tr = useT();
  if (a.status === 'TERMINE') return tr('100% Terminé ({0} Écart{1})', a.discrepancies, a.discrepancies > 1 ? 's' : '');
  if (a.status === 'PLANIFIE') return tr('Planifié (Démarrage {0})', fmtDayMonth(a.startDate));
  return tr('A Venir');
}

export default async function InventairePage() {
  const tr = await getT();
  const now = new Date();
  const { year, month } = siteYearMonth(now);
  const [summary, movements, audits, kpis] = await Promise.all([api.movementSummary(), api.movements(), api.audits(year, month), api.inventoryKpis()]);
  const monthLabel = fmtMonthYear(now, (await getLang()) === 'en' ? 'en-GB' : 'fr-FR');

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr('Inventaire & Audits Tournants (Planning {0})', monthLabel)}
        subtitle={tr('Programme daté de contrôle physique contradictoire du stock (IRA) et historique complet des mouvements.')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label={tr('Total Entrées')} value={tr('+{0} unités', fmtInt(summary.entries))} hint={tr('{0} bons de réception (BR)', summary.entryDocuments)} icon={ArrowDownToLine} tone="green" />
        <KpiCard label={tr('Total Sorties')} value={tr('−{0} unités', fmtInt(summary.exits))} hint={tr('{0} bons de sortie (BS)', summary.exitDocuments)} icon={ArrowUpFromLine} tone="blue" />
        <KpiCard
          label={tr('Flux Net')}
          value={tr('{0}{1} unités', summary.net >= 0 ? '+' : '−', fmtInt(Math.abs(summary.net)))}
          hint={tr("Entrées − Sorties sur l'historique")}
          icon={ArrowRightLeft}
          tone={summary.net >= 0 ? 'jesa' : 'red'}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card padding="lg" className="space-y-3">
          <CardTitle icon={<CalendarCheck className="h-4 w-4 text-jesa-light" />}>{tr('Planning Hebdomadaire des Audits (')}{monthLabel})</CardTitle>
          <div className="space-y-2 text-xs">
            {audits.length === 0 && <p className="text-gray-500 dark:text-gray-400">{tr('Aucun audit planifié ce mois-ci.')}</p>}
            {audits.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-navy-dark">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {tr('Semaine')} {a.weekNumber} ({fmtDayMonth(a.startDate)} {tr('au')} {fmtDate(a.endDate)})
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{a.scope}</p>
                </div>
                <StatusBadge tone={AUDIT_STATUS[a.status]} label={auditStatusLabel(a)} className="py-1" />
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="space-y-3">
          <CardTitle>{tr('KPIs Qualité Inventaire')}{kpis.lastAuditDate ? tr(' (Dernier Audit : {0})', fmtDate(kpis.lastAuditDate)) : ''}</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-navy-dark">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{tr('Exactitude IRA')}</p>
              <h4 className="mt-1 text-xl font-bold text-jesa-light">{fmtPct(kpis.ira)}</h4>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-navy-dark">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{tr('Écart Financier')}</p>
              <h4 className="mt-1 text-xl font-bold text-green-600 dark:text-green-400">{fmtPct(kpis.financialGapPct, 2)}</h4>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-navy-dark">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{tr('Lignes Comptées / Exactes')}</p>
              <h4 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                {fmtInt(kpis.countedLines)} / {fmtInt(kpis.accurateLines)}
              </h4>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-navy-dark">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{tr('Audits Terminés')}</p>
              <h4 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{kpis.completedAudits}</h4>
            </div>
          </div>
        </Card>
      </div>

      <MovementHistory initial={movements} />
    </div>
  );
}

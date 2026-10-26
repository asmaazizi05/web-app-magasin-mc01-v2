import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Coins,
  Forklift,
  Gauge,
  Layers,
  PieChart,
  ShieldAlert,
  Timer,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { AbcPareto } from '@/components/dashboard/AbcPareto';
import { CategoryDonut } from '@/components/dashboard/CategoryDonut';
import { ShiftCard, type ShiftState } from '@/components/dashboard/ShiftCard';
import { ZONE_TONE, ZoneCard } from '@/components/dashboard/ZoneCard';
import { ZoneValuation } from '@/components/dashboard/ZoneValuation';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Card, CardTitle } from '@/components/ui/Card';
import { HeroCard } from '@/components/ui/HeroCard';
import { KpiCard } from '@/components/ui/KpiCard';
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader';
import { api } from '@/lib/api';
import { fmtDate, fmtDay, fmtInt, fmtPct, fmtUnits, siteMinutesNow } from '@/lib/format';
import { SHIFT, type Tone } from '@/lib/labels';
import type { ShiftType } from '@/lib/types';
import { getT } from '@/lib/i18n/server';

const WORK_SHIFTS: ShiftType[] = ['MATIN', 'APRES_MIDI', 'NUIT'];

function inWindow(type: ShiftType, minutes: number): boolean {
  const { start, end } = SHIFT[type];
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

function shiftStates(now: number): Record<ShiftType, ShiftState> {
  const activeIdx = WORK_SHIFTS.findIndex((t) => inWindow(t, now));
  const nextIdx = (activeIdx + 1) % WORK_SHIFTS.length;
  const state = (t: ShiftType, i: number): ShiftState => (i === activeIdx ? 'active' : i === nextIdx ? 'next' : 'rest');
  return {
    MATIN: state('MATIN', 0),
    APRES_MIDI: state('APRES_MIDI', 1),
    NUIT: state('NUIT', 2),
    OFF: 'off',
    CONGE: 'off',
    FORMATION: 'off',
    ABSENT: 'off',
  };
}

export default async function DashboardPage() {
  const tr = await getT();
  const [kpis, shifts, habAlerts, enginAlerts] = await Promise.all([api.dashboard(), api.currentShifts(), api.habilitationAlerts(), api.enginAlerts()]);
  const enginCritical = enginAlerts.filter((a) => a.severity === 'critique');
  const habExpired = habAlerts.filter((a) => a.status === 'EXPIREE').length;
  const states = shiftStates(siteMinutesNow());
  const zoneTones = new Map<number, Tone>(kpis.zones.map((z) => [z.id, ZONE_TONE[(z.position - 1) % ZONE_TONE.length] ?? 'gray']));
  const staffCount = shifts.posts.reduce((s, p) => s + p.storekeepers.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={tr("Tableau de Bord Global & KPIs d'Exploitation")}
        subtitle={tr('Synthèse des volumes, valorisation, alerte stock minimum, effectif et camemberts de flux par catégorie.')}
      />

      {/* 1. KPIs en haut : total articles & valorisation */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <HeroCard
          variant="navy"
          label={tr("TOTAL GÉNÉRAL D'ARTICLES (UNITÉS PHYSIQUES)")}
          value={fmtInt(kpis.totalUnits)}
          unit={tr('unités')}
          footerIcon={CheckCircle2}
          footer={
            <>
              {tr('Catalogue :')}{' '}
              <strong>
                {kpis.articleCount} {tr('références actives sur')} {kpis.zonesWithStock} {tr('zones physiques')}
              </strong>
            </>
          }
          watermark={Boxes}
        />
        <HeroCard
          variant="jesa"
          label={tr('VALORISATION TOTALE DU STOCK')}
          value={fmtInt(kpis.totalValuation)}
          unit="DH"
          footerIcon={Coins}
          footer={tr('Valorisation calculée au Coût Moyen Pondéré (CMP)')}
          watermark={TrendingUp}
        />
      </div>

      {/* 2. Bandeau alerte critique stock minimum */}
      {kpis.alerts.map((a) => (
        <AlertBanner
          key={a.articleId}
          title={tr('ALERTE STOCK MINIMUM : Réapprovisionnement Requis')}
          badge={tr('CRITIQUE')}
          actionLabel={tr('Passer Commande SAP')}
          actionHref={`/stock?q=${encodeURIComponent(a.code)}`}
        >
          {tr('Article :')}{' '}
          <strong>
            {a.designation} {tr('(Code:')} {a.code})
          </strong>{' '}
          {tr('| Stock actuel :')} <span className="font-bold text-red-600 dark:text-red-400">{fmtUnits(a.currentStock)}</span> {tr('(Seuil Min :')}{' '}
          <strong>{fmtUnits(a.minStock)}</strong>).
        </AlertBanner>
      ))}

      {/* Engins : pannes et échéances dépassées */}
      {enginCritical.length > 0 && (
        <Link
          href="/shifts/engins"
          className="alert-halo flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-red-500/70 bg-red-50 p-4 shadow-sm transition hover:border-red-500 dark:bg-red-900/20"
        >
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl border border-red-500/40 bg-red-500/20 p-2.5 text-red-600 dark:text-red-400">
              <Forklift className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-900 dark:text-red-200">{tr('ENGINS :')} {enginCritical.length} {tr('point(s) critique(s)')}</h4>
              <p className="mt-0.5 text-xs text-gray-700 dark:text-gray-300">
                {enginCritical
                  .slice(0, 3)
                  .map((a) => `${a.code} ${a.name} – ${tr(a.message)}`)
                  .join(' · ')}
                {enginCritical.length > 3 ? ' …' : ''}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-red-700 dark:text-red-300">
            {tr('Parc engins')} <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      )}

      {/* Habilitations à renouveler */}
      {habAlerts.length > 0 && (
        <Link
          href="/shifts/magasiniers"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-amber-500/70 bg-amber-50 p-4 shadow-sm transition hover:border-amber-500 dark:bg-amber-900/20"
        >
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/20 p-2.5 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {tr('HABILITATIONS :')} {habAlerts.length} {tr('à renouveler')}{habExpired ? tr(' dont {0} expirée(s)', habExpired) : ''}
              </h4>
              <p className="mt-0.5 text-xs text-gray-700 dark:text-gray-300">
                {habAlerts
                  .slice(0, 3)
                  .map((a) => `${a.storekeeperName} – ${a.typeName} (${a.status === 'EXPIREE' ? tr('expirée le') : tr('expire le')} ${fmtDay(a.expiresAt)})`)
                  .join(' · ')}
                {habAlerts.length > 3 ? ' …' : ''}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300">
            {tr('Voir les fiches')} <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      )}

      {/* 3. KPIs d'exploitation */}
      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label={tr('OTIF Expéditions')}
          value={kpis.otif.total ? fmtPct(kpis.otif.value) : '—'}
          hint={tr('{0} / {1} bons servis à temps', kpis.otif.onTime, kpis.otif.total)}
          icon={Truck}
          tone={kpis.otif.value >= 95 ? 'green' : kpis.otif.value >= 80 ? 'amber' : 'red'}
          gauge={kpis.otif.value}
        />
        <KpiCard
          label={tr('Exactitude IRA')}
          value={fmtPct(kpis.ira.value)}
          hint={`${tr('{0} / {1} lignes exactes', fmtInt(kpis.ira.accurateLines), fmtInt(kpis.ira.countedLines))}${kpis.ira.lastAuditDate ? ` · ${fmtDate(kpis.ira.lastAuditDate)}` : ''}`}
          icon={ClipboardCheck}
          tone="jesa"
          gauge={kpis.ira.value}
        />
        <KpiCard
          label={tr('Saturation Racks')}
          value={fmtPct(kpis.rackSaturation.value)}
          hint={tr('{0} / {1} unités sur {2} racks', fmtInt(kpis.rackSaturation.units), fmtInt(kpis.rackSaturation.capacity), kpis.rackSaturation.rackCount)}
          icon={Gauge}
          tone={kpis.rackSaturation.value >= 85 ? 'red' : kpis.rackSaturation.value >= 70 ? 'amber' : 'blue'}
          gauge={kpis.rackSaturation.value}
        />
        <KpiCard
          label={tr('Temps Moyen Préparation')}
          value={kpis.avgPrepMinutes !== null ? `${kpis.avgPrepMinutes} min` : '—'}
          hint={tr('Demande → service (bons livrés)')}
          icon={Timer}
          tone="purple"
        />
      </div>

      {/* 4. Affectation des magasiniers par poste */}
      <div className="space-y-3">
        <SectionTitle
          icon={<Users className="h-4 w-4 text-jesa-light" />}
          action={
            <Link href="/shifts" className="flex items-center gap-1 text-xs font-semibold text-jesa-light hover:underline">
              {tr('Voir le planning mensuel')} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {tr('Affectation des')} {staffCount} {tr("Magasiniers par Poste (Aujourd'hui)")}
        </SectionTitle>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shifts.posts.map((p) => (
            <ShiftCard key={p.type} type={p.type} storekeepers={p.storekeepers} state={states[p.type]} />
          ))}
        </div>
        {shifts.away.length > 0 && (
          <p className="text-[11px] text-gray-600 dark:text-gray-400">
            {tr('Absents cette semaine :')}{' '}
            {shifts.away.map((a) => `${a.storekeeper.name} (${tr(SHIFT[a.type].rotationLabel)})`).join(' · ')}
          </p>
        )}
      </div>

      {/* 5. Camemberts entrées / sorties par catégorie */}
      <div className="space-y-3">
        <SectionTitle icon={<PieChart className="h-4 w-4 text-jesa-light" />}>{tr("Répartition des Mouvements par Catégorie d'Articles (Camemberts)")}</SectionTitle>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card padding="lg" className="space-y-3">
            <CardTitle
              icon={<ArrowUpRight className="h-4 w-4 text-blue-500" />}
              aside={<span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-500 dark:bg-blue-950/40">{tr('Expéditions')}</span>}
            >
              {tr('Camembert 1 : Répartition des Sorties par Catégorie')}
            </CardTitle>
            <CategoryDonut flows={kpis.flowsByCategory.OUT} unitLabel={tr('unités sorties')} />
          </Card>
          <Card padding="lg" className="space-y-3">
            <CardTitle
              icon={<ArrowDownLeft className="h-4 w-4 text-jesa-light" />}
              aside={<span className="rounded bg-jesa/10 px-2 py-0.5 text-[10px] font-bold text-jesa-light">{tr('Réceptions')}</span>}
            >
              {tr('Camembert 2 : Répartition des Entrées par Catégorie')}
            </CardTitle>
            <CategoryDonut flows={kpis.flowsByCategory.IN} unitLabel={tr('unités reçues')} />
          </Card>
        </div>
      </div>

      {/* 6. Pareto ABC & valorisation par zone */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card padding="lg" className="space-y-4">
          <CardTitle icon={<Layers className="h-4 w-4 text-jesa-light" />}>{tr('Analyse ABC (Pareto de la Valorisation)')}</CardTitle>
          <AbcPareto slices={kpis.abc} />
        </Card>
        <Card padding="lg" className="space-y-4">
          <CardTitle icon={<Coins className="h-4 w-4 text-amber-500" />}>{tr('Valorisation du Stock par Zone (CMP)')}</CardTitle>
          <ZoneValuation zones={kpis.zones} tones={zoneTones} />
        </Card>
      </div>

      {/* 7. Occupation et capacité détaillée par zone */}
      <div className="space-y-3">
        <SectionTitle
          icon={<Layers className="h-4 w-4 text-jesa-light" />}
          action={
            <Link href="/cartographie" className="flex items-center gap-1 text-xs font-semibold text-jesa-light hover:underline">
              {tr('Plan spatial 2D')} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {tr("Occupation, Nombre d'Articles & Capacité Restante par Zone")}
        </SectionTitle>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {kpis.zones.map((z) => (
            <ZoneCard key={z.id} zone={z} tone={zoneTones.get(z.id) ?? 'gray'} />
          ))}
        </div>
      </div>
    </div>
  );
}

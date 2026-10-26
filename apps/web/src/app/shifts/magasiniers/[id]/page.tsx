import { ArrowLeft, Building2, CalendarDays, FileText, GraduationCap, Lock, Mail, Phone, Pin, ShieldCheck, Truck } from 'lucide-react';
import Link from 'next/link';
import { HabilitationEditForm, HabilitationForm, StorekeeperForm, TrainingForm } from '@/components/personnel/PersonnelForms';
import { Card, CardTitle } from '@/components/ui/Card';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BADGE_TONE } from '@/components/ui/tones';
import { api, apiUrl } from '@/lib/api';
import { fmtDay, fmtDayShort, initials } from '@/lib/format';
import { HABILITATION_STATUS, SHIFT } from '@/lib/labels';
import type { HabilitationView, TrainingView } from '@/lib/types';
import { useT } from '@/lib/i18n';
import { getT } from '@/lib/i18n/server';

function DocLink({ url, name }: { url: string | null; name: string | null }) {
  const tr = useT();
  if (!url) return <span className="text-gray-400">—</span>;
  return (
    <a href={apiUrl(url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-jesa-light hover:underline" title={name ?? undefined}>
      <FileText className="h-3.5 w-3.5" /> {tr('Voir')}
    </a>
  );
}

function daysLabel(h: HabilitationView): string {
  const tr = useT();
  if (h.daysLeft < 0) return tr('expirée depuis {0} j', -h.daysLeft);
  if (h.daysLeft === 0) return tr("expire aujourd'hui");
  return tr('encore {0} j', h.daysLeft);
}

export default async function MagasinierPage({ params }: { params: Promise<{ id: string }> }) {
  const tr = await getT();
  const { id } = await params;
  const [p, types] = await Promise.all([api.storekeeper(Number(id)), api.habilitationTypes()]);
  const current = p.habilitationList.filter((h) => !h.superseded);
  const history = p.habilitationList.filter((h) => h.superseded);

  const habColumns = (withActions: boolean) => [
    { key: 'type', header: tr('Habilitation'), className: 'font-bold text-gray-900 dark:text-white', render: (h: HabilitationView) => h.typeName },
    { key: 'ref', header: tr('N° / Organisme'), className: 'text-gray-600 dark:text-gray-300', render: (h: HabilitationView) => [h.reference, h.organization].filter(Boolean).join(' · ') || '—' },
    { key: 'obt', header: tr('Obtenue le'), className: 'whitespace-nowrap', render: (h: HabilitationView) => fmtDay(h.obtainedAt) },
    {
      key: 'exp',
      header: tr('Expire le'),
      className: 'whitespace-nowrap',
      render: (h: HabilitationView) => (
        <>
          <span className="font-semibold text-gray-900 dark:text-white">{fmtDay(h.expiresAt)}</span>
          {!h.superseded && <span className="block text-[10px] text-gray-500 dark:text-gray-400">{daysLabel(h)}</span>}
        </>
      ),
    },
    {
      key: 'st',
      header: tr('Statut'),
      render: (h: HabilitationView) =>
        h.superseded ? <StatusBadge tone="gray" label={tr('Remplacée')} /> : <StatusBadge tone={HABILITATION_STATUS[h.status].tone} label={tr(HABILITATION_STATUS[h.status].label)} />,
    },
    { key: 'doc', header: tr('Justificatif'), render: (h: HabilitationView) => <DocLink url={h.documentUrl} name={h.documentName} /> },
    ...(withActions
      ? [
          {
            key: 'act',
            header: '',
            render: (h: HabilitationView) => (
              <div className="flex flex-wrap items-center justify-end gap-1">
                <HabilitationForm storekeeperId={p.id} types={types} renew={h} />
                <HabilitationEditForm habilitation={h} />
                <ConfirmButton deletePath={`/habilitations/${h.id}`} />
              </div>
            ),
          },
        ]
      : [
          {
            key: 'act',
            header: '',
            render: (h: HabilitationView) => (
              <div className="flex justify-end">
                <ConfirmButton deletePath={`/habilitations/${h.id}`} />
              </div>
            ),
          },
        ]),
  ];

  return (
    <div className="space-y-5">
      <Link href="/shifts/magasiniers" className="inline-flex items-center gap-1 text-xs font-semibold text-jesa-light hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> {tr('Toutes les fiches')}
      </Link>

      {/* Identité */}
      <Card padding="lg" className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-jesa text-lg font-bold text-white">{initials(p.name)}</div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{p.name}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-mono">{p.matricule}</span> · {tr(p.role)} {tr('· Spécialité :')} {p.specialty}
            </p>
            <p className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
              {p.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {p.phone}
                </span>
              )}
              {p.email && (
                <a href={`mailto:${p.email}`} className="flex items-center gap-1 hover:text-jesa-light hover:underline">
                  <Mail className="h-3 w-3" /> {p.email}
                </a>
              )}
              {p.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {p.company}
                </span>
              )}
              {p.hireDate && <span>{tr('Entré le')} {fmtDay(p.hireDate)}</span>}
              {p.fixedPost && (
                <span className="flex items-center gap-1 font-semibold">
                  <Pin className="h-3 w-3" /> {tr('Poste fixe :')} {tr(SHIFT[p.fixedPost].rotationLabel)}
                </span>
              )}
            </p>
          </div>
        </div>
        <StorekeeperForm storekeeper={p} />
      </Card>

      {/* Planning à venir */}
      <Card padding="lg" className="space-y-3">
        <CardTitle
          icon={<CalendarDays className="h-4 w-4 text-jesa-light" />}
          aside={
            <Link href="/shifts" className="text-xs font-semibold text-jesa-light hover:underline">
              {tr('Modifier dans le planning')}
            </Link>
          }
        >
          {tr('Planning des 6 prochaines semaines')}
        </CardTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {p.upcoming.map((u, i) => (
            <div key={u.weekStart} className={`rounded-xl border p-2 text-center text-xs ${i === 0 ? 'border-jesa' : 'border-gray-200 dark:border-gray-800'}`}>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {i === 0 ? tr('Cette semaine') : tr('Sem. du {0}', fmtDayShort(u.weekStart))}
              </p>
              {u.type ? (
                <span className={`mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold ${BADGE_TONE[SHIFT[u.type].tone]}`}>
                  {tr(SHIFT[u.type].rotationLabel)}
                  {u.locked && <Lock className="h-2.5 w-2.5" />}
                </span>
              ) : (
                <span className="mt-1 block text-gray-400">—</span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Habilitations */}
      <Card padding="lg" className="space-y-3">
        <CardTitle icon={<ShieldCheck className="h-4 w-4 text-jesa-light" />} aside={<HabilitationForm storekeeperId={p.id} types={types} />}>
          {tr('Habilitations')}
        </CardTitle>
        <DataTable<HabilitationView> rows={current} rowKey={(h) => h.id} columns={habColumns(true)} empty={tr('Aucune habilitation enregistrée.')} />
        {history.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer font-semibold text-gray-500 dark:text-gray-400">{tr('Historique (')}{history.length} {tr('certificat(s) remplacé(s))')}</summary>
            <div className="mt-2">
              <DataTable<HabilitationView> rows={history} rowKey={(h) => h.id} columns={habColumns(false)} dense />
            </div>
          </details>
        )}
      </Card>

      {/* Formations */}
      <Card padding="lg" className="space-y-3">
        <CardTitle icon={<GraduationCap className="h-4 w-4 text-jesa-light" />} aside={<TrainingForm storekeeperId={p.id} />}>
          {tr('Formations suivies')}
        </CardTitle>
        <DataTable<TrainingView>
          rows={p.trainings}
          rowKey={(t) => t.id}
          empty={tr('Aucune formation enregistrée.')}
          columns={[
            { key: 'date', header: tr('Date'), className: 'whitespace-nowrap font-semibold text-gray-900 dark:text-white', render: (t) => fmtDay(t.date) },
            { key: 'title', header: tr('Formation'), className: 'font-bold text-gray-900 dark:text-white', render: (t) => t.title },
            { key: 'org', header: tr('Organisme'), className: 'text-gray-600 dark:text-gray-300', render: (t) => t.organization ?? '—' },
            { key: 'dur', header: tr('Durée'), render: (t) => (t.durationHours ? `${t.durationHours} h` : '—') },
            { key: 'doc', header: tr('Certificat'), render: (t) => <DocLink url={t.documentUrl} name={t.documentName} /> },
            {
              key: 'act',
              header: '',
              render: (t) => (
                <div className="flex justify-end">
                  <ConfirmButton deletePath={`/trainings/${t.id}`} />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Engins */}
      <Card padding="lg" className="space-y-3">
        <CardTitle icon={<Truck className="h-4 w-4 text-jesa-light" />}>{tr('Engins autorisés')}</CardTitle>
        {p.engins.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">{tr('Aucun engin enregistré dans le parc.')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {p.engins.map((e) => (
              <span
                key={e.id}
                title={e.requiredHabilitation ? tr('Habilitation requise : {0}', e.requiredHabilitation) : tr('Aucune habilitation requise')}
                className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${e.allowed ? BADGE_TONE.green : 'bg-gray-100 text-gray-400 line-through dark:bg-navy-dark'}`}
              >
                {e.code} {e.name}
              </span>
            ))}
          </div>
        )}
        <p className="text-[10px] text-gray-500 dark:text-gray-400">
          {tr("Un engin est autorisé si l'habilitation qu'il requiert est valide (non expirée) pour ce magasinier.")}
        </p>
      </Card>
    </div>
  );
}

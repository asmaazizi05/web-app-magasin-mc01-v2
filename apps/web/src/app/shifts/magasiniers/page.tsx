import { AlertTriangle, ChevronRight, GraduationCap, Pin, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { StorekeeperForm } from '@/components/personnel/PersonnelForms';
import { PageHeader } from '@/components/ui/PageHeader';
import { SelectableCard, SelectionDelete, SelectionDeleteBar, SelectToDeleteButton } from '@/components/ui/SelectionDelete';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BADGE_TONE } from '@/components/ui/tones';
import { api } from '@/lib/api';
import { fmtDay, initials } from '@/lib/format';
import { HABILITATION_STATUS, SHIFT } from '@/lib/labels';
import { getT } from '@/lib/i18n/server';

export default async function MagasiniersPage() {
  const tr = await getT();
  const [storekeepers, alerts] = await Promise.all([api.storekeepers(), api.habilitationAlerts()]);
  const nextMatricule = `M-${Math.max(8800, ...storekeepers.map((s) => Number(s.matricule.replace(/\D/g, '')) || 0)) + 1}`;
  const expired = alerts.filter((a) => a.status === 'EXPIREE').length;

  return (
    <SelectionDelete>
    <div className="space-y-5">
      <PageHeader
        title={tr('Fiches Magasiniers')}
        subtitle={tr("Identité, poste de la semaine, habilitations (avec date d'expiration) et formations de chaque magasinier.")}
        actions={<StorekeeperForm suggestedMatricule={nextMatricule} />}
      />

      {alerts.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/60 bg-amber-50 p-4 text-xs dark:bg-amber-900/20">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-200">
              {alerts.length} {tr('habilitation(s) à renouveler')}{expired ? tr(' dont {0} expirée(s)', expired) : ''}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              {alerts
                .slice(0, 4)
                .map((a) => `${a.storekeeperName} – ${a.typeName} (${a.status === 'EXPIREE' ? tr('expirée le') : tr('expire le')} ${fmtDay(a.expiresAt)})`)
                .join(' · ')}
              {alerts.length > 4 ? ' …' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Sélection pour suppression : sous l'alerte habilitations, juste au-dessus de la liste */}
      {storekeepers.length > 0 && <SelectToDeleteButton label={tr('Sélectionner des magasiniers à supprimer')} />}
      <SelectionDeleteBar
        items={storekeepers.map((s) => ({ id: s.id, code: s.name }))}
        basePath="/storekeepers"
        hint={tr('Cochez les magasiniers à supprimer.')}
        note={tr('La suppression est définitive : la fiche, les habilitations, les formations et le planning du magasinier sont effacés. Un magasinier qui figure sur des bons ou des mouvements de stock ne peut pas être supprimé.')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {storekeepers.map((s) => (
          <SelectableCard key={s.id} id={s.id} label={`${s.matricule} ${s.name}`}>
          <Link
            href={`/shifts/magasiniers/${s.id}`}
            className="group block h-full space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-jesa dark:border-gray-800 dark:bg-navy-light"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-jesa text-sm font-bold text-white">{initials(s.name)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{s.name}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="font-mono">{s.matricule}</span> · {tr(s.role)}
                  {s.company && <> · {s.company}</>}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-jesa-light" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              {s.currentPost ? (
                <span className={`rounded px-1.5 py-0.5 font-semibold ${BADGE_TONE[SHIFT[s.currentPost].tone]}`}>{tr('Cette semaine :')} {tr(SHIFT[s.currentPost].rotationLabel)}</span>
              ) : (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-semibold text-gray-500 dark:bg-navy-dark">{tr('Non planifié cette semaine')}</span>
              )}
              {s.fixedPost && (
                <span className="flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 font-semibold text-gray-700 dark:bg-navy-dark dark:text-gray-300">
                  <Pin className="h-2.5 w-2.5" /> {tr('Fixe :')} {tr(SHIFT[s.fixedPost].rotationLabel)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-2 text-[10px] dark:border-gray-800">
              <ShieldCheck className="h-3.5 w-3.5 text-jesa-light" />
              {s.habilitations.valid + s.habilitations.soon + s.habilitations.expired === 0 ? (
                <span className="text-gray-500 dark:text-gray-400">{tr('Aucune habilitation enregistrée')}</span>
              ) : (
                <>
                  {s.habilitations.valid > 0 && <StatusBadge tone="green" label={tr('{0} valide(s)', s.habilitations.valid)} />}
                  {s.habilitations.soon > 0 && <StatusBadge tone="amber" label={tr('{0} bientôt', s.habilitations.soon)} />}
                  {s.habilitations.expired > 0 && <StatusBadge tone="red" label={tr('{0} expirée(s)', s.habilitations.expired)} />}
                </>
              )}
              <span className="ml-auto flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <GraduationCap className="h-3.5 w-3.5" /> {s.trainingCount} {tr('formation(s)')}
              </span>
            </div>
            {s.nextExpiry && s.nextExpiry.status !== 'VALIDE' && (
              <p className={`text-[10px] font-semibold ${s.nextExpiry.status === 'EXPIREE' ? 'text-red-500' : 'text-amber-500'}`}>
                {tr(HABILITATION_STATUS[s.nextExpiry.status].label)} : {s.nextExpiry.typeName} ({fmtDay(s.nextExpiry.expiresAt)})
              </p>
            )}
          </Link>
          </SelectableCard>
        ))}
      </div>
    </div>
    </SelectionDelete>
  );
}

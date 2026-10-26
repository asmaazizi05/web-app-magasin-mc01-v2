import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PrintButton } from '@/components/interventions/InterventionForms';
import logo from '@/assets/jesa-logo.png';
import { api, apiUrl } from '@/lib/api';
import { fmtDate, fmtDay, fmtTime } from '@/lib/format';
import { INTERVENTION_STATUS, PROVIDER_KIND, TASK_STATUS } from '@/lib/labels';
import { getT } from '@/lib/i18n/server';

/** Rapport d'avancement imprimable : « feuille » blanche quel que soit le thème, enregistrable en PDF via l'impression */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 break-inside-avoid">
      <h2 className="border-b-2 border-[#003088] pb-1 text-sm font-bold uppercase tracking-wide text-[#003088]">{title}</h2>
      {children}
    </section>
  );
}

const th = 'border border-gray-300 bg-gray-100 px-2 py-1 text-left font-semibold';
const td = 'border border-gray-300 px-2 py-1 align-top';

export default async function RapportPage({ params }: { params: Promise<{ id: string }> }) {
  const tr = await getT();
  const { id } = await params;
  const i = await api.intervention(Number(id));
  const now = new Date().toISOString();
  const warnings = i.tasks.flatMap((t) => t.warnings.map((w) => `${t.title} : ${tr(w)}`));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={`/shifts/prestations/${i.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-jesa-light hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> {tr("Retour à l'intervention")}
        </Link>
        <div className="flex gap-2">
          <a
            href={apiUrl(`/interventions/${i.id}/export.xlsx`)}
            className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 hover:border-jesa dark:border-gray-700 dark:bg-navy-dark dark:text-gray-200"
          >
            <FileSpreadsheet className="h-4 w-4 text-green-600" /> {tr('Excel')}
          </a>
          <PrintButton />
        </div>
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 print:hidden">
        {tr('Pour obtenir un PDF : « Imprimer / Enregistrer en PDF », puis choisissez « Enregistrer au format PDF » comme imprimante.')}
      </p>

      <article className="mx-auto max-w-4xl space-y-6 rounded-lg bg-white p-8 text-[12px] text-gray-900 shadow-xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b border-gray-300 pb-4">
          <div>
            <img src={logo.src} alt="JESA" className="h-10 w-auto" />
            <p className="mt-1 text-[11px] text-gray-500">{tr('Magasin Central MC01')}</p>
          </div>
          <div className="text-right">
            <h1 className="text-lg font-bold">{tr("Rapport d'avancement des travaux")}</h1>
            <p className="font-mono font-bold text-[#003088]">{i.code}</p>
            <p className="text-[10px] text-gray-500">
              {tr('Édité le')} {fmtDate(now)} {tr('à')} {fmtTime(now)}
            </p>
          </div>
        </header>

        <Section title={tr('1. Informations générales')}>
          <table className="w-full border-collapse">
            <tbody>
              {[
                [tr('Projet'), i.title],
                [tr('Type de travaux'), i.workType],
                [tr('Intervenant'), `${i.company} — ${tr(PROVIDER_KIND[i.providerKind].label)}`],
                [tr('Responsable sur place'), i.managerPhone ? `${i.managerName} (${i.managerPhone})` : i.managerName],
                [tr('Zone du magasin'), i.zone?.name ?? tr('Plusieurs zones / non précisée')],
                [tr('Période prévue'), `${fmtDay(i.plannedStart)} → ${fmtDay(i.plannedEnd)}`],
                [tr('Période réelle'), `${i.actualStart ? fmtDay(i.actualStart) : '—'} → ${i.actualEnd ? fmtDay(i.actualEnd) : '—'}`],
                [tr('Statut'), `${tr(INTERVENTION_STATUS[i.status].label)}${i.late ? tr(' — EN RETARD') : ''}`],
                ...(i.description ? [[tr('Description'), i.description]] : []),
              ].map(([k, v]) => (
                <tr key={k}>
                  <th className={`${th} w-48`}>{k}</th>
                  <td className={td}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title={tr('2. Avancement global')}>
          <div className="flex items-center gap-4">
            <p className="text-3xl font-extrabold text-[#003088]">{i.progress} %</p>
            <div className="flex-1 space-y-1">
              <div className="h-3 w-full overflow-hidden rounded-full border border-gray-300 bg-gray-100">
                <div className="h-full bg-[#003088]" style={{ width: `${i.progress}%` }} />
              </div>
              <p className="text-[11px] text-gray-600">
                {i.doneTasks} {tr('tâche(s) terminée(s) sur')} {i.taskCount} · {i.memberCount} {tr('intervenant(s) ·')} {i.logs.length} {tr('compte(s) rendu(s)')}
              </p>
            </div>
          </div>
        </Section>

        <Section title={tr('3. Détail des tâches')}>
          {i.tasks.length === 0 ? (
            <p className="text-gray-500">{tr('Aucune tâche définie.')}</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>{tr('Tâche')}</th>
                  <th className={th}>{tr('Prévu')}</th>
                  <th className={th}>{tr('Intervenants')}</th>
                  <th className={th}>{tr('Engins')}</th>
                  <th className={th}>{tr('Avancement')}</th>
                  <th className={th}>{tr('Statut')}</th>
                </tr>
              </thead>
              <tbody>
                {i.tasks.map((t) => (
                  <tr key={t.id} className="break-inside-avoid">
                    <td className={td}>
                      <strong>{t.title}</strong>
                      {t.description && <span className="block text-[10px] text-gray-500">{t.description}</span>}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {fmtDay(t.plannedStart)}
                      <br />→ {fmtDay(t.plannedEnd)}
                    </td>
                    <td className={td}>{t.members.map((m) => m.name).join(', ') || '—'}</td>
                    <td className={td}>{t.engins.map((e) => `${e.code} ${e.name}`).join(', ') || '—'}</td>
                    <td className={`${td} text-center font-bold`}>{t.progress} %</td>
                    <td className={td}>
                      {tr(TASK_STATUS[t.status].label)}
                      {t.late ? tr(' (retard)') : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title={tr('4. Équipe')}>
          {i.members.length === 0 ? (
            <p className="text-gray-500">{tr('Aucun intervenant enregistré.')}</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>{tr('Nom')}</th>
                  <th className={th}>{tr('Fonction')}</th>
                  <th className={th}>{tr('Société')}</th>
                  <th className={th}>{tr('Téléphone')}</th>
                </tr>
              </thead>
              <tbody>
                {i.members.map((m) => (
                  <tr key={m.id}>
                    <td className={td}>{m.name}</td>
                    <td className={td}>{tr(m.role)}</td>
                    <td className={td}>{m.company ?? i.company}</td>
                    <td className={td}>{m.phone ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title={tr('5. Journal des travaux exécutés')}>
          {i.logs.length === 0 ? (
            <p className="text-gray-500">{tr('Aucun compte rendu enregistré.')}</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${th} w-24`}>{tr('Date')}</th>
                  <th className={th}>{tr('Travaux exécutés')}</th>
                  <th className={th}>{tr('Tâche / avancement')}</th>
                  <th className={th}>{tr('Auteur')}</th>
                </tr>
              </thead>
              <tbody>
                {[...i.logs].reverse().map((l) => (
                  <tr key={l.id} className="break-inside-avoid">
                    <td className={`${td} whitespace-nowrap`}>{fmtDay(l.date)}</td>
                    <td className={`${td} whitespace-pre-line`}>{l.description}</td>
                    <td className={td}>
                      {l.task?.title ?? tr('Général')}
                      {l.progressAfter !== null && ` → ${l.progressAfter} %`}
                    </td>
                    <td className={td}>{l.author}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {warnings.length > 0 && (
          <Section title={tr("6. Points d'attention")}>
            <ul className="list-inside list-disc text-amber-800">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Section>
        )}

        <footer className="grid grid-cols-2 gap-8 pt-6 break-inside-avoid">
          {[tr('Responsable {0}', i.providerKind === 'PRESTATAIRE' ? tr('prestataire') : tr("de l'équipe")), tr('Responsable Magasin MC01')].map((s) => (
            <div key={s} className="space-y-12 border-t border-gray-400 pt-2 text-[11px]">
              <p className="font-semibold">{s}</p>
              <p className="text-gray-400">{tr('Date et signature')}</p>
            </div>
          ))}
        </footer>
      </article>
    </div>
  );
}

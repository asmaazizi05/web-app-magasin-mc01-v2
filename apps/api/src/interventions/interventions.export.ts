import { InterventionStatus, ProviderKind, TaskStatus } from '@prisma/client';
import ExcelJS from 'exceljs';
import { InterventionDetail } from './interventions.service';

const STATUS: Record<InterventionStatus, string> = {
  PLANIFIEE: 'Planifiée',
  EN_COURS: 'En cours',
  SUSPENDUE: 'Suspendue',
  TERMINEE: 'Terminée',
  CLOTUREE: 'Clôturée',
};
const TASK_STATUS: Record<TaskStatus, string> = { A_FAIRE: 'À faire', EN_COURS: 'En cours', BLOQUEE: 'Bloquée', TERMINEE: 'Terminée' };
const PROVIDER: Record<ProviderKind, string> = { PRESTATAIRE: 'Prestataire externe', SUPPORT_INTERNE: 'Équipe support interne' };

const fr = (day: string | null) => (day ? day.split('-').reverse().join('/') : '—');
const OCP = 'FF008343';

function header(ws: ExcelJS.Worksheet, columns: { header: string; key: string; width: number }[]): void {
  ws.columns = columns;
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OCP } };
  row.alignment = { vertical: 'middle' };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

/** Rapport d'avancement Excel : Synthèse, Équipe, Tâches, Journal des travaux */
export async function interventionWorkbook(i: InterventionDetail): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'JESA OCP – Magasin Central MC01';
  wb.created = new Date();

  const s = wb.addWorksheet('Synthèse');
  s.columns = [{ width: 30 }, { width: 70 }];
  s.addRow([`Rapport d'avancement – ${i.code}`]).font = { bold: true, size: 14, color: { argb: OCP } };
  s.addRow([i.title]).font = { bold: true, size: 12 };
  s.addRow([]);
  const rows: [string, string | number][] = [
    ['Type de travaux', i.workType],
    ['Intervenant', `${i.company} (${PROVIDER[i.providerKind]})`],
    ['Responsable sur place', i.managerPhone ? `${i.managerName} – ${i.managerPhone}` : i.managerName],
    ['Zone du magasin', i.zone?.name ?? 'Non précisée'],
    ['Statut', STATUS[i.status] + (i.late ? ' (en retard)' : '')],
    ['Avancement global', `${i.progress} %`],
    ['Tâches terminées', `${i.doneTasks} / ${i.taskCount}`],
    ['Période prévue', `${fr(i.plannedStart)} → ${fr(i.plannedEnd)}`],
    ['Période réelle', `${fr(i.actualStart)} → ${fr(i.actualEnd)}`],
    ['Équipe', `${i.memberCount} intervenant(s)`],
    ['Description', i.description ?? ''],
    ['Rapport généré le', new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Casablanca' })],
  ];
  for (const [k, v] of rows) {
    const r = s.addRow([k, v]);
    r.getCell(1).font = { bold: true };
    r.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  }

  const team = wb.addWorksheet('Équipe');
  header(team, [
    { header: 'Nom', key: 'name', width: 28 },
    { header: 'Fonction', key: 'role', width: 24 },
    { header: 'Société', key: 'company', width: 24 },
    { header: 'Téléphone', key: 'phone', width: 18 },
    { header: 'Tâches affectées', key: 'tasks', width: 16 },
  ]);
  for (const m of i.members) team.addRow({ name: m.name, role: m.role, company: m.company ?? i.company, phone: m.phone ?? '', tasks: m.taskCount });

  const tasks = wb.addWorksheet('Tâches');
  header(tasks, [
    { header: 'Tâche', key: 'title', width: 36 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Début prévu', key: 'start', width: 13 },
    { header: 'Fin prévue', key: 'end', width: 13 },
    { header: 'Avancement', key: 'progress', width: 12 },
    { header: 'Statut', key: 'status', width: 12 },
    { header: 'Intervenants', key: 'members', width: 32 },
    { header: 'Engins', key: 'engins', width: 32 },
    { header: 'Alertes', key: 'warnings', width: 50 },
  ]);
  for (const t of i.tasks) {
    const r = tasks.addRow({
      title: t.title,
      description: t.description ?? '',
      start: fr(t.plannedStart),
      end: fr(t.plannedEnd),
      progress: t.progress / 100,
      status: TASK_STATUS[t.status] + (t.late ? ' (retard)' : ''),
      members: t.members.map((m) => m.name).join(', '),
      engins: t.engins.map((e) => `${e.code} ${e.name}`).join(', '),
      warnings: t.warnings.join(' | '),
    });
    r.getCell('progress').numFmt = '0%';
    r.alignment = { wrapText: true, vertical: 'top' };
  }

  const log = wb.addWorksheet('Journal des travaux');
  header(log, [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Tâche', key: 'task', width: 32 },
    { header: 'Travaux exécutés', key: 'description', width: 70 },
    { header: 'Avancement atteint', key: 'progress', width: 18 },
    { header: 'Auteur', key: 'author', width: 22 },
  ]);
  for (const l of i.logs) {
    const r = log.addRow({
      date: fr(l.date),
      task: l.task?.title ?? '—',
      description: l.description,
      progress: l.progressAfter !== null ? `${l.progressAfter} %` : '',
      author: l.author,
    });
    r.alignment = { wrapText: true, vertical: 'top' };
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

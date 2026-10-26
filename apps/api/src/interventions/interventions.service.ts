import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EnginStatus, InterventionStatus, Prisma, ProviderKind, TaskStatus } from '@prisma/client';
import { dateToDay, dayToDate, siteToday } from '../common/site-time';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInterventionDto,
  CreateTaskDto,
  CreateWorkLogDto,
  InterventionQueryDto,
  MemberDto,
  UpdateInterventionDto,
  UpdateMemberDto,
  UpdateTaskDto,
} from './interventions.dto';

/** Types de travaux proposés (saisie libre possible) */
export const WORK_TYPES = ['Nettoyage', 'Réimplantation', 'Inventaire', 'Rangement / déstockage', 'Maintenance', 'Manutention', 'Autre'];

const CLOSED: InterventionStatus[] = [InterventionStatus.TERMINEE, InterventionStatus.CLOTUREE];

export interface InterventionSummary {
  id: number;
  code: string;
  title: string;
  workType: string;
  providerKind: ProviderKind;
  company: string;
  managerName: string;
  managerPhone: string | null;
  zone: { id: number; name: string } | null;
  description: string | null;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  status: InterventionStatus;
  /** Moyenne de l'avancement des tâches (0–100) */
  progress: number;
  late: boolean;
  taskCount: number;
  doneTasks: number;
  memberCount: number;
  warningCount: number;
}

export interface TaskView {
  id: number;
  title: string;
  description: string | null;
  plannedStart: string;
  plannedEnd: string;
  progress: number;
  status: TaskStatus;
  late: boolean;
  members: { id: number; name: string }[];
  engins: { id: number; code: string; name: string; status: EnginStatus }[];
  /** Conflits d'engins (même engin sur une autre tâche aux mêmes dates) ou engin indisponible */
  warnings: string[];
}

export interface MemberView {
  id: number;
  name: string;
  role: string;
  company: string | null;
  phone: string | null;
  taskCount: number;
}

export interface WorkLogView {
  id: number;
  date: string;
  description: string;
  author: string;
  progressAfter: number | null;
  task: { id: number; title: string } | null;
}

export interface InterventionDetail extends InterventionSummary {
  members: MemberView[];
  tasks: TaskView[];
  logs: WorkLogView[];
}

const DETAIL_INCLUDE = {
  zone: true,
  members: { orderBy: { id: 'asc' }, include: { _count: { select: { tasks: true } } } },
  tasks: { orderBy: [{ position: 'asc' }, { id: 'asc' }], include: { members: true, engins: true } },
  logs: { orderBy: [{ date: 'desc' }, { id: 'desc' }], include: { task: { select: { id: true, title: true } } } },
} satisfies Prisma.InterventionInclude;

type DetailRow = Prisma.InterventionGetPayload<{ include: typeof DETAIL_INCLUDE }>;

const ENGIN_STATUS_LABEL: Record<EnginStatus, string> = {
  DISPONIBLE: 'disponible',
  MAINTENANCE: 'en maintenance',
  EN_PANNE: 'en panne',
  HORS_SERVICE: 'hors service',
};

const fr = (d: Date) => dateToDay(d).split('-').reverse().slice(0, 2).join('/');

/** Statut d'une tâche cohérent avec son avancement */
function resolveTaskStatus(progress: number, requested: TaskStatus | undefined, current: TaskStatus): TaskStatus {
  if (requested === TaskStatus.BLOQUEE || (requested === undefined && current === TaskStatus.BLOQUEE && progress < 100)) return TaskStatus.BLOQUEE;
  if (progress >= 100) return TaskStatus.TERMINEE;
  if (progress > 0) return TaskStatus.EN_COURS;
  return requested === TaskStatus.EN_COURS ? TaskStatus.EN_COURS : TaskStatus.A_FAIRE;
}

@Injectable()
export class InterventionsService {
  constructor(private readonly prisma: PrismaService) {}

  options(): { workTypes: string[] } {
    return { workTypes: WORK_TYPES };
  }

  async findAll(query: InterventionQueryDto): Promise<InterventionSummary[]> {
    const rows = await this.prisma.intervention.findMany({
      where: { status: query.status },
      include: DETAIL_INCLUDE,
      orderBy: [{ plannedStart: 'desc' }, { id: 'desc' }],
    });
    const conflicts = await this.conflictIndex();
    return rows.map((r) => this.summary(r, conflicts));
  }

  async findOne(id: number): Promise<InterventionDetail> {
    const row = await this.prisma.intervention.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!row) throw new NotFoundException(`Intervention ${id} introuvable.`);
    const conflicts = await this.conflictIndex();
    const today = dayToDate(siteToday());
    return {
      ...this.summary(row, conflicts),
      members: row.members.map(({ _count, ...m }) => ({ ...m, taskCount: _count.tasks })),
      tasks: row.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        plannedStart: dateToDay(t.plannedStart),
        plannedEnd: dateToDay(t.plannedEnd),
        progress: t.progress,
        status: t.status,
        late: t.status !== TaskStatus.TERMINEE && t.plannedEnd < today,
        members: t.members.map((m) => ({ id: m.id, name: m.name })),
        engins: t.engins.map((e) => ({ id: e.id, code: e.code, name: e.name, status: e.status })),
        warnings: conflicts.get(t.id) ?? [],
      })),
      logs: row.logs.map((l) => ({
        id: l.id,
        date: dateToDay(l.date),
        description: l.description,
        author: l.author,
        progressAfter: l.progressAfter,
        task: l.task,
      })),
    };
  }

  async create(dto: CreateInterventionDto): Promise<InterventionDetail> {
    this.checkRange(dto.plannedStart, dto.plannedEnd);
    const year = dto.plannedStart.slice(0, 4);
    const last = await this.prisma.intervention.findFirst({ where: { code: { startsWith: `INT-${year}-` } }, orderBy: { code: 'desc' } });
    const seq = last ? Number(last.code.slice(-3)) + 1 : 1;
    const row = await this.prisma.intervention.create({
      data: {
        ...dto,
        code: `INT-${year}-${String(seq).padStart(3, '0')}`,
        plannedStart: dayToDate(dto.plannedStart),
        plannedEnd: dayToDate(dto.plannedEnd),
      },
    });
    return this.findOne(row.id);
  }

  async update(id: number, dto: UpdateInterventionDto): Promise<InterventionDetail> {
    const cur = await this.prisma.intervention.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException(`Intervention ${id} introuvable.`);
    const start = dto.plannedStart ?? dateToDay(cur.plannedStart);
    const end = dto.plannedEnd ?? dateToDay(cur.plannedEnd);
    this.checkRange(start, end);
    const today = dayToDate(siteToday());
    const day = (v: string | null | undefined) => (v === undefined ? undefined : v === null ? null : dayToDate(v));

    // Dates réelles renseignées automatiquement au changement de statut (modifiables ensuite)
    let actualStart = day(dto.actualStart);
    let actualEnd = day(dto.actualEnd);
    if (dto.status === InterventionStatus.EN_COURS && !cur.actualStart && actualStart === undefined) actualStart = today;
    if (dto.status && CLOSED.includes(dto.status) && !cur.actualEnd && actualEnd === undefined) actualEnd = today;
    if (dto.status && CLOSED.includes(dto.status) && !cur.actualStart && actualStart === undefined) actualStart = cur.plannedStart;

    await this.prisma.intervention.update({
      where: { id },
      data: {
        ...dto,
        plannedStart: dto.plannedStart ? dayToDate(dto.plannedStart) : undefined,
        plannedEnd: dto.plannedEnd ? dayToDate(dto.plannedEnd) : undefined,
        actualStart,
        actualEnd,
      },
    });
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.prisma.intervention.delete({ where: { id } }).catch(() => {
      throw new NotFoundException(`Intervention ${id} introuvable.`);
    });
  }

  // ───────────── Équipe ─────────────

  async addMember(interventionId: number, dto: MemberDto): Promise<InterventionDetail> {
    await this.ensure(interventionId);
    await this.prisma.interventionMember.create({ data: { ...dto, interventionId } });
    return this.findOne(interventionId);
  }

  async updateMember(id: number, dto: UpdateMemberDto): Promise<InterventionDetail> {
    const m = await this.prisma.interventionMember.findUnique({ where: { id } });
    if (!m) throw new NotFoundException(`Intervenant ${id} introuvable.`);
    await this.prisma.interventionMember.update({ where: { id }, data: dto });
    return this.findOne(m.interventionId);
  }

  async removeMember(id: number): Promise<InterventionDetail> {
    const m = await this.prisma.interventionMember.findUnique({ where: { id } });
    if (!m) throw new NotFoundException(`Intervenant ${id} introuvable.`);
    await this.prisma.interventionMember.delete({ where: { id } });
    return this.findOne(m.interventionId);
  }

  // ───────────── Tâches ─────────────

  async addTask(interventionId: number, dto: CreateTaskDto): Promise<InterventionDetail> {
    await this.ensure(interventionId);
    this.checkRange(dto.plannedStart, dto.plannedEnd);
    await this.checkLinks(interventionId, dto.memberIds, dto.enginIds);
    const max = await this.prisma.interventionTask.aggregate({ where: { interventionId }, _max: { position: true } });
    await this.prisma.interventionTask.create({
      data: {
        interventionId,
        title: dto.title,
        description: dto.description,
        plannedStart: dayToDate(dto.plannedStart),
        plannedEnd: dayToDate(dto.plannedEnd),
        position: (max._max.position ?? 0) + 1,
        members: { connect: (dto.memberIds ?? []).map((id) => ({ id })) },
        engins: { connect: (dto.enginIds ?? []).map((id) => ({ id })) },
      },
    });
    return this.findOne(interventionId);
  }

  async updateTask(id: number, dto: UpdateTaskDto): Promise<InterventionDetail> {
    const t = await this.prisma.interventionTask.findUnique({ where: { id } });
    if (!t) throw new NotFoundException(`Tâche ${id} introuvable.`);
    this.checkRange(dto.plannedStart ?? dateToDay(t.plannedStart), dto.plannedEnd ?? dateToDay(t.plannedEnd));
    await this.checkLinks(t.interventionId, dto.memberIds, dto.enginIds);
    const progress = dto.status === TaskStatus.TERMINEE ? 100 : (dto.progress ?? t.progress);
    await this.prisma.interventionTask.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        plannedStart: dto.plannedStart ? dayToDate(dto.plannedStart) : undefined,
        plannedEnd: dto.plannedEnd ? dayToDate(dto.plannedEnd) : undefined,
        progress,
        status: resolveTaskStatus(progress, dto.status, t.status),
        members: dto.memberIds ? { set: dto.memberIds.map((mid) => ({ id: mid })) } : undefined,
        engins: dto.enginIds ? { set: dto.enginIds.map((eid) => ({ id: eid })) } : undefined,
      },
    });
    return this.findOne(t.interventionId);
  }

  async removeTask(id: number): Promise<InterventionDetail> {
    const t = await this.prisma.interventionTask.findUnique({ where: { id } });
    if (!t) throw new NotFoundException(`Tâche ${id} introuvable.`);
    await this.prisma.interventionTask.delete({ where: { id } });
    return this.findOne(t.interventionId);
  }

  // ───────────── Journal des travaux ─────────────

  async addLog(interventionId: number, dto: CreateWorkLogDto): Promise<InterventionDetail> {
    await this.ensure(interventionId);
    if (dto.progressAfter !== undefined && !dto.taskId) throw new BadRequestException("Choisissez la tâche dont l'avancement est mis à jour.");
    await this.prisma.$transaction(async (tx) => {
      if (dto.taskId) {
        const task = await tx.interventionTask.findUnique({ where: { id: dto.taskId } });
        if (!task || task.interventionId !== interventionId) throw new BadRequestException("Cette tâche n'appartient pas à l'intervention.");
        if (dto.progressAfter !== undefined) {
          await tx.interventionTask.update({
            where: { id: task.id },
            data: { progress: dto.progressAfter, status: resolveTaskStatus(dto.progressAfter, undefined, task.status) },
          });
        }
      }
      await tx.workLog.create({
        data: {
          interventionId,
          taskId: dto.taskId ?? null,
          date: dayToDate(dto.date),
          description: dto.description,
          author: dto.author,
          progressAfter: dto.progressAfter ?? null,
        },
      });
      // Premier compte rendu : l'intervention passe « En cours »
      const cur = await tx.intervention.findUniqueOrThrow({ where: { id: interventionId } });
      if (cur.status === InterventionStatus.PLANIFIEE) {
        await tx.intervention.update({
          where: { id: interventionId },
          data: { status: InterventionStatus.EN_COURS, actualStart: cur.actualStart ?? dayToDate(dto.date) },
        });
      }
    });
    return this.findOne(interventionId);
  }

  async removeLog(id: number): Promise<InterventionDetail> {
    const l = await this.prisma.workLog.findUnique({ where: { id } });
    if (!l) throw new NotFoundException(`Compte rendu ${id} introuvable.`);
    await this.prisma.workLog.delete({ where: { id } });
    return this.findOne(l.interventionId);
  }

  // ───────────── Aides ─────────────

  private summary(r: DetailRow, conflicts: Map<number, string[]>): InterventionSummary {
    const today = dayToDate(siteToday());
    const progress = r.tasks.length ? Math.round(r.tasks.reduce((s, t) => s + t.progress, 0) / r.tasks.length) : 0;
    return {
      id: r.id,
      code: r.code,
      title: r.title,
      workType: r.workType,
      providerKind: r.providerKind,
      company: r.company,
      managerName: r.managerName,
      managerPhone: r.managerPhone,
      zone: r.zone ? { id: r.zone.id, name: r.zone.name } : null,
      description: r.description,
      plannedStart: dateToDay(r.plannedStart),
      plannedEnd: dateToDay(r.plannedEnd),
      actualStart: r.actualStart ? dateToDay(r.actualStart) : null,
      actualEnd: r.actualEnd ? dateToDay(r.actualEnd) : null,
      status: r.status,
      progress,
      late: !CLOSED.includes(r.status) && r.plannedEnd < today,
      taskCount: r.tasks.length,
      doneTasks: r.tasks.filter((t) => t.status === TaskStatus.TERMINEE).length,
      memberCount: r.members.length,
      warningCount: r.tasks.reduce((s, t) => s + (conflicts.get(t.id)?.length ?? 0), 0),
    };
  }

  /** Avertissements par tâche : même engin réservé sur une autre tâche active aux mêmes dates, ou engin indisponible */
  private async conflictIndex(): Promise<Map<number, string[]>> {
    const tasks = await this.prisma.interventionTask.findMany({
      where: { status: { not: TaskStatus.TERMINEE }, intervention: { status: { notIn: CLOSED } }, engins: { some: {} } },
      include: { engins: true, intervention: { select: { code: true } } },
    });
    const out = new Map<number, string[]>();
    for (const t of tasks) {
      const warnings: string[] = [];
      for (const e of t.engins) {
        if (e.status !== EnginStatus.DISPONIBLE) warnings.push(`${e.code} ${e.name} : ${ENGIN_STATUS_LABEL[e.status]}`);
        for (const o of tasks) {
          if (o.id === t.id || !o.engins.some((x) => x.id === e.id)) continue;
          if (o.plannedStart <= t.plannedEnd && t.plannedStart <= o.plannedEnd) {
            warnings.push(`${e.code} ${e.name} déjà prévu sur « ${o.title} » (${o.intervention.code}) du ${fr(o.plannedStart)} au ${fr(o.plannedEnd)}`);
          }
        }
      }
      if (warnings.length) out.set(t.id, warnings);
    }
    return out;
  }

  private async ensure(id: number): Promise<void> {
    if (!(await this.prisma.intervention.findUnique({ where: { id } }))) throw new NotFoundException(`Intervention ${id} introuvable.`);
  }

  private checkRange(start: string, end: string): void {
    if (end < start) throw new BadRequestException('La date de fin doit être postérieure ou égale à la date de début.');
  }

  private async checkLinks(interventionId: number, memberIds?: number[], enginIds?: number[]): Promise<void> {
    if (memberIds?.length) {
      const n = await this.prisma.interventionMember.count({ where: { id: { in: memberIds }, interventionId } });
      if (n !== new Set(memberIds).size) throw new BadRequestException("Un intervenant sélectionné ne fait pas partie de l'équipe.");
    }
    if (enginIds?.length) {
      const n = await this.prisma.engin.count({ where: { id: { in: enginIds } } });
      if (n !== new Set(enginIds).size) throw new BadRequestException('Engin inconnu.');
    }
  }
}

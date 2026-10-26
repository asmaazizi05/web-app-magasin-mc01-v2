import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Engin,
  EnginCheck,
  EnginStatus,
  InterventionStatus,
  MaintenanceRecord,
  MaintenanceType,
  Prisma,
  TaskStatus,
} from '@prisma/client';
import { addDays, addMonths, dateToDay, dayToDate, siteToday } from '../common/site-time';
import { toNumber } from '../common/stock';
import { isUniqueViolation } from '../common/stock-ledger';
import { alertConfig } from '../common/alert-config';
import { PrismaService } from '../prisma/prisma.service';
import { removeStoredFile } from '../stock-sheets/upload';
import {
  ChecklistItem,
  checklistFor,
  ENERGIES,
  ENGIN_TYPES,
  EnginFamily,
  enginFamily,
  INSPECTION_RESULTS,
  USAGES,
} from './engins.config';
import { loadDemoEngins } from './engins.demo';
import { BreakdownDto, ChecklistDto, CloseMaintenanceDto, CreateCheckDto, CreateEnginDto, CreateMaintenanceDto, UpdateEnginDto } from './engins.dto';

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'point';

export type DueStatus = 'OK' | 'BIENTOT' | 'EN_RETARD' | 'A_PLANIFIER' | 'NON_PLANIFIE';

export interface EnginAlert {
  enginId: number;
  code: string;
  name: string;
  severity: 'critique' | 'attention';
  message: string;
}

type DayFields =
  | 'rentalEndDate'
  | 'hourMeterAt'
  | 'lastServiceDate'
  | 'lastInspectionDate'
  | 'photoFileName'
  | 'createdAt'
  | 'checklist';

export interface EnginView extends Omit<Engin, DayFields> {
  family: EnginFamily;
  photoUrl: string | null;
  rentalEndDate: string | null;
  hourMeterAt: string | null;
  lastServiceDate: string | null;
  lastInspectionDate: string | null;
  requiredHabilitation: string | null;
  /** Prochain entretien préventif : date et/ou compteur, le premier atteint fait foi */
  nextService: { date: string | null; hours: number | null; status: DueStatus };
  nextInspection: { date: string | null; status: DueStatus };
  rental: { daysLeft: number; status: DueStatus } | null;
  /** Panne ou intervention en cours */
  openIssue: { id: number; type: MaintenanceType; date: string; description: string } | null;
  alerts: EnginAlert[];
  activeTasks: { taskId: number; title: string; interventionId: number; interventionCode: string; plannedStart: string; plannedEnd: string }[];
}

export interface MaintenanceView {
  id: number;
  type: MaintenanceType;
  date: string;
  endDate: string | null;
  /** Jours d'immobilisation (jusqu'à aujourd'hui si en cours) */
  downtimeDays: number | null;
  hourMeter: number | null;
  description: string;
  partsReplaced: string | null;
  cost: number | null;
  provider: string | null;
  result: string | null;
  documentUrl: string | null;
  documentName: string | null;
}

export interface CheckView {
  id: number;
  date: string;
  operatorName: string;
  hourMeter: number | null;
  allOk: boolean;
  /** Points en anomalie */
  failed: string[];
  comment: string | null;
}

export interface EnginDetail extends EnginView {
  maintenance: MaintenanceView[];
  checks: CheckView[];
  checklist: ChecklistItem[];
  /** true si la check-list a été personnalisée pour cet engin */
  checklistCustom: boolean;
  kpis: { availability90: number; breakdowns12m: number; cost12m: number; costTotal: number; downtimeDays90: number };
}

export interface EnginOptions {
  types: string[];
  energies: string[];
  usages: string[];
  inspectionResults: string[];
}

const CLOSED: InterventionStatus[] = [InterventionStatus.TERMINEE, InterventionStatus.CLOTUREE];
const DAY = 86_400_000;
const LIST_INCLUDE = {
  requiredHabilitationType: true,
  // Interventions en cours, la plus ancienne d'abord (« en panne depuis le … »)
  maintenance: { where: { endDate: null, type: { not: MaintenanceType.CONTROLE_PERIODIQUE } }, orderBy: { date: 'asc' } },
  tasks: {
    where: { status: { not: TaskStatus.TERMINEE }, intervention: { status: { notIn: CLOSED } } },
    include: { intervention: { select: { id: true, code: true } } },
    orderBy: { plannedStart: 'asc' },
  },
} satisfies Prisma.EnginInclude;

type ListRow = Prisma.EnginGetPayload<{ include: typeof LIST_INCLUDE }>;

/** Check-list propre à l'engin, sinon liste type de sa famille */
export function checklistOf(engin: { type: string; checklist: Prisma.JsonValue | null }): ChecklistItem[] {
  if (Array.isArray(engin.checklist)) {
    return (engin.checklist as unknown[]).filter(
      (i): i is ChecklistItem => typeof i === 'object' && i !== null && typeof (i as ChecklistItem).key === 'string' && typeof (i as ChecklistItem).label === 'string',
    );
  }
  return checklistFor(engin.type);
}

const day = (d: Date | null): string | null => (d ? dateToDay(d) : null);
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);

@Injectable()
export class EnginsService {
  constructor(private readonly prisma: PrismaService) {}

  options(): EnginOptions {
    return { types: ENGIN_TYPES, energies: ENERGIES, usages: USAGES, inspectionResults: INSPECTION_RESULTS };
  }

  async findAll(): Promise<EnginView[]> {
    const rows = await this.prisma.engin.findMany({ orderBy: { code: 'asc' }, include: LIST_INCLUDE });
    return rows.map((r) => this.view(r));
  }

  /** Alertes du parc : panne, entretien / contrôle en retard ou proche, fin de location */
  async alerts(): Promise<EnginAlert[]> {
    const all = await this.findAll();
    return all.flatMap((e) => e.alerts).sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critique' ? -1 : 1));
  }

  async findOne(id: number): Promise<EnginDetail> {
    const row = await this.prisma.engin.findUnique({ where: { id }, include: LIST_INCLUDE });
    if (!row) throw new NotFoundException(`Engin ${id} introuvable.`);
    const [records, checks] = await Promise.all([
      this.prisma.maintenanceRecord.findMany({ where: { enginId: id }, orderBy: [{ date: 'desc' }, { id: 'desc' }] }),
      this.prisma.enginCheck.findMany({ where: { enginId: id }, orderBy: { date: 'desc' }, take: 60 }),
    ]);
    return {
      ...this.view(row),
      maintenance: records.map((m) => this.maintenanceView(m)),
      checks: checks.map((c) => this.checkView(c)),
      checklist: checklistOf(row),
      checklistCustom: Array.isArray(row.checklist),
      kpis: this.kpis(records),
    };
  }

  async create(dto: CreateEnginDto): Promise<EnginDetail> {
    const code = dto.code?.trim() || (await this.nextCode());
    try {
      const e = await this.prisma.engin.create({
        data: { ...this.data(dto), code, name: dto.name, type: dto.type } as Prisma.EnginUncheckedCreateInput,
      });
      return this.findOne(e.id);
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException(`Le code ${code} existe déjà.`);
      throw err;
    }
  }

  async update(id: number, dto: UpdateEnginDto): Promise<EnginDetail> {
    await this.ensure(id);
    try {
      await this.prisma.engin.update({ where: { id }, data: { ...this.data(dto), code: dto.code?.trim() || undefined } });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('Ce code est déjà utilisé.');
      throw err;
    }
    return this.findOne(id);
  }

  async setPhoto(id: number, file: Express.Multer.File | undefined): Promise<EnginDetail> {
    if (!file) throw new BadRequestException('Aucune photo reçue.');
    const e = await this.ensure(id);
    await this.prisma.engin.update({ where: { id }, data: { photoFileName: file.filename } });
    removeStoredFile(e.photoFileName);
    return this.findOne(id);
  }

  async setStatus(id: number, status: EnginStatus): Promise<EnginDetail> {
    await this.ensure(id);
    await this.prisma.engin.update({ where: { id }, data: { status } });
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const engin = await this.prisma.engin.findUnique({ where: { id }, include: { _count: { select: { tasks: true } }, maintenance: true } });
    if (!engin) throw new NotFoundException(`Engin ${id} introuvable.`);
    if (engin._count.tasks > 0) throw new BadRequestException('Cet engin est affecté à des tâches : retirez-le des tâches ou passez-le « Hors service ».');
    await this.prisma.engin.delete({ where: { id } });
    removeStoredFile(engin.photoFileName);
    for (const m of engin.maintenance) removeStoredFile(m.fileName);
  }

  // ───────────── Maintenance ─────────────

  /** Enregistre une intervention ; met à jour compteur, dernier entretien / contrôle et statut de l'engin */
  async addMaintenance(id: number, dto: CreateMaintenanceDto, file?: Express.Multer.File): Promise<EnginDetail> {
    const engin = await this.ensure(id);
    const date = dayToDate(dto.date);
    const isControl = dto.type === MaintenanceType.CONTROLE_PERIODIQUE;
    const endDate = isControl ? date : dto.endDate ? dayToDate(dto.endDate) : null;
    if (endDate && endDate < date) throw new BadRequestException('La remise en service doit suivre la date de début.');

    await this.prisma.$transaction(async (tx) => {
      await tx.maintenanceRecord.create({
        data: {
          enginId: id,
          type: dto.type,
          date,
          endDate,
          hourMeter: dto.hourMeter ?? null,
          description: dto.description,
          partsReplaced: dto.partsReplaced || null,
          cost: dto.cost ?? null,
          provider: dto.provider || null,
          result: isControl ? (dto.result ?? 'Conforme') : null,
          fileName: file?.filename ?? null,
          originalName: file?.originalname ?? null,
        },
      });
      const data: Prisma.EnginUpdateInput = { ...this.meterUpdate(engin, dto.hourMeter, date) };
      if (dto.type === MaintenanceType.PREVENTIVE && (!engin.lastServiceDate || date >= engin.lastServiceDate)) {
        data.lastServiceDate = date;
        data.lastServiceHours = dto.hourMeter ?? engin.hourMeter ?? null;
      }
      if (isControl && (!engin.lastInspectionDate || date >= engin.lastInspectionDate)) {
        data.lastInspectionDate = date;
        // Engin de levage non conforme : interdit d'utilisation jusqu'à remise en conformité
        if (dto.result === 'Non conforme') data.status = EnginStatus.HORS_SERVICE;
      }
      if (!endDate && !isControl) data.status = dto.type === MaintenanceType.PANNE ? EnginStatus.EN_PANNE : EnginStatus.MAINTENANCE;
      await tx.engin.update({ where: { id }, data });
    });
    return this.findOne(id);
  }

  async declareBreakdown(id: number, dto: BreakdownDto): Promise<EnginDetail> {
    return this.addMaintenance(id, {
      type: MaintenanceType.PANNE,
      date: dto.date ?? siteToday(),
      description: dto.description,
      hourMeter: dto.hourMeter,
    });
  }

  /** Clôture une panne / intervention : l'engin redevient disponible s'il n'a plus rien en cours */
  async closeMaintenance(recordId: number, dto: CloseMaintenanceDto): Promise<EnginDetail> {
    const rec = await this.prisma.maintenanceRecord.findUnique({ where: { id: recordId } });
    if (!rec) throw new NotFoundException(`Intervention ${recordId} introuvable.`);
    if (rec.endDate) throw new BadRequestException('Cette intervention est déjà clôturée.');
    const endDate = dto.endDate ? dayToDate(dto.endDate) : dayToDate(siteToday());
    if (endDate < rec.date) throw new BadRequestException('La remise en service doit suivre la date de début.');
    await this.prisma.$transaction(async (tx) => {
      await tx.maintenanceRecord.update({
        where: { id: recordId },
        data: { endDate, cost: dto.cost, partsReplaced: dto.partsReplaced, provider: dto.provider },
      });
      await this.releaseIfIdle(tx, rec.enginId);
    });
    return this.findOne(rec.enginId);
  }

  async removeMaintenance(recordId: number): Promise<EnginDetail> {
    const rec = await this.prisma.maintenanceRecord.findUnique({ where: { id: recordId } });
    if (!rec) throw new NotFoundException(`Intervention ${recordId} introuvable.`);
    await this.prisma.$transaction(async (tx) => {
      await tx.maintenanceRecord.delete({ where: { id: recordId } });
      await this.releaseIfIdle(tx, rec.enginId);
    });
    removeStoredFile(rec.fileName);
    return this.findOne(rec.enginId);
  }

  // ───────────── Check-list de prise de poste ─────────────

  async addCheck(id: number, dto: CreateCheckDto): Promise<EnginDetail> {
    const engin = await this.ensure(id);
    const template = checklistOf(engin);
    const answers = new Map(dto.items.map((i) => [i.key, i.ok]));
    const missing = template.filter((t) => !answers.has(t.key));
    if (missing.length) throw new BadRequestException(`Points non renseignés : ${missing.map((m) => m.label).join(', ')}.`);
    const items = template.map((t) => ({ key: t.key, label: t.label, ok: answers.get(t.key) as boolean }));
    const failed = items.filter((i) => !i.ok);

    let operatorName = dto.operatorName?.trim() ?? '';
    if (dto.storekeeperId) {
      const sk = await this.prisma.storekeeper.findUnique({ where: { id: dto.storekeeperId } });
      if (!sk) throw new BadRequestException('Magasinier inconnu.');
      operatorName = sk.name;
    }
    if (!operatorName) throw new BadRequestException('Indiquez le conducteur.');

    const today = dayToDate(siteToday());
    await this.prisma.$transaction(async (tx) => {
      await tx.enginCheck.create({
        data: {
          enginId: id,
          storekeeperId: dto.storekeeperId ?? null,
          operatorName,
          hourMeter: dto.hourMeter ?? null,
          items,
          allOk: failed.length === 0,
          comment: dto.comment || null,
        },
      });
      const meter = this.meterUpdate(engin, dto.hourMeter, today);
      if (Object.keys(meter).length) await tx.engin.update({ where: { id }, data: meter });
      if (dto.stopEngin && failed.length) {
        await tx.maintenanceRecord.create({
          data: {
            enginId: id,
            type: MaintenanceType.PANNE,
            date: today,
            hourMeter: dto.hourMeter ?? null,
            description: `Anomalie check-list (${operatorName}) : ${failed.map((f) => f.label).join(', ')}${dto.comment ? ` — ${dto.comment}` : ''}`,
          },
        });
        await tx.engin.update({ where: { id }, data: { status: EnginStatus.EN_PANNE } });
      }
    });
    return this.findOne(id);
  }

  async removeCheck(checkId: number): Promise<EnginDetail> {
    const c = await this.prisma.enginCheck.findUnique({ where: { id: checkId } });
    if (!c) throw new NotFoundException(`Check-list ${checkId} introuvable.`);
    await this.prisma.enginCheck.delete({ where: { id: checkId } });
    return this.findOne(c.enginId);
  }

  /** Remplace la check-list de l'engin (clés conservées pour les points existants) ; `reset` = retour à la liste type */
  async setChecklist(id: number, dto: ChecklistDto): Promise<EnginDetail> {
    const engin = await this.ensure(id);
    if (dto.reset) {
      await this.prisma.engin.update({ where: { id }, data: { checklist: Prisma.DbNull } });
      return this.findOne(id);
    }
    const items = dto.items ?? [];
    if (items.length === 0) throw new BadRequestException('La check-list doit contenir au moins un point.');
    const current = new Map(checklistOf(engin).map((c) => [c.key, c]));
    const used = new Set<string>();
    const list: ChecklistItem[] = items.map((it) => {
      const label = it.label.trim();
      let key = it.key && current.has(it.key) && !used.has(it.key) ? it.key : slug(label);
      for (let n = 2; used.has(key); n++) key = `${slug(label)}-${n}`;
      used.add(key);
      return { key, label };
    });
    await this.prisma.engin.update({ where: { id }, data: { checklist: list as unknown as Prisma.InputJsonValue } });
    return this.findOne(id);
  }

  /** Supprime tous les engins de démonstration (et leur historique) */
  async removeDemo(): Promise<{ removed: number }> {
    const demo = await this.prisma.engin.findMany({ where: { isDemo: true }, include: { maintenance: true } });
    await this.prisma.engin.deleteMany({ where: { isDemo: true } });
    for (const e of demo) {
      removeStoredFile(e.photoFileName);
      for (const m of e.maintenance) removeStoredFile(m.fileName);
    }
    return { removed: demo.length };
  }

  async loadDemo(): Promise<{ created: number }> {
    return { created: await loadDemoEngins(this.prisma) };
  }

  // ───────────── Calculs ─────────────

  private view(r: ListRow): EnginView {
    const { requiredHabilitationType, maintenance, tasks, photoFileName, checklist: _checklist, ...e } = r;
    const today = dayToDate(siteToday());
    const soon = addDays(today, alertConfig.enginAlertDays);

    // Entretien préventif
    let nextService: EnginView['nextService'] = { date: null, hours: null, status: 'NON_PLANIFIE' };
    if (e.serviceIntervalHours || e.serviceIntervalMonths) {
      const dueDate = e.lastServiceDate && e.serviceIntervalMonths ? addMonths(e.lastServiceDate, e.serviceIntervalMonths) : null;
      const baseHours = e.lastServiceHours ?? (e.lastServiceDate ? null : 0);
      const dueHours = e.serviceIntervalHours && baseHours !== null ? baseHours + e.serviceIntervalHours : null;
      let status: DueStatus = 'OK';
      if (!e.lastServiceDate && e.lastServiceHours === null && !(e.hourMeter !== null && dueHours !== null)) status = 'A_PLANIFIER';
      else if ((dueDate && dueDate < today) || (dueHours !== null && e.hourMeter !== null && e.hourMeter >= dueHours)) status = 'EN_RETARD';
      else if ((dueDate && dueDate <= soon) || (dueHours !== null && e.hourMeter !== null && e.hourMeter >= dueHours - alertConfig.enginAlertHours)) status = 'BIENTOT';
      nextService = { date: day(dueDate), hours: dueHours, status };
    }

    // Contrôle périodique réglementaire
    const inspDate = e.lastInspectionDate ? addMonths(e.lastInspectionDate, e.inspectionIntervalMonths) : null;
    const nextInspection: EnginView['nextInspection'] = {
      date: day(inspDate),
      status: !inspDate ? 'A_PLANIFIER' : inspDate < today ? 'EN_RETARD' : inspDate <= soon ? 'BIENTOT' : 'OK',
    };

    // Location
    let rental: EnginView['rental'] = null;
    if (e.ownership === 'LOCATION' && e.rentalEndDate) {
      const daysLeft = daysBetween(today, e.rentalEndDate);
      rental = { daysLeft, status: daysLeft < 0 ? 'EN_RETARD' : daysLeft <= alertConfig.enginAlertDays ? 'BIENTOT' : 'OK' };
    }

    const open = maintenance[0];
    const alerts: EnginAlert[] = [];
    const push = (severity: EnginAlert['severity'], message: string) => alerts.push({ enginId: e.id, code: e.code, name: e.name, severity, message });
    if (e.status === EnginStatus.EN_PANNE) push('critique', `En panne${open ? ` depuis le ${dateToDay(open.date).split('-').reverse().join('/')}` : ''}`);
    if (e.status === EnginStatus.HORS_SERVICE) push('critique', 'Hors service');
    if (nextInspection.status === 'EN_RETARD') push('critique', 'Contrôle périodique dépassé');
    if (nextInspection.status === 'BIENTOT') push('attention', 'Contrôle périodique à prévoir');
    if (nextInspection.status === 'A_PLANIFIER') push('attention', 'Aucun contrôle périodique enregistré');
    if (nextService.status === 'EN_RETARD') push('critique', 'Entretien préventif en retard');
    if (nextService.status === 'BIENTOT') push('attention', 'Entretien préventif à prévoir');
    if (rental?.status === 'EN_RETARD') push('critique', 'Location échue');
    if (rental?.status === 'BIENTOT') push('attention', `Fin de location dans ${rental.daysLeft} j`);

    return {
      ...e,
      family: enginFamily(e.type),
      photoUrl: photoFileName ? `/uploads/${photoFileName}` : null,
      rentalEndDate: day(e.rentalEndDate),
      hourMeterAt: day(e.hourMeterAt),
      lastServiceDate: day(e.lastServiceDate),
      lastInspectionDate: day(e.lastInspectionDate),
      requiredHabilitation: requiredHabilitationType?.name ?? null,
      nextService,
      nextInspection,
      rental,
      openIssue: open ? { id: open.id, type: open.type, date: dateToDay(open.date), description: open.description } : null,
      alerts,
      activeTasks: tasks.map((t) => ({
        taskId: t.id,
        title: t.title,
        interventionId: t.intervention.id,
        interventionCode: t.intervention.code,
        plannedStart: dateToDay(t.plannedStart),
        plannedEnd: dateToDay(t.plannedEnd),
      })),
    };
  }

  private maintenanceView(m: MaintenanceRecord): MaintenanceView {
    const today = dayToDate(siteToday());
    const isControl = m.type === MaintenanceType.CONTROLE_PERIODIQUE;
    return {
      id: m.id,
      type: m.type,
      date: dateToDay(m.date),
      endDate: day(m.endDate),
      downtimeDays: isControl ? null : daysBetween(m.date, m.endDate ?? today),
      hourMeter: m.hourMeter,
      description: m.description,
      partsReplaced: m.partsReplaced,
      cost: m.cost !== null ? toNumber(m.cost) : null,
      provider: m.provider,
      result: m.result,
      documentUrl: m.fileName ? `/uploads/${m.fileName}` : null,
      documentName: m.originalName,
    };
  }

  private checkView(c: EnginCheck): CheckView {
    const items = (Array.isArray(c.items) ? c.items : []) as { label?: string; ok?: boolean }[];
    return {
      id: c.id,
      date: c.date.toISOString(),
      operatorName: c.operatorName,
      hourMeter: c.hourMeter,
      allOk: c.allOk,
      failed: items.filter((i) => i.ok === false).map((i) => i.label ?? ''),
      comment: c.comment,
    };
  }

  /** Disponibilité sur 90 jours = 1 − jours d'immobilisation (pannes, réparations, entretiens) / 90 */
  private kpis(records: MaintenanceRecord[]): EnginDetail['kpis'] {
    const today = dayToDate(siteToday());
    const from90 = addDays(today, -90);
    const from365 = addDays(today, -365);
    // Périodes d'immobilisation fusionnées : deux pannes simultanées ne comptent qu'une fois
    const periods = records
      .filter((m) => m.type !== MaintenanceType.CONTROLE_PERIODIQUE)
      .map((m) => ({ start: m.date > from90 ? m.date : from90, end: m.endDate ?? today }))
      .filter((p) => p.end > p.start)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    let downtime = 0;
    let cursor: Date | null = null;
    for (const p of periods) {
      const start = cursor && cursor > p.start ? cursor : p.start;
      if (p.end > start) downtime += daysBetween(start, p.end);
      if (!cursor || p.end > cursor) cursor = p.end;
    }
    const downtimeDays90 = Math.min(downtime, 90);
    return {
      availability90: Math.round(((90 - downtimeDays90) / 90) * 1000) / 10,
      breakdowns12m: records.filter((m) => m.type === MaintenanceType.PANNE && m.date >= from365).length,
      cost12m: records.filter((m) => m.date >= from365).reduce((s, m) => s + (m.cost !== null ? toNumber(m.cost) : 0), 0),
      costTotal: records.reduce((s, m) => s + (m.cost !== null ? toNumber(m.cost) : 0), 0),
      downtimeDays90,
    };
  }

  // ───────────── Aides ─────────────

  private data(dto: UpdateEnginDto): Prisma.EnginUncheckedUpdateInput {
    const d = (v: string | null | undefined) => (v === undefined ? undefined : v === null || v === '' ? null : dayToDate(v));
    const { code: _code, rentalEndDate, lastServiceDate, lastInspectionDate, hourMeter, ...rest } = dto;
    return {
      ...rest,
      rentalEndDate: d(rentalEndDate),
      lastServiceDate: d(lastServiceDate),
      lastInspectionDate: d(lastInspectionDate),
      hourMeter,
      hourMeterAt: hourMeter !== undefined ? dayToDate(siteToday()) : undefined,
    } as Prisma.EnginUncheckedUpdateInput;
  }

  /** Le compteur d'heures ne fait qu'augmenter */
  private meterUpdate(engin: Engin, hourMeter: number | undefined, at: Date): Prisma.EnginUpdateInput {
    if (hourMeter === undefined || (engin.hourMeter !== null && hourMeter <= engin.hourMeter)) return {};
    return { hourMeter, hourMeterAt: at };
  }

  private async releaseIfIdle(tx: Prisma.TransactionClient, enginId: number): Promise<void> {
    const open = await tx.maintenanceRecord.count({
      where: { enginId, endDate: null, type: { not: MaintenanceType.CONTROLE_PERIODIQUE } },
    });
    const engin = await tx.engin.findUniqueOrThrow({ where: { id: enginId } });
    if (open === 0 && (engin.status === EnginStatus.EN_PANNE || engin.status === EnginStatus.MAINTENANCE)) {
      await tx.engin.update({ where: { id: enginId }, data: { status: EnginStatus.DISPONIBLE } });
    }
  }

  private async ensure(id: number): Promise<Engin> {
    const e = await this.prisma.engin.findUnique({ where: { id } });
    if (!e) throw new NotFoundException(`Engin ${id} introuvable.`);
    return e;
  }

  private async nextCode(): Promise<string> {
    const engins = await this.prisma.engin.findMany({ select: { code: true } });
    const max = Math.max(0, ...engins.map((e) => Number(e.code.replace(/\D/g, '')) || 0));
    return `ENG-${String(max + 1).padStart(2, '0')}`;
  }
}

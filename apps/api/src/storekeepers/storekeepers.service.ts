import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Habilitation, HabilitationType, ShiftType, Storekeeper, Training } from '@prisma/client';
import { addDays, addMonths, currentWeekStart, dateToDay, dayToDate, siteToday } from '../common/site-time';
import { isUniqueViolation } from '../common/stock-ledger';
import { PrismaService } from '../prisma/prisma.service';
import { ShiftsService } from '../shifts/shifts.service';
import { removeStoredFile } from '../stock-sheets/upload';
import {
  CreateHabilitationDto,
  CreateStorekeeperDto,
  CreateTrainingDto,
  HabilitationTypeDto,
  UpdateHabilitationDto,
  UpdateHabilitationTypeDto,
  UpdateStorekeeperDto,
  UpdateTrainingDto,
} from './storekeepers.dto';

export type HabilitationStatus = 'VALIDE' | 'BIENTOT' | 'EXPIREE';

export interface StorekeeperBase extends Omit<Storekeeper, 'hireDate'> {
  hireDate: string | null;
}

export interface StorekeeperSummary extends StorekeeperBase {
  currentPost: ShiftType | null;
  habilitations: { valid: number; soon: number; expired: number };
  nextExpiry: { typeName: string; expiresAt: string; status: HabilitationStatus } | null;
  trainingCount: number;
}

export interface HabilitationView {
  id: number;
  storekeeperId: number;
  typeId: number;
  typeName: string;
  reference: string | null;
  organization: string | null;
  obtainedAt: string;
  expiresAt: string;
  status: HabilitationStatus;
  /** Jours restants (négatif si expirée) */
  daysLeft: number;
  /** Remplacée par une habilitation plus récente du même type (historique) */
  superseded: boolean;
  documentUrl: string | null;
  documentName: string | null;
}

export interface TrainingView {
  id: number;
  title: string;
  organization: string | null;
  date: string;
  durationHours: number | null;
  documentUrl: string | null;
  documentName: string | null;
}

export interface StorekeeperProfile extends StorekeeperSummary {
  /** Planning des 6 prochaines semaines (à partir de la semaine en cours) */
  upcoming: { weekStart: string; type: ShiftType | null; locked: boolean }[];
  habilitationList: HabilitationView[];
  trainings: TrainingView[];
  /** Engins et autorisation de conduite (habilitation requise valide) */
  engins: { id: number; code: string; name: string; requiredHabilitation: string | null; allowed: boolean }[];
}

export interface HabilitationAlert extends HabilitationView {
  storekeeperName: string;
  matricule: string;
}

export interface HabilitationTypeView extends HabilitationType {
  usage: number;
}

const DAY = 86_400_000;
const docUrl = (fileName: string | null) => (fileName ? `/uploads/${fileName}` : null);

@Injectable()
export class StorekeepersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shifts: ShiftsService,
  ) {}

  // ───────────── Magasiniers ─────────────

  async findAll(): Promise<StorekeeperSummary[]> {
    const [storekeepers, posts, alertDays] = await Promise.all([
      this.prisma.storekeeper.findMany({
        orderBy: { matricule: 'asc' },
        include: { habilitations: { include: { type: true } }, _count: { select: { trainings: true } } },
      }),
      this.shifts.currentPosts(),
      this.alertDays(),
    ]);
    return storekeepers.map(({ habilitations, _count, ...sk }) =>
      this.summary(sk, habilitations, _count.trainings, posts.get(sk.id) ?? null, alertDays),
    );
  }

  async findOne(id: number): Promise<Storekeeper> {
    const sk = await this.prisma.storekeeper.findUnique({ where: { id } });
    if (!sk) throw new NotFoundException(`Magasinier ${id} introuvable.`);
    return sk;
  }

  async profile(id: number): Promise<StorekeeperProfile> {
    const sk = await this.prisma.storekeeper.findUnique({
      where: { id },
      include: { habilitations: { include: { type: true } }, trainings: { orderBy: { date: 'desc' } } },
    });
    if (!sk) throw new NotFoundException(`Magasinier ${id} introuvable.`);
    const from = currentWeekStart();
    const [posts, alertDays, shifts, engins] = await Promise.all([
      this.shifts.currentPosts(),
      this.alertDays(),
      this.prisma.shift.findMany({ where: { storekeeperId: id, weekStart: { gte: from, lt: addDays(from, 42) } } }),
      this.prisma.engin.findMany({ include: { requiredHabilitationType: true }, orderBy: { code: 'asc' } }),
    ]);
    const { habilitations, trainings, ...base } = sk;
    const list = this.habilitationViews(habilitations, alertDays);
    const validTypes = new Set(list.filter((h) => !h.superseded && h.status !== 'EXPIREE').map((h) => h.typeId));

    return {
      ...this.summary(base, habilitations, trainings.length, posts.get(id) ?? null, alertDays),
      upcoming: Array.from({ length: 6 }, (_, i) => {
        const w = addDays(from, i * 7);
        const s = shifts.find((x) => x.weekStart.getTime() === w.getTime());
        return { weekStart: dateToDay(w), type: s?.type ?? null, locked: s?.locked ?? false };
      }),
      habilitationList: list,
      trainings: trainings.map((t) => this.trainingView(t)),
      engins: engins.map((e) => ({
        id: e.id,
        code: e.code,
        name: e.name,
        requiredHabilitation: e.requiredHabilitationType?.name ?? null,
        allowed: e.requiredHabilitationTypeId === null || validTypes.has(e.requiredHabilitationTypeId),
      })),
    };
  }

  async create(dto: CreateStorekeeperDto): Promise<StorekeeperBase> {
    try {
      const sk = await this.prisma.storekeeper.create({
        data: { ...dto, hireDate: dto.hireDate ? dayToDate(dto.hireDate) : null },
      });
      return this.base(sk);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException(`Le matricule ${dto.matricule} existe déjà.`);
      throw e;
    }
  }

  async update(id: number, dto: UpdateStorekeeperDto): Promise<StorekeeperBase> {
    await this.findOne(id);
    try {
      const sk = await this.prisma.storekeeper.update({
        where: { id },
        data: { ...dto, hireDate: dto.hireDate === undefined ? undefined : dto.hireDate ? dayToDate(dto.hireDate) : null },
      });
      if (dto.fixedPost) await this.shifts.applyFixedPost(id, dto.fixedPost);
      return this.base(sk);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Ce matricule est déjà utilisé.');
      throw e;
    }
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    const used =
      (await this.prisma.reception.count({ where: { receiverId: id } })) +
      (await this.prisma.stockMovement.count({ where: { storekeeperId: id } })) +
      (await this.prisma.stockSheet.count({ where: { storekeeperId: id } }));
    if (used > 0) throw new BadRequestException('Ce magasinier est référencé par des documents de stock.');
    await this.prisma.storekeeper.delete({ where: { id } });
  }

  // ───────────── Formations ─────────────

  async addTraining(storekeeperId: number, dto: CreateTrainingDto, file?: Express.Multer.File): Promise<TrainingView> {
    await this.findOne(storekeeperId);
    const t = await this.prisma.training.create({
      data: {
        storekeeperId,
        title: dto.title,
        organization: dto.organization || null,
        date: dayToDate(dto.date),
        durationHours: dto.durationHours ?? null,
        fileName: file?.filename ?? null,
        originalName: file?.originalname ?? null,
      },
    });
    return this.trainingView(t);
  }

  async updateTraining(id: number, dto: UpdateTrainingDto): Promise<TrainingView> {
    if (!(await this.prisma.training.findUnique({ where: { id } }))) throw new NotFoundException(`Formation ${id} introuvable.`);
    const t = await this.prisma.training.update({
      where: { id },
      data: { ...dto, date: dto.date ? dayToDate(dto.date) : undefined },
    });
    return this.trainingView(t);
  }

  async removeTraining(id: number): Promise<void> {
    const t = await this.prisma.training.findUnique({ where: { id } });
    if (!t) throw new NotFoundException(`Formation ${id} introuvable.`);
    await this.prisma.training.delete({ where: { id } });
    removeStoredFile(t.fileName);
  }

  // ───────────── Habilitations ─────────────

  async addHabilitation(storekeeperId: number, dto: CreateHabilitationDto, file?: Express.Multer.File): Promise<HabilitationView> {
    await this.findOne(storekeeperId);
    const type = await this.prisma.habilitationType.findUnique({ where: { id: dto.typeId } });
    if (!type) throw new BadRequestException("Type d'habilitation inconnu.");
    const obtainedAt = dayToDate(dto.obtainedAt);
    const expiresAt = dto.expiresAt ? dayToDate(dto.expiresAt) : addMonths(obtainedAt, type.validityMonths);
    if (expiresAt <= obtainedAt) throw new BadRequestException("La date d'expiration doit suivre la date d'obtention.");
    const h = await this.prisma.habilitation.create({
      data: {
        storekeeperId,
        typeId: type.id,
        reference: dto.reference || null,
        organization: dto.organization || null,
        obtainedAt,
        expiresAt,
        fileName: file?.filename ?? null,
        originalName: file?.originalname ?? null,
      },
    });
    const views = await this.viewsFor(storekeeperId);
    return views.find((v) => v.id === h.id) as HabilitationView;
  }

  async updateHabilitation(id: number, dto: UpdateHabilitationDto): Promise<HabilitationView> {
    const h = await this.prisma.habilitation.findUnique({ where: { id } });
    if (!h) throw new NotFoundException(`Habilitation ${id} introuvable.`);
    const obtainedAt = dto.obtainedAt ? dayToDate(dto.obtainedAt) : h.obtainedAt;
    const expiresAt = dto.expiresAt ? dayToDate(dto.expiresAt) : h.expiresAt;
    if (expiresAt <= obtainedAt) throw new BadRequestException("La date d'expiration doit suivre la date d'obtention.");
    await this.prisma.habilitation.update({
      where: { id },
      data: { typeId: dto.typeId, reference: dto.reference, organization: dto.organization, obtainedAt, expiresAt },
    });
    const views = await this.viewsFor(h.storekeeperId);
    return views.find((v) => v.id === id) as HabilitationView;
  }

  async removeHabilitation(id: number): Promise<void> {
    const h = await this.prisma.habilitation.findUnique({ where: { id } });
    if (!h) throw new NotFoundException(`Habilitation ${id} introuvable.`);
    await this.prisma.habilitation.delete({ where: { id } });
    removeStoredFile(h.fileName);
  }

  /** Habilitations en cours (dernière de chaque type) expirées ou expirant dans le délai d'alerte */
  async alerts(): Promise<HabilitationAlert[]> {
    const [habilitations, alertDays] = await Promise.all([
      this.prisma.habilitation.findMany({ include: { type: true, storekeeper: true } }),
      this.alertDays(),
    ]);
    const people = new Map(habilitations.map((h) => [h.id, h.storekeeper]));
    return this.habilitationViews(habilitations, alertDays)
      .filter((v) => !v.superseded && v.status !== 'VALIDE')
      .map((v) => {
        const sk = people.get(v.id) as Storekeeper;
        return { ...v, storekeeperName: sk.name, matricule: sk.matricule };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }

  // ───────────── Types d'habilitation ─────────────

  async types(): Promise<HabilitationTypeView[]> {
    const types = await this.prisma.habilitationType.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { habilitations: true, engins: true } } },
    });
    return types.map(({ _count, ...t }) => ({ ...t, usage: _count.habilitations + _count.engins }));
  }

  async createType(dto: HabilitationTypeDto): Promise<HabilitationType> {
    const max = await this.prisma.habilitationType.aggregate({ _max: { position: true } });
    try {
      return await this.prisma.habilitationType.create({ data: { ...dto, position: (max._max.position ?? 0) + 1 } });
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException("Ce type d'habilitation existe déjà.");
      throw e;
    }
  }

  async updateType(id: number, dto: UpdateHabilitationTypeDto): Promise<HabilitationType> {
    if (!(await this.prisma.habilitationType.findUnique({ where: { id } }))) throw new NotFoundException(`Type ${id} introuvable.`);
    try {
      return await this.prisma.habilitationType.update({ where: { id }, data: dto });
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Ce nom est déjà utilisé.');
      throw e;
    }
  }

  async removeType(id: number): Promise<void> {
    const used =
      (await this.prisma.habilitation.count({ where: { typeId: id } })) +
      (await this.prisma.engin.count({ where: { requiredHabilitationTypeId: id } }));
    if (used > 0) throw new BadRequestException('Ce type est utilisé par des habilitations ou des engins : il ne peut pas être supprimé.');
    await this.prisma.habilitationType.delete({ where: { id } }).catch(() => {
      throw new NotFoundException(`Type ${id} introuvable.`);
    });
  }

  // ───────────── Aides ─────────────

  private async alertDays(): Promise<number> {
    const s = await this.prisma.settings.findUnique({ where: { id: 1 } });
    return s?.habilitationAlertDays ?? 60;
  }

  private base(sk: Storekeeper): StorekeeperBase {
    return { ...sk, hireDate: sk.hireDate ? dateToDay(sk.hireDate) : null };
  }

  private summary(
    sk: Storekeeper,
    habilitations: (Habilitation & { type: HabilitationType })[],
    trainingCount: number,
    currentPost: ShiftType | null,
    alertDays: number,
  ): StorekeeperSummary {
    const current = this.habilitationViews(habilitations, alertDays).filter((h) => !h.superseded);
    const next = [...current].sort((a, b) => a.daysLeft - b.daysLeft)[0];
    return {
      ...this.base(sk),
      currentPost,
      habilitations: {
        valid: current.filter((h) => h.status === 'VALIDE').length,
        soon: current.filter((h) => h.status === 'BIENTOT').length,
        expired: current.filter((h) => h.status === 'EXPIREE').length,
      },
      nextExpiry: next ? { typeName: next.typeName, expiresAt: next.expiresAt, status: next.status } : null,
      trainingCount,
    };
  }

  /** Statut de chaque habilitation ; seule la plus récente de chaque type (par personne) est « en cours » */
  private habilitationViews(habilitations: (Habilitation & { type: HabilitationType })[], alertDays: number): HabilitationView[] {
    const today = dayToDate(siteToday());
    const latest = new Map<string, Habilitation>();
    for (const h of habilitations) {
      const k = `${h.storekeeperId}:${h.typeId}`;
      const cur = latest.get(k);
      if (!cur || h.obtainedAt > cur.obtainedAt || (h.obtainedAt.getTime() === cur.obtainedAt.getTime() && h.id > cur.id)) latest.set(k, h);
    }
    return habilitations
      .map((h): HabilitationView => {
        const daysLeft = Math.round((h.expiresAt.getTime() - today.getTime()) / DAY);
        const status: HabilitationStatus = daysLeft < 0 ? 'EXPIREE' : daysLeft <= alertDays ? 'BIENTOT' : 'VALIDE';
        return {
          id: h.id,
          storekeeperId: h.storekeeperId,
          typeId: h.typeId,
          typeName: h.type.name,
          reference: h.reference,
          organization: h.organization,
          obtainedAt: dateToDay(h.obtainedAt),
          expiresAt: dateToDay(h.expiresAt),
          status,
          daysLeft,
          superseded: latest.get(`${h.storekeeperId}:${h.typeId}`)?.id !== h.id,
          documentUrl: docUrl(h.fileName),
          documentName: h.originalName,
        };
      })
      .sort(
        (a, b) =>
          Number(a.superseded) - Number(b.superseded) || a.typeName.localeCompare(b.typeName) || b.obtainedAt.localeCompare(a.obtainedAt),
      );
  }

  private async viewsFor(storekeeperId: number): Promise<HabilitationView[]> {
    const [habilitations, alertDays] = await Promise.all([
      this.prisma.habilitation.findMany({ where: { storekeeperId }, include: { type: true } }),
      this.alertDays(),
    ]);
    return this.habilitationViews(habilitations, alertDays);
  }

  private trainingView(t: Training): TrainingView {
    return {
      id: t.id,
      title: t.title,
      organization: t.organization,
      date: dateToDay(t.date),
      durationHours: t.durationHours,
      documentUrl: docUrl(t.fileName),
      documentName: t.originalName,
    };
  }
}

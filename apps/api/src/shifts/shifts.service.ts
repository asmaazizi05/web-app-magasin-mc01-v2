import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Shift, ShiftType, Storekeeper } from '@prisma/client';
import { addDays, currentWeekStart, dateToDay, dayToDate, isoWeek, mondayOf } from '../common/site-time';
import { PrismaService } from '../prisma/prisma.service';
import { ExtendRotationDto, PlanningQueryDto, UpsertShiftDto } from './shifts.dto';

/** Postes de la rotation (les autres valeurs — congé, formation, absent — sont des exceptions ponctuelles) */
export const ROTATION_POSTS: ShiftType[] = [ShiftType.MATIN, ShiftType.APRES_MIDI, ShiftType.NUIT, ShiftType.OFF];

export interface PlanningWeek {
  weekStart: string;
  weekEnd: string;
  isoWeek: number;
  isCurrent: boolean;
}

export interface PlanningCell {
  type: ShiftType;
  locked: boolean;
}

export interface PlanningRow {
  storekeeper: Storekeeper;
  /** Clé : lundi de la semaine (« YYYY-MM-DD ») */
  cells: Record<string, PlanningCell | null>;
}

export interface PlanningView {
  currentWeekStart: string;
  /** Dernière semaine planifiée (toutes personnes confondues) */
  lastPlannedWeek: string | null;
  weeks: PlanningWeek[];
  rows: PlanningRow[];
  /** Effectif par poste et par semaine */
  coverage: Record<string, Partial<Record<ShiftType, number>>>;
}

export interface CurrentAssignmentView {
  weekStart: string;
  posts: { type: ShiftType; storekeepers: Storekeeper[] }[];
  /** Magasiniers en congé, formation ou absents cette semaine */
  away: { type: ShiftType; storekeeper: Storekeeper }[];
}

export interface ShiftCellView extends PlanningCell {
  storekeeperId: number;
  weekStart: string;
}

const isRotationPost = (t: ShiftType) => ROTATION_POSTS.includes(t);

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Planning sur une fenêtre de semaines réelles */
  async planning(query: PlanningQueryDto): Promise<PlanningView> {
    const current = currentWeekStart();
    const start = query.from ? mondayOf(dayToDate(query.from)) : current;
    const count = query.weeks ?? 6;
    const weekStarts = Array.from({ length: count }, (_, i) => addDays(start, i * 7));
    const end = addDays(start, count * 7);

    const [storekeepers, shifts, last] = await Promise.all([
      this.prisma.storekeeper.findMany({ orderBy: { matricule: 'asc' } }),
      this.prisma.shift.findMany({ where: { weekStart: { gte: start, lt: end } } }),
      this.prisma.shift.findFirst({ orderBy: { weekStart: 'desc' } }),
    ]);

    const key = (sid: number, w: Date) => `${sid}:${dateToDay(w)}`;
    const byKey = new Map(shifts.map((s) => [key(s.storekeeperId, s.weekStart), s]));
    const coverage: PlanningView['coverage'] = {};
    for (const w of weekStarts) {
      const c: Partial<Record<ShiftType, number>> = {};
      for (const s of shifts) if (s.weekStart.getTime() === w.getTime()) c[s.type] = (c[s.type] ?? 0) + 1;
      coverage[dateToDay(w)] = c;
    }

    return {
      currentWeekStart: dateToDay(current),
      lastPlannedWeek: last ? dateToDay(last.weekStart) : null,
      weeks: weekStarts.map((w) => ({
        weekStart: dateToDay(w),
        weekEnd: dateToDay(addDays(w, 6)),
        isoWeek: isoWeek(w),
        isCurrent: w.getTime() === current.getTime(),
      })),
      rows: storekeepers.map((sk) => ({
        storekeeper: sk,
        cells: Object.fromEntries(
          weekStarts.map((w) => {
            const s = byKey.get(key(sk.id, w));
            return [dateToDay(w), s ? { type: s.type, locked: s.locked } : null];
          }),
        ),
      })),
      coverage,
    };
  }

  /** Affectation par poste pour la semaine en cours */
  async current(): Promise<CurrentAssignmentView> {
    const week = currentWeekStart();
    const shifts = await this.prisma.shift.findMany({
      where: { weekStart: week },
      include: { storekeeper: true },
      orderBy: { storekeeper: { matricule: 'asc' } },
    });
    return {
      weekStart: dateToDay(week),
      posts: ROTATION_POSTS.map((type) => ({
        type,
        storekeepers: shifts.filter((s) => s.type === type).map((s) => s.storekeeper),
      })),
      away: shifts.filter((s) => !isRotationPost(s.type)).map((s) => ({ type: s.type, storekeeper: s.storekeeper })),
    };
  }

  /** Poste de chaque magasinier pour la semaine en cours */
  async currentPosts(): Promise<Map<number, ShiftType>> {
    const shifts = await this.prisma.shift.findMany({ where: { weekStart: currentWeekStart() } });
    return new Map(shifts.map((s) => [s.storekeeperId, s.type]));
  }

  /** Modifie une case du planning (poste et/ou verrou). Une semaine verrouillée doit d'abord être déverrouillée. */
  async upsert(dto: UpsertShiftDto): Promise<ShiftCellView | null> {
    const weekStart = mondayOf(dayToDate(dto.weekStart));
    const where = { storekeeperId_weekStart: { storekeeperId: dto.storekeeperId, weekStart } };
    const existing = await this.prisma.shift.findUnique({ where });

    if (existing?.locked && dto.locked !== false && dto.type !== undefined) {
      throw new ConflictException('Cette semaine est verrouillée : déverrouillez-la avant de la modifier.');
    }

    if (dto.type === null) {
      if (existing) await this.prisma.shift.delete({ where });
      return null;
    }

    const type = dto.type ?? existing?.type;
    if (!type) throw new BadRequestException('Choisissez un poste avant de verrouiller la semaine.');
    const saved = await this.prisma.shift.upsert({
      where,
      create: { storekeeperId: dto.storekeeperId, weekStart, type, locked: dto.locked ?? false },
      update: { type, locked: dto.locked ?? existing?.locked },
    });
    return this.toCell(saved);
  }

  /**
   * Prolonge la rotation de N semaines après la dernière semaine planifiée :
   * poste fixe s'il y en a un, sinon reprise du poste d'il y a 4 semaines (cycle de rotation),
   * ou d'il y a 8 semaines si la personne était en congé / formation / absente.
   */
  async extend(dto: ExtendRotationDto): Promise<{ created: number; from: string; to: string }> {
    const weeks = dto.weeks ?? 4;
    const last = await this.prisma.shift.findFirst({ orderBy: { weekStart: 'desc' } });
    const firstNew = last ? addDays(last.weekStart, 7) : currentWeekStart();
    const storekeepers = await this.prisma.storekeeper.findMany();
    const history = await this.prisma.shift.findMany({ where: { weekStart: { gte: addDays(firstNew, -8 * 7) } } });
    const known = new Map(history.map((s) => [`${s.storekeeperId}:${s.weekStart.getTime()}`, s.type]));

    const toCreate: { storekeeperId: number; weekStart: Date; type: ShiftType }[] = [];
    for (let i = 0; i < weeks; i++) {
      const w = addDays(firstNew, i * 7);
      for (const sk of storekeepers) {
        let type: ShiftType | undefined = sk.fixedPost ?? undefined;
        if (!type) {
          for (const back of [4, 8]) {
            const t = known.get(`${sk.id}:${addDays(w, -back * 7).getTime()}`);
            if (t && isRotationPost(t)) {
              type = t;
              break;
            }
          }
        }
        if (type) {
          toCreate.push({ storekeeperId: sk.id, weekStart: w, type });
          known.set(`${sk.id}:${w.getTime()}`, type);
        }
      }
    }
    const { count } = await this.prisma.shift.createMany({ data: toCreate, skipDuplicates: true });
    return { created: count, from: dateToDay(firstNew), to: dateToDay(addDays(firstNew, weeks * 7 - 1)) };
  }

  /**
   * Applique un poste fixe aux semaines déjà planifiées à partir de la semaine en cours
   * (cases non verrouillées ; les semaines manquantes jusqu'à la fin du planning sont créées).
   */
  async applyFixedPost(storekeeperId: number, post: ShiftType): Promise<void> {
    const from = currentWeekStart();
    const last = await this.prisma.shift.findFirst({ orderBy: { weekStart: 'desc' } });
    const until = last && last.weekStart >= from ? last.weekStart : from;
    await this.prisma.shift.updateMany({
      where: { storekeeperId, weekStart: { gte: from }, locked: false },
      data: { type: post },
    });
    const data: { storekeeperId: number; weekStart: Date; type: ShiftType }[] = [];
    for (let w = from; w <= until; w = addDays(w, 7)) data.push({ storekeeperId, weekStart: w, type: post });
    await this.prisma.shift.createMany({ data, skipDuplicates: true });
  }

  private toCell(s: Shift): ShiftCellView {
    return { storekeeperId: s.storekeeperId, weekStart: dateToDay(s.weekStart), type: s.type, locked: s.locked };
  }
}

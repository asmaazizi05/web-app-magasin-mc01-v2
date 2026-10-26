import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Article,
  Expedition,
  ExpeditionPriority,
  ExpeditionStatus,
  MovementType,
  ShiftType,
  Storekeeper,
} from '@prisma/client';
import { applyStockMovement, isUniqueViolation, nextDocumentNumber } from '../common/stock-ledger';
import { ArticleRef, StorekeeperRef, toArticleRef, toStorekeeperRef } from '../common/views';
import { PrismaService } from '../prisma/prisma.service';
import { ShiftsService } from '../shifts/shifts.service';
import { CreateExpeditionDto, UpdateExpeditionStatusDto } from './expeditions.dto';

export interface ExpeditionView {
  id: number;
  number: string;
  requesterService: string;
  quantity: number;
  priority: ExpeditionPriority;
  status: ExpeditionStatus;
  requestedAt: Date;
  dueAt: Date;
  servedAt: Date | null;
  article: ArticleRef;
  preparer: StorekeeperRef | null;
  /** Poste (1, 2, 3) du préparateur sur la semaine de rotation courante */
  pickingPost: number | null;
}

const DUE_HOURS: Record<ExpeditionPriority, number> = { URGENT: 4, HAUTE: 24, NORMALE: 72 };
const POST_NUMBER: Partial<Record<ShiftType, number>> = { MATIN: 1, APRES_MIDI: 2, NUIT: 3 };

type ExpeditionRow = Expedition & { article: Article; preparer: Storekeeper | null };

@Injectable()
export class ExpeditionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shifts: ShiftsService,
  ) {}

  async findAll(): Promise<ExpeditionView[]> {
    const [rows, posts] = await Promise.all([
      this.prisma.expedition.findMany({ include: this.include(), orderBy: { requestedAt: 'desc' } }),
      this.shifts.currentPosts(),
    ]);
    return rows.map((r) => this.toView(r, posts));
  }

  async findOne(id: number): Promise<ExpeditionView> {
    const [row, posts] = await Promise.all([
      this.prisma.expedition.findUnique({ where: { id }, include: this.include() }),
      this.shifts.currentPosts(),
    ]);
    if (!row) throw new NotFoundException(`Bon de sortie ${id} introuvable.`);
    return this.toView(row, posts);
  }

  /** Crée le BS, le mouvement de sortie et décrémente le stock dans une seule transaction. */
  async create(dto: CreateExpeditionDto): Promise<ExpeditionView> {
    const requestedAt = dto.requestedAt ? new Date(dto.requestedAt) : new Date();
    const dueAt = dto.dueAt
      ? new Date(dto.dueAt)
      : new Date(requestedAt.getTime() + DUE_HOURS[dto.priority] * 3_600_000);
    try {
      const id = await this.prisma.$transaction(async (tx) => {
        if (dto.preparerId && !(await tx.storekeeper.findUnique({ where: { id: dto.preparerId } }))) {
          throw new NotFoundException(`Magasinier ${dto.preparerId} introuvable.`);
        }
        const number = dto.number ?? (await nextDocumentNumber(tx, 'BS', requestedAt));
        const expedition = await tx.expedition.create({
          data: {
            number,
            requesterService: dto.requesterService,
            articleId: dto.articleId,
            quantity: dto.quantity,
            priority: dto.priority,
            status: dto.preparerId ? ExpeditionStatus.EN_PICKING : ExpeditionStatus.EN_ATTENTE,
            requestedAt,
            dueAt,
            preparerId: dto.preparerId ?? null,
          },
        });
        await applyStockMovement(tx, {
          type: MovementType.OUT,
          articleId: dto.articleId,
          quantity: dto.quantity,
          date: requestedAt,
          documentNumber: number,
          destination: dto.requesterService,
          storekeeperId: dto.preparerId ?? null,
          expeditionId: expedition.id,
        });
        return expedition.id;
      });
      return this.findOne(id);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Ce numéro de BS existe déjà.');
      throw e;
    }
  }

  /** Fait avancer le picking ; une annulation réintègre la quantité en stock via un mouvement IN. */
  async updateStatus(id: number, dto: UpdateExpeditionStatusDto): Promise<ExpeditionView> {
    const current = await this.prisma.expedition.findUnique({ where: { id } });
    if (!current) throw new NotFoundException(`Bon de sortie ${id} introuvable.`);
    if (current.status === ExpeditionStatus.LIVRE || current.status === ExpeditionStatus.ANNULE) {
      throw new BadRequestException(`Le bon ${current.number} est clôturé et ne peut plus changer de statut.`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.expedition.update({
        where: { id },
        data: {
          status: dto.status,
          servedAt: dto.status === ExpeditionStatus.LIVRE ? new Date() : undefined,
        },
      });
      if (dto.status === ExpeditionStatus.ANNULE) {
        await applyStockMovement(tx, {
          type: MovementType.IN,
          articleId: current.articleId,
          quantity: current.quantity,
          date: new Date(),
          documentNumber: `${current.number}-ANN`,
          source: `Annulation ${current.number}`,
          storekeeperId: current.preparerId,
        });
      }
    });
    return this.findOne(id);
  }

  private include() {
    return { article: true, preparer: true } as const;
  }

  private toView(r: ExpeditionRow, posts: Map<number, ShiftType>): ExpeditionView {
    const post = r.preparerId ? posts.get(r.preparerId) : undefined;
    return {
      id: r.id,
      number: r.number,
      requesterService: r.requesterService,
      quantity: r.quantity,
      priority: r.priority,
      status: r.status,
      requestedAt: r.requestedAt,
      dueAt: r.dueAt,
      servedAt: r.servedAt,
      article: toArticleRef(r.article),
      preparer: r.preparer ? toStorekeeperRef(r.preparer) : null,
      pickingPost: post ? (POST_NUMBER[post] ?? null) : null,
    };
  }
}

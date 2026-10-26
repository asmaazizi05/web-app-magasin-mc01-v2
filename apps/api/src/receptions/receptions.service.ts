import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Article, MovementType, Reception, ReceptionStatus, Storekeeper } from '@prisma/client';
import { applyStockMovement, isUniqueViolation, nextDocumentNumber } from '../common/stock-ledger';
import { ArticleRef, StorekeeperRef, toArticleRef, toStorekeeperRef } from '../common/views';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReceptionDto, UpdateReceptionStatusDto } from './receptions.dto';

export interface ReceptionView {
  id: number;
  number: string;
  supplier: string;
  quantity: number;
  receivedAt: Date;
  status: ReceptionStatus;
  article: ArticleRef;
  receiver: StorekeeperRef;
  stockAfter: number | null;
}

type ReceptionRow = Reception & { article: Article; receiver: Storekeeper; movement: { stockAfter: number } | null };

const INCLUDE = { article: true, receiver: true, movement: { select: { stockAfter: true } } } as const;

const toView = (r: ReceptionRow): ReceptionView => ({
  id: r.id,
  number: r.number,
  supplier: r.supplier,
  quantity: r.quantity,
  receivedAt: r.receivedAt,
  status: r.status,
  article: toArticleRef(r.article),
  receiver: toStorekeeperRef(r.receiver),
  stockAfter: r.movement?.stockAfter ?? null,
});

@Injectable()
export class ReceptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ReceptionView[]> {
    const rows = await this.prisma.reception.findMany({ include: INCLUDE, orderBy: { receivedAt: 'desc' } });
    return rows.map(toView);
  }

  async findOne(id: number): Promise<ReceptionView> {
    const row = await this.prisma.reception.findUnique({ where: { id }, include: INCLUDE });
    if (!row) throw new NotFoundException(`Bon de réception ${id} introuvable.`);
    return toView(row);
  }

  /** Crée le BR, le mouvement d'entrée et met à jour le stock dans une seule transaction. */
  async create(dto: CreateReceptionDto): Promise<ReceptionView> {
    const receivedAt = dto.receivedAt ? new Date(dto.receivedAt) : new Date();
    try {
      const id = await this.prisma.$transaction(async (tx) => {
        const receiver = await tx.storekeeper.findUnique({ where: { id: dto.receiverId } });
        if (!receiver) throw new NotFoundException(`Magasinier ${dto.receiverId} introuvable.`);
        const number = dto.number ?? (await nextDocumentNumber(tx, 'BR', receivedAt));
        const reception = await tx.reception.create({
          data: {
            number,
            supplier: dto.supplier,
            articleId: dto.articleId,
            quantity: dto.quantity,
            receivedAt,
            receiverId: dto.receiverId,
            status: dto.status ?? ReceptionStatus.VALIDE,
          },
        });
        await applyStockMovement(tx, {
          type: MovementType.IN,
          articleId: dto.articleId,
          quantity: dto.quantity,
          date: receivedAt,
          documentNumber: number,
          source: dto.supplier,
          storekeeperId: dto.receiverId,
          receptionId: reception.id,
        });
        return reception.id;
      });
      return this.findOne(id);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Ce numéro de BR existe déjà.');
      throw e;
    }
  }

  async updateStatus(id: number, dto: UpdateReceptionStatusDto): Promise<ReceptionView> {
    await this.findOne(id);
    await this.prisma.reception.update({ where: { id }, data: { status: dto.status } });
    return this.findOne(id);
  }
}

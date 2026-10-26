import { Injectable } from '@nestjs/common';
import { MovementType } from '@prisma/client';
import { ArticleRef, StorekeeperRef, toArticleRef, toStorekeeperRef } from '../common/views';
import { PrismaService } from '../prisma/prisma.service';
import { MovementQueryDto } from './movements.dto';

export interface MovementView {
  id: number;
  type: MovementType;
  documentNumber: string;
  date: Date;
  quantity: number;
  signedQuantity: number;
  source: string | null;
  destination: string | null;
  stockAfter: number;
  article: ArticleRef;
  storekeeper: StorekeeperRef | null;
}

export interface MovementSummary {
  entries: number;
  exits: number;
  net: number;
  entryDocuments: number;
  exitDocuments: number;
}

@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: MovementQueryDto): Promise<MovementView[]> {
    const rows = await this.prisma.stockMovement.findMany({
      where: { type: query.type, articleId: query.articleId },
      include: { article: true, storekeeper: true },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: query.limit ?? 500,
    });
    return rows.map((m) => ({
      id: m.id,
      type: m.type,
      documentNumber: m.documentNumber,
      date: m.date,
      quantity: m.quantity,
      signedQuantity: m.type === MovementType.IN ? m.quantity : -m.quantity,
      source: m.source,
      destination: m.destination,
      stockAfter: m.stockAfter,
      article: toArticleRef(m.article),
      storekeeper: m.storekeeper ? toStorekeeperRef(m.storekeeper) : null,
    }));
  }

  async summary(): Promise<MovementSummary> {
    const groups = await this.prisma.stockMovement.groupBy({
      by: ['type'],
      _sum: { quantity: true },
      _count: { _all: true },
    });
    const of = (t: MovementType) => groups.find((g) => g.type === t);
    const entries = of(MovementType.IN)?._sum.quantity ?? 0;
    const exits = of(MovementType.OUT)?._sum.quantity ?? 0;
    return {
      entries,
      exits,
      net: entries - exits,
      entryDocuments: of(MovementType.IN)?._count._all ?? 0,
      exitDocuments: of(MovementType.OUT)?._count._all ?? 0,
    };
  }
}

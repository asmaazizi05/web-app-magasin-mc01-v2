import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MovementType, Prisma, StockMovement } from '@prisma/client';

export interface LedgerEntry {
  type: MovementType;
  articleId: number;
  quantity: number;
  date: Date;
  documentNumber: string;
  source?: string | null;
  destination?: string | null;
  storekeeperId?: number | null;
  receptionId?: number;
  expeditionId?: number;
}

/**
 * Applique un mouvement de stock à l'intérieur d'une transaction :
 * met à jour Article.currentStock puis enregistre la ligne StockMovement avec le stock résultant.
 * Une sortie est refusée si le stock disponible est insuffisant.
 */
export async function applyStockMovement(
  tx: Prisma.TransactionClient,
  entry: LedgerEntry,
): Promise<StockMovement> {
  if (entry.quantity <= 0) {
    throw new BadRequestException('La quantité doit être strictement positive.');
  }

  const article = await tx.article.findUnique({ where: { id: entry.articleId } });
  if (!article) throw new NotFoundException(`Article ${entry.articleId} introuvable.`);

  let stockAfter: number;
  if (entry.type === MovementType.OUT) {
    // Garde atomique : la décrémentation n'a lieu que si le stock est suffisant.
    const { count } = await tx.article.updateMany({
      where: { id: entry.articleId, currentStock: { gte: entry.quantity } },
      data: { currentStock: { decrement: entry.quantity } },
    });
    if (count === 0) {
      throw new BadRequestException(
        `Stock insuffisant pour ${article.code} : ${article.currentStock} disponible(s), ${entry.quantity} demandé(s).`,
      );
    }
    const updated = await tx.article.findUniqueOrThrow({ where: { id: entry.articleId } });
    stockAfter = updated.currentStock;
  } else {
    const updated = await tx.article.update({
      where: { id: entry.articleId },
      data: { currentStock: { increment: entry.quantity } },
    });
    stockAfter = updated.currentStock;
  }

  return tx.stockMovement.create({
    data: {
      type: entry.type,
      documentNumber: entry.documentNumber,
      articleId: entry.articleId,
      quantity: entry.quantity,
      date: entry.date,
      source: entry.source ?? null,
      destination: entry.destination ?? null,
      storekeeperId: entry.storekeeperId ?? null,
      stockAfter,
      receptionId: entry.receptionId,
      expeditionId: entry.expeditionId,
    },
  });
}

/** Prochain numéro de document SAP au format PREFIX-YYYY-#### (ex. BR-2026-0893). */
export async function nextDocumentNumber(
  tx: Prisma.TransactionClient,
  prefix: 'BR' | 'BS' | 'INV',
  date: Date,
): Promise<string> {
  const base = `${prefix}-${date.getFullYear()}-`;
  let lastNumber: string | undefined;
  if (prefix === 'BR') lastNumber = (await tx.reception.findFirst({ where: { number: { startsWith: base } }, orderBy: { number: 'desc' } }))?.number;
  else if (prefix === 'BS') lastNumber = (await tx.expedition.findFirst({ where: { number: { startsWith: base } }, orderBy: { number: 'desc' } }))?.number;
  // Régularisations d'inventaire : pas de document source, numérotées d'après l'historique des mouvements
  else lastNumber = (await tx.stockMovement.findFirst({ where: { documentNumber: { startsWith: base } }, orderBy: { documentNumber: 'desc' } }))?.documentNumber;
  const seq = lastNumber ? Number(lastNumber.slice(base.length)) + 1 : 1;
  return `${base}${String(seq).padStart(4, '0')}`;
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

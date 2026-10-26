import { NotFoundException } from '@nestjs/common';
import { ExpeditionPriority, ExpeditionStatus, MovementType, Prisma, ReceptionStatus, ShiftType } from '@prisma/client';
import { applyStockMovement, nextDocumentNumber } from '../common/stock-ledger';

export interface SheetPhotoInput {
  /** Fichier téléversé dans uploads/ … */
  fileName?: string;
  /** … ou lien externe (Google Drive) */
  externalUrl?: string;
  originalName: string;
  mimeType?: string;
  size?: number;
}

export interface SheetRecordInput {
  type: MovementType;
  date: Date;
  designation: string;
  articleId: number;
  category: string;
  quantity: number;
  unit: string;
  requesterType: string;
  requesterName: string;
  storekeeperId: number;
  post: ShiftType;
  supplier?: string | null;
  destinationZone?: string | null;
  destinationArea?: string | null;
  photos: SheetPhotoInput[];
  sourceRef?: string;
  createdAt?: Date;
}

/**
 * Enregistre une fiche E/S dans une transaction existante : BR (entrée) ou BS déjà servi (sortie),
 * mouvement de stock via le registre, puis la fiche et ses photos. Partagé par l'API et l'import Google Sheet.
 */
export async function recordStockSheet(tx: Prisma.TransactionClient, input: SheetRecordInput): Promise<number> {
  const storekeeper = await tx.storekeeper.findUnique({ where: { id: input.storekeeperId } });
  if (!storekeeper) throw new NotFoundException(`Magasinier ${input.storekeeperId} introuvable.`);

  const requester = `${input.requesterType} – ${input.requesterName}`;
  const isIn = input.type === MovementType.IN;
  const supplier = isIn ? input.supplier?.trim() || null : null;
  const destinationZone = isIn ? null : input.destinationZone?.trim() || null;
  const destinationArea = isIn ? null : input.destinationArea?.trim() || null;

  let link: { receptionId: number } | { expeditionId: number };
  if (isIn) {
    const number = await nextDocumentNumber(tx, 'BR', input.date);
    const source = supplier ?? requester;
    const reception = await tx.reception.create({
      data: {
        number,
        supplier: source,
        articleId: input.articleId,
        quantity: input.quantity,
        receivedAt: input.date,
        receiverId: input.storekeeperId,
        status: ReceptionStatus.VALIDE,
      },
    });
    await applyStockMovement(tx, {
      type: MovementType.IN,
      articleId: input.articleId,
      quantity: input.quantity,
      date: input.date,
      documentNumber: number,
      source,
      storekeeperId: input.storekeeperId,
      receptionId: reception.id,
    });
    link = { receptionId: reception.id };
  } else {
    const number = await nextDocumentNumber(tx, 'BS', input.date);
    const expedition = await tx.expedition.create({
      data: {
        number,
        requesterService: requester,
        articleId: input.articleId,
        quantity: input.quantity,
        priority: ExpeditionPriority.NORMALE,
        status: ExpeditionStatus.LIVRE,
        requestedAt: input.date,
        dueAt: input.date,
        servedAt: input.date,
        preparerId: input.storekeeperId,
      },
    });
    await applyStockMovement(tx, {
      type: MovementType.OUT,
      articleId: input.articleId,
      quantity: input.quantity,
      date: input.date,
      documentNumber: number,
      destination: destinationZone ? [destinationZone, destinationArea].filter(Boolean).join(' – ') : requester,
      storekeeperId: input.storekeeperId,
      expeditionId: expedition.id,
    });
    link = { expeditionId: expedition.id };
  }

  const sheet = await tx.stockSheet.create({
    data: {
      type: input.type,
      date: input.date,
      designation: input.designation.trim(),
      articleId: input.articleId,
      category: input.category,
      quantity: input.quantity,
      unit: input.unit,
      requesterType: input.requesterType,
      requesterName: input.requesterName.trim(),
      storekeeperId: input.storekeeperId,
      post: input.post,
      supplier,
      destinationZone,
      destinationArea,
      sourceRef: input.sourceRef,
      createdAt: input.createdAt,
      ...link,
      photos: { create: input.photos },
    },
  });
  return sheet.id;
}

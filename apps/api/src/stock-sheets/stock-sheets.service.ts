import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, Prisma, ShiftType } from '@prisma/client';
import { ArticleRef, StorekeeperRef, toArticleRef, toStorekeeperRef } from '../common/views';
import { PrismaService } from '../prisma/prisma.service';
import { recordStockSheet } from './record-sheet';
import {
  MAX_PHOTOS,
  SHEET_CATEGORIES,
  SHEET_DEST_ZONES,
  SHEET_POSTS,
  SHEET_REQUESTER_TYPES,
  SHEET_TYPES,
  SHEET_UNITS,
} from './sheet-options';
import { CreateStockSheetDto, StockSheetQueryDto } from './stock-sheets.dto';

export interface SheetOptions {
  types: { value: MovementType; label: string }[];
  categories: string[];
  units: string[];
  requesterTypes: string[];
  posts: { value: ShiftType; label: string }[];
  destinationZones: Record<string, string[]>;
  maxPhotos: number;
}

export interface SheetPhotoView {
  id: number;
  /** Chemin `/uploads/…` (servi par l'API) ou URL externe absolue */
  url: string;
  external: boolean;
  originalName: string;
}

export interface StockSheetView {
  id: number;
  type: MovementType;
  date: Date;
  designation: string;
  category: string;
  quantity: number;
  unit: string;
  requesterType: string;
  requesterName: string;
  post: ShiftType;
  supplier: string | null;
  destinationZone: string | null;
  destinationArea: string | null;
  article: ArticleRef;
  storekeeper: StorekeeperRef;
  /** N° du BR ou BS généré */
  documentNumber: string;
  stockAfter: number | null;
  photos: SheetPhotoView[];
  /** Fiche importée d'un export Google Sheet */
  imported: boolean;
  createdAt: Date;
}

const INCLUDE = {
  article: true,
  storekeeper: true,
  photos: { orderBy: { id: 'asc' } },
  reception: { include: { movement: { select: { stockAfter: true } } } },
  expedition: { include: { movement: { select: { stockAfter: true } } } },
} satisfies Prisma.StockSheetInclude;

type SheetRow = Prisma.StockSheetGetPayload<{ include: typeof INCLUDE }>;

const toView = (s: SheetRow): StockSheetView => ({
  id: s.id,
  type: s.type,
  date: s.date,
  designation: s.designation,
  category: s.category,
  quantity: s.quantity,
  unit: s.unit,
  requesterType: s.requesterType,
  requesterName: s.requesterName,
  post: s.post,
  supplier: s.supplier,
  destinationZone: s.destinationZone,
  destinationArea: s.destinationArea,
  article: toArticleRef(s.article),
  storekeeper: toStorekeeperRef(s.storekeeper),
  documentNumber: s.reception?.number ?? s.expedition?.number ?? '—',
  stockAfter: s.reception?.movement?.stockAfter ?? s.expedition?.movement?.stockAfter ?? null,
  photos: s.photos.map((p) => ({
    id: p.id,
    url: p.externalUrl ?? `/uploads/${p.fileName ?? ''}`,
    external: p.externalUrl !== null,
    originalName: p.originalName,
  })),
  imported: s.sourceRef !== null,
  createdAt: s.createdAt,
});

@Injectable()
export class StockSheetsService {
  constructor(private readonly prisma: PrismaService) {}

  options(): SheetOptions {
    return {
      types: SHEET_TYPES,
      categories: [...SHEET_CATEGORIES],
      units: [...SHEET_UNITS],
      requesterTypes: [...SHEET_REQUESTER_TYPES],
      posts: SHEET_POSTS,
      destinationZones: SHEET_DEST_ZONES,
      maxPhotos: MAX_PHOTOS,
    };
  }

  async findAll(query: StockSheetQueryDto): Promise<StockSheetView[]> {
    const rows = await this.prisma.stockSheet.findMany({
      include: INCLUDE,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: query.limit ?? 20,
    });
    return rows.map(toView);
  }

  async findOne(id: number): Promise<StockSheetView> {
    const row = await this.prisma.stockSheet.findUnique({ where: { id }, include: INCLUDE });
    if (!row) throw new NotFoundException(`Fiche ${id} introuvable.`);
    return toView(row);
  }

  /**
   * Enregistre la fiche et, dans la même transaction, le BR (entrée) ou le BS (sortie déjà servie),
   * le mouvement de stock et la mise à jour du stock. En cas d'échec, CleanupUploadsOnErrorInterceptor supprime les photos.
   */
  async create(dto: CreateStockSheetDto, files: Express.Multer.File[]): Promise<StockSheetView> {
    if (files.length === 0) throw new BadRequestException("Au moins une photo d'article est obligatoire.");
    const id = await this.prisma.$transaction((tx) =>
      recordStockSheet(tx, {
        ...dto,
        date: new Date(dto.date),
        photos: files.map((f) => ({ fileName: f.filename, originalName: f.originalname, mimeType: f.mimetype, size: f.size })),
      }),
    );
    return this.findOne(id);
  }
}

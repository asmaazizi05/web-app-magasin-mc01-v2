import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isUniqueViolation } from '../common/stock-ledger';
import { PrismaService } from '../prisma/prisma.service';
import { ArticleQueryDto, CreateArticleDto, UpdateArticleDto } from './articles.dto';
import { ARTICLE_INCLUDE, ArticleView, toArticleView } from './articles.mapper';

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ArticleQueryDto): Promise<ArticleView[]> {
    const where: Prisma.ArticleWhereInput = {
      origin: query.origin,
      zoneId: query.zoneId,
      rackId: query.rackId,
    };
    if (query.q?.trim()) {
      const q = query.q.trim();
      const byCode: Prisma.ArticleWhereInput = { code: { contains: q, mode: 'insensitive' } };
      const byDesignation: Prisma.ArticleWhereInput = { designation: { contains: q, mode: 'insensitive' } };
      // Emplacement : libellé d'emplacement, zone ou code du rack
      const byLocation: Prisma.ArticleWhereInput[] = [
        { rackLocation: { contains: q, mode: 'insensitive' } },
        { zone: { name: { contains: q, mode: 'insensitive' } } },
        { rack: { code: { contains: q, mode: 'insensitive' } } },
      ];
      where.OR = [byCode, byDesignation, ...byLocation, { originLabel: { contains: q, mode: 'insensitive' } }];
    }
    const articles = await this.prisma.article.findMany({ where, include: ARTICLE_INCLUDE, orderBy: { code: 'asc' } });
    const views = articles.map(toArticleView);
    // Les articles en alerte remontent en tête, comme dans le catalogue de référence.
    const rank = { CRITIQUE: 0, LIMITE: 1, CONFORME: 2 } as const;
    const sorted = views.sort((a, b) => rank[a.alertStatus] - rank[b.alertStatus] || a.code.localeCompare(b.code));
    return query.alertOnly ? sorted.filter((a) => a.alertStatus === 'CRITIQUE') : sorted;
  }

  async findOne(id: number): Promise<ArticleView> {
    const article = await this.prisma.article.findUnique({ where: { id }, include: ARTICLE_INCLUDE });
    if (!article) throw new NotFoundException(`Article ${id} introuvable.`);
    return toArticleView(article);
  }

  async create(dto: CreateArticleDto): Promise<ArticleView> {
    const rackLocation = dto.rackLocation ?? (await this.describeLocation(dto.zoneId, dto.rackId, dto.rackLevel));
    try {
      const article = await this.prisma.article.create({
        data: { ...dto, rackLocation, currentStock: dto.currentStock ?? 0 },
        include: ARTICLE_INCLUDE,
      });
      return toArticleView(article);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException(`Le code ${dto.code} existe déjà.`);
      throw e;
    }
  }

  async update(id: number, dto: UpdateArticleDto): Promise<ArticleView> {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Article ${id} introuvable.`);
    const placementChanged = dto.zoneId !== undefined || dto.rackId !== undefined || dto.rackLevel !== undefined;
    const rackLocation =
      dto.rackLocation ??
      (placementChanged
        ? await this.describeLocation(
            dto.zoneId ?? existing.zoneId,
            dto.rackId ?? existing.rackId ?? undefined,
            dto.rackLevel ?? existing.rackLevel ?? undefined,
          )
        : undefined);
    const article = await this.prisma.article.update({
      where: { id },
      data: { ...dto, rackLocation },
      include: ARTICLE_INCLUDE,
    });
    return toArticleView(article);
  }

  async remove(id: number): Promise<void> {
    const movements = await this.prisma.stockMovement.count({ where: { articleId: id } });
    if (movements > 0) {
      throw new BadRequestException("Impossible de supprimer un article ayant un historique de mouvements.");
    }
    await this.prisma.article.delete({ where: { id } }).catch(() => {
      throw new NotFoundException(`Article ${id} introuvable.`);
    });
  }

  private async describeLocation(zoneId: number, rackId?: number, level?: number): Promise<string> {
    if (rackId) {
      const rack = await this.prisma.rack.findUnique({ where: { id: rackId } });
      if (!rack) throw new BadRequestException(`Rack ${rackId} introuvable.`);
      if (rack.zoneId !== zoneId) throw new BadRequestException("Le rack n'appartient pas à la zone indiquée.");
      return level ? `Rayonnage ${rack.code} - Niv ${level}` : `Rayonnage ${rack.code}`;
    }
    const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone) throw new BadRequestException(`Zone ${zoneId} introuvable.`);
    return zone.name;
  }
}

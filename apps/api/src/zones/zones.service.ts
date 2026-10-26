import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Zone } from '@prisma/client';
import { ARTICLE_INCLUDE, ArticleView, toArticleView } from '../articles/articles.mapper';
import { pct, toNumber } from '../common/stock';
import { isUniqueViolation } from '../common/stock-ledger';
import { PrismaService } from '../prisma/prisma.service';
import { RackView, toRackView } from '../racks/racks.mapper';
import { CreateZoneDto, UpdateZoneDto } from './zones.dto';

export interface ZoneView extends Zone {
  articleCount: number;
  units: number;
  remaining: number;
  occupancyPct: number;
  valuation: number;
}

export interface ZoneDetail extends ZoneView {
  racks: RackView[];
  articles: ArticleView[];
}

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ZoneView[]> {
    const zones = await this.prisma.zone.findMany({
      orderBy: { position: 'asc' },
      include: { articles: { select: { currentStock: true, unitCostCMP: true } } },
    });
    return zones.map(({ articles, ...zone }) => this.withStats(zone, articles));
  }

  async findOne(id: number): Promise<ZoneDetail> {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        racks: { orderBy: { aisle: 'asc' }, include: { articles: { include: ARTICLE_INCLUDE } } },
        articles: { include: ARTICLE_INCLUDE, orderBy: { code: 'asc' } },
      },
    });
    if (!zone) throw new NotFoundException(`Zone ${id} introuvable.`);
    const { racks, articles, ...base } = zone;
    return {
      ...this.withStats(base, articles),
      racks: racks.map(toRackView),
      articles: articles.map(toArticleView),
    };
  }

  async create(dto: CreateZoneDto): Promise<ZoneView> {
    try {
      const zone = await this.prisma.zone.create({ data: dto });
      return this.withStats(zone, []);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Code ou position de zone déjà utilisé.');
      throw e;
    }
  }

  async update(id: number, dto: UpdateZoneDto): Promise<ZoneView> {
    await this.ensureExists(id);
    await this.prisma.zone.update({ where: { id }, data: dto });
    return (await this.findAll()).find((z) => z.id === id) as ZoneView;
  }

  private async ensureExists(id: number): Promise<void> {
    if (!(await this.prisma.zone.findUnique({ where: { id } }))) throw new NotFoundException(`Zone ${id} introuvable.`);
  }

  private withStats(zone: Zone, articles: { currentStock: number; unitCostCMP: Parameters<typeof toNumber>[0] }[]): ZoneView {
    const units = articles.reduce((s, a) => s + a.currentStock, 0);
    const valuation = articles.reduce((s, a) => s + a.currentStock * toNumber(a.unitCostCMP), 0);
    return {
      ...zone,
      articleCount: articles.length,
      units,
      remaining: Math.max(zone.capacity - units, 0),
      occupancyPct: pct(units, zone.capacity),
      valuation,
    };
  }
}

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ARTICLE_INCLUDE } from '../articles/articles.mapper';
import { isUniqueViolation } from '../common/stock-ledger';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRackDto, RackQueryDto, UpdateRackDto } from './racks.dto';
import { RackView, toRackView } from './racks.mapper';

const RACK_INCLUDE = { articles: { include: ARTICLE_INCLUDE } } as const;

@Injectable()
export class RacksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: RackQueryDto): Promise<RackView[]> {
    const racks = await this.prisma.rack.findMany({
      where: { zoneId: query.zoneId },
      include: RACK_INCLUDE,
      orderBy: [{ zoneId: 'asc' }, { aisle: 'asc' }],
    });
    return racks.map(toRackView);
  }

  async findOne(id: number): Promise<RackView> {
    const rack = await this.prisma.rack.findUnique({ where: { id }, include: RACK_INCLUDE });
    if (!rack) throw new NotFoundException(`Rack ${id} introuvable.`);
    return toRackView(rack);
  }

  async create(dto: CreateRackDto): Promise<RackView> {
    try {
      return toRackView(await this.prisma.rack.create({ data: dto, include: RACK_INCLUDE }));
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException(`Le rack ${dto.code} existe déjà.`);
      throw e;
    }
  }

  async update(id: number, dto: UpdateRackDto): Promise<RackView> {
    await this.findOne(id);
    return toRackView(await this.prisma.rack.update({ where: { id }, data: dto, include: RACK_INCLUDE }));
  }
}

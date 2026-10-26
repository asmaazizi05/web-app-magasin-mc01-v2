import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditStatus, InventoryAudit } from '@prisma/client';
import { pct, round, toNumber } from '../common/stock';
import { PrismaService } from '../prisma/prisma.service';
import { AuditQueryDto, UpdateAuditDto } from './audits.dto';

export interface AuditView extends Omit<InventoryAudit, 'countedValue' | 'varianceValue'> {
  countedValue: number;
  varianceValue: number;
  discrepancies: number;
  accuracyPct: number | null;
}

export interface InventoryKpis {
  /** Inventory Record Accuracy : lignes exactes / lignes comptées (audits terminés) */
  ira: number;
  /** Écart financier : |écarts valorisés| / valeur comptée */
  financialGapPct: number;
  countedLines: number;
  accurateLines: number;
  completedAudits: number;
  lastAuditDate: Date | null;
}

const toView = (a: InventoryAudit): AuditView => ({
  ...a,
  countedValue: toNumber(a.countedValue),
  varianceValue: toNumber(a.varianceValue),
  discrepancies: a.countedLines - a.accurateLines,
  accuracyPct: a.countedLines > 0 ? pct(a.accurateLines, a.countedLines) : null,
});

@Injectable()
export class AuditsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AuditQueryDto): Promise<AuditView[]> {
    let range: { gte: Date; lt: Date } | undefined;
    if (query.year && query.month) {
      range = { gte: new Date(Date.UTC(query.year, query.month - 1, 1)), lt: new Date(Date.UTC(query.year, query.month, 1)) };
    } else if (query.year) {
      range = { gte: new Date(Date.UTC(query.year, 0, 1)), lt: new Date(Date.UTC(query.year + 1, 0, 1)) };
    }
    const audits = await this.prisma.inventoryAudit.findMany({
      where: { startDate: range },
      orderBy: { startDate: 'asc' },
    });
    return audits.map(toView);
  }

  async update(id: number, dto: UpdateAuditDto): Promise<AuditView> {
    const audit = await this.prisma.inventoryAudit.findUnique({ where: { id } });
    if (!audit) throw new NotFoundException(`Audit ${id} introuvable.`);
    const counted = dto.countedLines ?? audit.countedLines;
    const accurate = dto.accurateLines ?? audit.accurateLines;
    if (accurate > counted) throw new BadRequestException('Les lignes exactes ne peuvent dépasser les lignes comptées.');
    return toView(await this.prisma.inventoryAudit.update({ where: { id }, data: dto }));
  }

  async kpis(): Promise<InventoryKpis> {
    const done = await this.prisma.inventoryAudit.findMany({
      where: { status: AuditStatus.TERMINE },
      orderBy: { endDate: 'desc' },
    });
    const countedLines = done.reduce((s, a) => s + a.countedLines, 0);
    const accurateLines = done.reduce((s, a) => s + a.accurateLines, 0);
    const countedValue = done.reduce((s, a) => s + toNumber(a.countedValue), 0);
    const variance = done.reduce((s, a) => s + Math.abs(toNumber(a.varianceValue)), 0);
    return {
      ira: pct(accurateLines, countedLines),
      financialGapPct: countedValue > 0 ? round((variance / countedValue) * 100, 2) : 0,
      countedLines,
      accurateLines,
      completedAudits: done.length,
      lastAuditDate: done[0]?.endDate ?? null,
    };
  }
}

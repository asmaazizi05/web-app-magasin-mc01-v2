import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IdPipe } from '../common/id-param';
import { AuditQueryDto, UpdateAuditDto } from './audits.dto';
import { AuditsService, AuditView, InventoryKpis } from './audits.service';

@ApiTags('audits')
@Controller('audits')
export class AuditsController {
  constructor(private readonly audits: AuditsService) {}

  /** Planning des inventaires tournants (filtre ?year=&month=) */
  @Get()
  findAll(@Query() query: AuditQueryDto): Promise<AuditView[]> {
    return this.audits.findAll(query);
  }

  /** KPIs qualité inventaire : IRA et écart financier */
  @Get('kpis')
  kpis(): Promise<InventoryKpis> {
    return this.audits.kpis();
  }

  /** Saisie du résultat d'un comptage */
  @Patch(':id')
  update(@Param('id', IdPipe) id: number, @Body() dto: UpdateAuditDto): Promise<AuditView> {
    return this.audits.update(id, dto);
  }
}

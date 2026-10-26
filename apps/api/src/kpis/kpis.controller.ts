import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardKpis, KpisService } from './kpis.service';

@ApiTags('kpis')
@Controller('kpis')
export class KpisController {
  constructor(private readonly kpis: KpisService) {}

  /** Agrégats du tableau de bord : volumes, valorisation CMP, OTIF, IRA, saturation, ABC, zones */
  @Get('dashboard')
  dashboard(): Promise<DashboardKpis> {
    return this.kpis.dashboard();
  }
}

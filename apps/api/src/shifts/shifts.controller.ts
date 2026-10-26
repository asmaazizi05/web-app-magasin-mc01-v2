import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ExtendRotationDto, PlanningQueryDto, UpsertShiftDto } from './shifts.dto';
import { CurrentAssignmentView, PlanningView, ShiftCellView, ShiftsService } from './shifts.service';

@ApiTags('shifts')
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  /** Planning des postes sur des semaines réelles (?from=YYYY-MM-DD&weeks=6) */
  @Get()
  planning(@Query() query: PlanningQueryDto): Promise<PlanningView> {
    return this.shifts.planning(query);
  }

  /** Affectation par poste pour la semaine en cours */
  @Get('current')
  current(): Promise<CurrentAssignmentView> {
    return this.shifts.current();
  }

  /** Modifie une case du planning : poste (null = effacer) et/ou verrou */
  @Put()
  upsert(@Body() dto: UpsertShiftDto): Promise<ShiftCellView | null> {
    return this.shifts.upsert(dto);
  }

  /** Prolonge la rotation de N semaines (postes fixes respectés, cycle de 4 semaines repris) */
  @Post('extend')
  extend(@Body() dto: ExtendRotationDto): Promise<{ created: number; from: string; to: string }> {
    return this.shifts.extend(dto);
  }
}

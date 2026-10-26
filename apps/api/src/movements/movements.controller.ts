import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MovementQueryDto } from './movements.dto';
import { MovementsService, MovementSummary, MovementView } from './movements.service';

@ApiTags('movements')
@Controller('movements')
export class MovementsController {
  constructor(private readonly movements: MovementsService) {}

  /** Historique chronologique des mouvements de stock (filtre ?type=IN|OUT) */
  @Get()
  findAll(@Query() query: MovementQueryDto): Promise<MovementView[]> {
    return this.movements.findAll(query);
  }

  /** Totaux entrées / sorties / flux net */
  @Get('summary')
  summary(): Promise<MovementSummary> {
    return this.movements.summary();
  }
}

import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IdPipe } from '../common/id-param';
import { CreateExpeditionDto, UpdateExpeditionStatusDto } from './expeditions.dto';
import { ExpeditionsService, ExpeditionView } from './expeditions.service';

@ApiTags('expeditions')
@Controller('expeditions')
export class ExpeditionsController {
  constructor(private readonly expeditions: ExpeditionsService) {}

  @Get()
  findAll(): Promise<ExpeditionView[]> {
    return this.expeditions.findAll();
  }

  @Get(':id')
  findOne(@Param('id', IdPipe) id: number): Promise<ExpeditionView> {
    return this.expeditions.findOne(id);
  }

  /** Crée un Bon de Sortie : BS + mouvement OUT + décrément du stock (transactionnel) */
  @Post()
  create(@Body() dto: CreateExpeditionDto): Promise<ExpeditionView> {
    return this.expeditions.create(dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id', IdPipe) id: number, @Body() dto: UpdateExpeditionStatusDto): Promise<ExpeditionView> {
    return this.expeditions.updateStatus(id, dto);
  }
}

import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IdPipe } from '../common/id-param';
import { CreateReceptionDto, UpdateReceptionStatusDto } from './receptions.dto';
import { ReceptionsService, ReceptionView } from './receptions.service';

@ApiTags('receptions')
@Controller('receptions')
export class ReceptionsController {
  constructor(private readonly receptions: ReceptionsService) {}

  @Get()
  findAll(): Promise<ReceptionView[]> {
    return this.receptions.findAll();
  }

  @Get(':id')
  findOne(@Param('id', IdPipe) id: number): Promise<ReceptionView> {
    return this.receptions.findOne(id);
  }

  /** Crée un Bon de Réception : BR + mouvement IN + mise à jour du stock (transactionnel) */
  @Post()
  create(@Body() dto: CreateReceptionDto): Promise<ReceptionView> {
    return this.receptions.create(dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id', IdPipe) id: number, @Body() dto: UpdateReceptionStatusDto): Promise<ReceptionView> {
    return this.receptions.updateStatus(id, dto);
  }
}

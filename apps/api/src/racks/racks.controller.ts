import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IdPipe } from '../common/id-param';
import { CreateRackDto, RackQueryDto, UpdateRackDto } from './racks.dto';
import { RackView } from './racks.mapper';
import { RacksService } from './racks.service';

@ApiTags('racks')
@Controller('racks')
export class RacksController {
  constructor(private readonly racks: RacksService) {}

  /** Racks avec contenu par niveau, saturation et statut d'alerte */
  @Get()
  findAll(@Query() query: RackQueryDto): Promise<RackView[]> {
    return this.racks.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', IdPipe) id: number): Promise<RackView> {
    return this.racks.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRackDto): Promise<RackView> {
    return this.racks.create(dto);
  }

  @Patch(':id')
  update(@Param('id', IdPipe) id: number, @Body() dto: UpdateRackDto): Promise<RackView> {
    return this.racks.update(id, dto);
  }
}

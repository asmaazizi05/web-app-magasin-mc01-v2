import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IdPipe } from '../common/id-param';
import { CreateZoneDto, UpdateZoneDto } from './zones.dto';
import { ZoneDetail, ZonesService, ZoneView } from './zones.service';

@ApiTags('zones')
@Controller('zones')
export class ZonesController {
  constructor(private readonly zones: ZonesService) {}

  /** Les 5 zones avec occupation, unités stockées et valorisation */
  @Get()
  findAll(): Promise<ZoneView[]> {
    return this.zones.findAll();
  }

  /** Détail d'une zone : racks (avec contenu) et articles */
  @Get(':id')
  findOne(@Param('id', IdPipe) id: number): Promise<ZoneDetail> {
    return this.zones.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateZoneDto): Promise<ZoneView> {
    return this.zones.create(dto);
  }

  @Patch(':id')
  update(@Param('id', IdPipe) id: number, @Body() dto: UpdateZoneDto): Promise<ZoneView> {
    return this.zones.update(id, dto);
  }
}

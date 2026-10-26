import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Settings } from '@prisma/client';
import { UpdateSettingsDto } from './settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** Paramètres du site et du connecteur SAP S/4HANA */
  @Get()
  get(): Promise<Settings> {
    return this.settings.get();
  }

  @Patch()
  update(@Body() dto: UpdateSettingsDto): Promise<Settings> {
    return this.settings.update(dto);
  }
}

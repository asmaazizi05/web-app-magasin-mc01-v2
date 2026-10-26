import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Settings } from '@prisma/client';
import { applyAlertConfig } from '../common/alert-config';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './settings.dto';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  /** Charge les seuils d'alerte réglables (stock, engins) ; base vide : les défauts restent en place */
  async onModuleInit(): Promise<void> {
    const settings = await this.prisma.settings.findUnique({ where: { id: 1 } }).catch(() => null);
    if (settings) applyAlertConfig(settings);
  }

  async get(): Promise<Settings> {
    const settings = await this.prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings) throw new NotFoundException('Paramètres non initialisés : lancez le seed.');
    return settings;
  }

  async update(dto: UpdateSettingsDto): Promise<Settings> {
    await this.get();
    const settings = await this.prisma.settings.update({ where: { id: 1 }, data: dto });
    applyAlertConfig(settings);
    return settings;
  }
}

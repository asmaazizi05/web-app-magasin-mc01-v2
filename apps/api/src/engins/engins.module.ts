import { Module } from '@nestjs/common';
import { EnginsController } from './engins.controller';
import { EnginsService } from './engins.service';

@Module({ controllers: [EnginsController], providers: [EnginsService] })
export class EnginsModule {}

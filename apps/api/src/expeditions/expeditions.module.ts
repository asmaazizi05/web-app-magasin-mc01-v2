import { Module } from '@nestjs/common';
import { ShiftsModule } from '../shifts/shifts.module';
import { ExpeditionsController } from './expeditions.controller';
import { ExpeditionsService } from './expeditions.service';

@Module({ imports: [ShiftsModule], controllers: [ExpeditionsController], providers: [ExpeditionsService] })
export class ExpeditionsModule {}

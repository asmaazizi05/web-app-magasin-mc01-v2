import { Module } from '@nestjs/common';
import { ShiftsModule } from '../shifts/shifts.module';
import { StorekeepersController } from './storekeepers.controller';
import { StorekeepersService } from './storekeepers.service';

@Module({ imports: [ShiftsModule], controllers: [StorekeepersController], providers: [StorekeepersService] })
export class StorekeepersModule {}

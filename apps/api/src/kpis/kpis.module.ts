import { Module } from '@nestjs/common';
import { AuditsModule } from '../audits/audits.module';
import { ZonesModule } from '../zones/zones.module';
import { KpisController } from './kpis.controller';
import { KpisService } from './kpis.service';

@Module({ imports: [ZonesModule, AuditsModule], controllers: [KpisController], providers: [KpisService] })
export class KpisModule {}

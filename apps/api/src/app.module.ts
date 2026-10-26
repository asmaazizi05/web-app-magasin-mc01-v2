import { Module } from '@nestjs/common';
import { ArticlesModule } from './articles/articles.module';
import { AuditsModule } from './audits/audits.module';
import { EnginsModule } from './engins/engins.module';
import { ExpeditionsModule } from './expeditions/expeditions.module';
import { InterventionsModule } from './interventions/interventions.module';
import { InventoryModule } from './inventory/inventory.module';
import { KpisModule } from './kpis/kpis.module';
import { MovementsModule } from './movements/movements.module';
import { PrismaModule } from './prisma/prisma.module';
import { RacksModule } from './racks/racks.module';
import { ReceptionsModule } from './receptions/receptions.module';
import { ProfilesModule } from './profiles/profiles.module';
import { SettingsModule } from './settings/settings.module';
import { ShiftsModule } from './shifts/shifts.module';
import { StockSheetsModule } from './stock-sheets/stock-sheets.module';
import { StorekeepersModule } from './storekeepers/storekeepers.module';
import { ZonesModule } from './zones/zones.module';

@Module({
  imports: [
    PrismaModule,
    ArticlesModule,
    ZonesModule,
    RacksModule,
    StorekeepersModule,
    ShiftsModule,
    ReceptionsModule,
    ExpeditionsModule,
    MovementsModule,
    KpisModule,
    AuditsModule,
    SettingsModule,
    ProfilesModule,
    StockSheetsModule,
    EnginsModule,
    InterventionsModule,
    InventoryModule,
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { StockSheetsController } from './stock-sheets.controller';
import { StockSheetsService } from './stock-sheets.service';

@Module({ controllers: [StockSheetsController], providers: [StockSheetsService] })
export class StockSheetsModule {}

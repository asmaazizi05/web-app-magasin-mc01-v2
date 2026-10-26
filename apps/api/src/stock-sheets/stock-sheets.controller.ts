import { Body, Controller, Get, Param, Post, Query, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { IdPipe } from '../common/id-param';
import { MAX_PHOTOS } from './sheet-options';
import { CreateStockSheetDto, CreateStockSheetFormDto, StockSheetQueryDto } from './stock-sheets.dto';
import { SheetOptions, StockSheetsService, StockSheetView } from './stock-sheets.service';
import { CleanupUploadsOnErrorInterceptor, photoUploadOptions } from './upload';

@ApiTags('stock-sheets')
@Controller('stock-sheets')
export class StockSheetsController {
  constructor(private readonly sheets: StockSheetsService) {}

  /** Listes de choix du formulaire (types, catégories, unités, demandeurs, postes) */
  @Get('options')
  options(): SheetOptions {
    return this.sheets.options();
  }

  /** Dernières fiches saisies */
  @Get()
  findAll(@Query() query: StockSheetQueryDto): Promise<StockSheetView[]> {
    return this.sheets.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', IdPipe) id: number): Promise<StockSheetView> {
    return this.sheets.findOne(id);
  }

  /** Saisie d'une fiche E/S : crée la fiche + BR ou BS + mouvement + mise à jour du stock (transactionnel) */
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateStockSheetFormDto })
  @UseInterceptors(FilesInterceptor('photos', MAX_PHOTOS, photoUploadOptions), CleanupUploadsOnErrorInterceptor)
  create(@Body() dto: CreateStockSheetDto, @UploadedFiles() files: Express.Multer.File[] | undefined): Promise<StockSheetView> {
    return this.sheets.create(dto, files ?? []);
  }
}

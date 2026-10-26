import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Query, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CleanupUploadsOnErrorInterceptor, countPhotoUploadOptions } from '../stock-sheets/upload';
import { IdPipe } from '../common/id-param';
import { CreateArticleFromLineDto, CreateCountDto, LinkLineDto, RejectDto, ResolverDto, SearchDto } from './inventory.dto';
import { CountView, DesignationRequest, InventoryOptions, InventoryService, PendingValidation, ReferentialItem } from './inventory.service';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  /** Unités et volets achat (OCP, Cession, JESA, Annexe D) */
  @Get('options')
  options(): InventoryOptions {
    return this.inventory.options();
  }

  /** Recherche dans le référentiel articles par référence ou désignation (?q=) */
  @Get('referential')
  search(@Query() query: SearchDto): Promise<ReferentialItem[]> {
    return this.inventory.search(query.q);
  }

  /** Dernières fiches de comptage */
  @Get('counts')
  counts(): Promise<CountView[]> {
    return this.inventory.counts();
  }

  /**
   * Saisie d'une fiche de comptage (multipart) : champ `data` = fiche JSON (CreateCountDto),
   * champs `photos` = une photo par ligne, dans l'ordre des lignes.
   */
  @Post('counts')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('photos', 300, countPhotoUploadOptions), CleanupUploadsOnErrorInterceptor)
  async create(@Body('data') data: string | undefined, @UploadedFiles() photos: Express.Multer.File[] | undefined): Promise<CountView> {
    let raw: unknown;
    try {
      raw = JSON.parse(data ?? '');
    } catch {
      throw new BadRequestException('Fiche de comptage illisible (champ « data »).');
    }
    const dto = plainToInstance(CreateCountDto, raw);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true, stopAtFirstError: true });
    if (errors.length) throw new BadRequestException(flatten(errors));
    return this.inventory.createCount(dto, photos ?? []);
  }

  /** Demandes de désignation / référence (saisies libres à traiter par un responsable) */
  @Get('requests')
  requests(): Promise<DesignationRequest[]> {
    return this.inventory.requests();
  }

  @Post('lines/:id/link')
  @HttpCode(204)
  link(@Param('id', IdPipe) id: number, @Body() dto: LinkLineDto): Promise<void> {
    return this.inventory.link(id, dto);
  }

  @Post('lines/:id/create-article')
  @HttpCode(204)
  createArticle(@Param('id', IdPipe) id: number, @Body() dto: CreateArticleFromLineDto): Promise<void> {
    return this.inventory.createArticle(id, dto);
  }

  @Post('lines/:id/reject')
  @HttpCode(204)
  rejectLine(@Param('id', IdPipe) id: number, @Body() dto: RejectDto): Promise<void> {
    return this.inventory.rejectLine(id, dto);
  }

  /** Comptages à valider, regroupés par article, avec écart au stock théorique */
  @Get('pending')
  pending(): Promise<PendingValidation[]> {
    return this.inventory.pending();
  }

  /** Valide et régularise le stock de l'article (mouvement INV-YYYY-####) */
  @Post('articles/:articleId/validate')
  validate(@Param('articleId', IdPipe) articleId: number, @Body() dto: ResolverDto): Promise<{ gap: number; movementNumber: string | null; stockAfter: number }> {
    return this.inventory.validate(articleId, dto);
  }

  /** Refuse les comptages de l'article (à recompter) */
  @Post('articles/:articleId/reject')
  @HttpCode(204)
  rejectArticle(@Param('articleId', IdPipe) articleId: number, @Body() dto: RejectDto): Promise<void> {
    return this.inventory.rejectArticle(articleId, dto);
  }
}

/** Messages de validation à plat (« lines.2.category : … » → « Ligne 3 : … ») */
function flatten(errors: ValidationError[], path = ''): string[] {
  return errors.flatMap((e) => {
    const here = path ? `${path}.${e.property}` : e.property;
    const own = Object.values(e.constraints ?? {}).map((m) => {
      const line = here.match(/^lines\.(\d+)/);
      return line ? `Ligne ${Number(line[1]) + 1} : ${m}` : m;
    });
    return [...own, ...flatten(e.children ?? [], here)];
  });
}

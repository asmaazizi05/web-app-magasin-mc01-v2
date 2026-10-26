import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { HabilitationType } from '@prisma/client';
import { IdPipe } from '../common/id-param';
import { CleanupUploadsOnErrorInterceptor, documentUploadOptions } from '../stock-sheets/upload';
import {
  CreateHabilitationDto,
  CreateStorekeeperDto,
  CreateTrainingDto,
  HabilitationTypeDto,
  UpdateHabilitationDto,
  UpdateHabilitationTypeDto,
  UpdateStorekeeperDto,
  UpdateTrainingDto,
} from './storekeepers.dto';
import {
  HabilitationAlert,
  HabilitationTypeView,
  HabilitationView,
  StorekeeperBase,
  StorekeeperProfile,
  StorekeepersService,
  StorekeeperSummary,
  TrainingView,
} from './storekeepers.service';

@ApiTags('storekeepers')
@Controller()
export class StorekeepersController {
  constructor(private readonly storekeepers: StorekeepersService) {}

  // ───────────── Magasiniers ─────────────

  /** Magasiniers avec poste de la semaine et synthèse des habilitations */
  @Get('storekeepers')
  findAll(): Promise<StorekeeperSummary[]> {
    return this.storekeepers.findAll();
  }

  /** Fiche complète : identité, planning à venir, habilitations, formations, engins autorisés */
  @Get('storekeepers/:id')
  profile(@Param('id', IdPipe) id: number): Promise<StorekeeperProfile> {
    return this.storekeepers.profile(id);
  }

  @Post('storekeepers')
  create(@Body() dto: CreateStorekeeperDto): Promise<StorekeeperBase> {
    return this.storekeepers.create(dto);
  }

  /** Mise à jour (dont poste fixe : appliqué aux semaines planifiées non verrouillées) */
  @Patch('storekeepers/:id')
  update(@Param('id', IdPipe) id: number, @Body() dto: UpdateStorekeeperDto): Promise<StorekeeperBase> {
    return this.storekeepers.update(id, dto);
  }

  @Delete('storekeepers/:id')
  @HttpCode(204)
  remove(@Param('id', IdPipe) id: number): Promise<void> {
    return this.storekeepers.remove(id);
  }

  // ───────────── Formations ─────────────

  /** Ajoute une formation (certificat optionnel : champ `file`, PDF ou image) */
  @Post('storekeepers/:id/trainings')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions), CleanupUploadsOnErrorInterceptor)
  addTraining(
    @Param('id', IdPipe) id: number,
    @Body() dto: CreateTrainingDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<TrainingView> {
    return this.storekeepers.addTraining(id, dto, file);
  }

  @Patch('trainings/:id')
  updateTraining(@Param('id', IdPipe) id: number, @Body() dto: UpdateTrainingDto): Promise<TrainingView> {
    return this.storekeepers.updateTraining(id, dto);
  }

  @Delete('trainings/:id')
  @HttpCode(204)
  removeTraining(@Param('id', IdPipe) id: number): Promise<void> {
    return this.storekeepers.removeTraining(id);
  }

  // ───────────── Habilitations ─────────────

  /** Habilitations expirées ou expirant dans le délai d'alerte (tableau de bord) */
  @Get('habilitations/alerts')
  alerts(): Promise<HabilitationAlert[]> {
    return this.storekeepers.alerts();
  }

  /** Ajoute (ou renouvelle) une habilitation ; expiration calculée si omise. Justificatif optionnel : champ `file` */
  @Post('storekeepers/:id/habilitations')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions), CleanupUploadsOnErrorInterceptor)
  addHabilitation(
    @Param('id', IdPipe) id: number,
    @Body() dto: CreateHabilitationDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<HabilitationView> {
    return this.storekeepers.addHabilitation(id, dto, file);
  }

  @Patch('habilitations/:id')
  updateHabilitation(@Param('id', IdPipe) id: number, @Body() dto: UpdateHabilitationDto): Promise<HabilitationView> {
    return this.storekeepers.updateHabilitation(id, dto);
  }

  @Delete('habilitations/:id')
  @HttpCode(204)
  removeHabilitation(@Param('id', IdPipe) id: number): Promise<void> {
    return this.storekeepers.removeHabilitation(id);
  }

  // ───────────── Types d'habilitation ─────────────

  @Get('habilitation-types')
  types(): Promise<HabilitationTypeView[]> {
    return this.storekeepers.types();
  }

  @Post('habilitation-types')
  createType(@Body() dto: HabilitationTypeDto): Promise<HabilitationType> {
    return this.storekeepers.createType(dto);
  }

  @Patch('habilitation-types/:id')
  updateType(@Param('id', IdPipe) id: number, @Body() dto: UpdateHabilitationTypeDto): Promise<HabilitationType> {
    return this.storekeepers.updateType(id, dto);
  }

  @Delete('habilitation-types/:id')
  @HttpCode(204)
  removeType(@Param('id', IdPipe) id: number): Promise<void> {
    return this.storekeepers.removeType(id);
  }
}

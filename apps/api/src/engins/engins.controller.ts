import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { IdPipe } from '../common/id-param';
import { CleanupUploadsOnErrorInterceptor, documentUploadOptions, photoUploadOptions } from '../stock-sheets/upload';
import {
  BreakdownDto,
  ChecklistDto,
  CloseMaintenanceDto,
  CreateCheckDto,
  CreateEnginDto,
  CreateMaintenanceDto,
  EnginStatusDto,
  UpdateEnginDto,
} from './engins.dto';
import { EnginAlert, EnginDetail, EnginOptions, EnginsService, EnginView } from './engins.service';

@ApiTags('engins')
@Controller()
export class EnginsController {
  constructor(private readonly engins: EnginsService) {}

  /** Parc engins : fiche, échéances d'entretien / contrôle, alertes, réservations */
  @Get('engins')
  findAll(): Promise<EnginView[]> {
    return this.engins.findAll();
  }

  /** Listes de choix (types, énergies, usages, résultats de contrôle) */
  @Get('engins/options')
  options(): EnginOptions {
    return this.engins.options();
  }

  /** Alertes du parc (tableau de bord) */
  @Get('engins/alerts')
  alerts(): Promise<EnginAlert[]> {
    return this.engins.alerts();
  }

  /** Charge le parc de démonstration (s'il n'est pas déjà présent) */
  @Post('engins/demo')
  loadDemo(): Promise<{ created: number }> {
    return this.engins.loadDemo();
  }

  /** Supprime tous les engins de démonstration */
  @Delete('engins/demo')
  removeDemo(): Promise<{ removed: number }> {
    return this.engins.removeDemo();
  }

  /** Fiche complète : caractéristiques, historique de maintenance, check-lists, indicateurs */
  @Get('engins/:id')
  findOne(@Param('id', IdPipe) id: number): Promise<EnginDetail> {
    return this.engins.findOne(id);
  }

  @Post('engins')
  create(@Body() dto: CreateEnginDto): Promise<EnginDetail> {
    return this.engins.create(dto);
  }

  @Patch('engins/:id')
  update(@Param('id', IdPipe) id: number, @Body() dto: UpdateEnginDto): Promise<EnginDetail> {
    return this.engins.update(id, dto);
  }

  /** Photo de l'engin (champ `photo`) */
  @Post('engins/:id/photo')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', photoUploadOptions), CleanupUploadsOnErrorInterceptor)
  photo(@Param('id', IdPipe) id: number, @UploadedFile() file: Express.Multer.File | undefined): Promise<EnginDetail> {
    return this.engins.setPhoto(id, file);
  }

  /** Check-list de prise de poste propre à l'engin (ou retour à la liste type : { reset: true }) */
  @Patch('engins/:id/checklist')
  checklist(@Param('id', IdPipe) id: number, @Body() dto: ChecklistDto): Promise<EnginDetail> {
    return this.engins.setChecklist(id, dto);
  }

  /** Changement manuel d'état (ex. Hors service → Disponible) */
  @Patch('engins/:id/status')
  status(@Param('id', IdPipe) id: number, @Body() dto: EnginStatusDto): Promise<EnginDetail> {
    return this.engins.setStatus(id, dto.status);
  }

  @Delete('engins/:id')
  @HttpCode(204)
  remove(@Param('id', IdPipe) id: number): Promise<void> {
    return this.engins.remove(id);
  }

  /** Entretien, réparation, panne ou contrôle périodique (justificatif optionnel : champ `file`) */
  @Post('engins/:id/maintenance')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions), CleanupUploadsOnErrorInterceptor)
  addMaintenance(
    @Param('id', IdPipe) id: number,
    @Body() dto: CreateMaintenanceDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<EnginDetail> {
    return this.engins.addMaintenance(id, dto, file);
  }

  /** Déclarer une panne : l'engin passe « En panne » */
  @Post('engins/:id/breakdown')
  breakdown(@Param('id', IdPipe) id: number, @Body() dto: BreakdownDto): Promise<EnginDetail> {
    return this.engins.declareBreakdown(id, dto);
  }

  /** Remise en service (clôture d'une panne / intervention) */
  @Post('maintenance/:id/close')
  close(@Param('id', IdPipe) id: number, @Body() dto: CloseMaintenanceDto): Promise<EnginDetail> {
    return this.engins.closeMaintenance(id, dto);
  }

  @Delete('maintenance/:id')
  removeMaintenance(@Param('id', IdPipe) id: number): Promise<EnginDetail> {
    return this.engins.removeMaintenance(id);
  }

  /** Check-list de prise de poste (points selon le type d'engin) */
  @Post('engins/:id/checks')
  addCheck(@Param('id', IdPipe) id: number, @Body() dto: CreateCheckDto): Promise<EnginDetail> {
    return this.engins.addCheck(id, dto);
  }

  @Delete('engin-checks/:id')
  removeCheck(@Param('id', IdPipe) id: number): Promise<EnginDetail> {
    return this.engins.removeCheck(id);
  }
}

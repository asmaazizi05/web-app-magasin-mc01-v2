import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Query, StreamableFile } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IdPipe } from '../common/id-param';
import {
  CreateInterventionDto,
  CreateTaskDto,
  CreateWorkLogDto,
  InterventionQueryDto,
  MemberDto,
  UpdateInterventionDto,
  UpdateMemberDto,
  UpdateTaskDto,
} from './interventions.dto';
import { interventionWorkbook } from './interventions.export';
import { InterventionDetail, InterventionsService, InterventionSummary } from './interventions.service';

@ApiTags('interventions')
@Controller()
export class InterventionsController {
  constructor(private readonly interventions: InterventionsService) {}

  /** Types de travaux proposés */
  @Get('interventions/options')
  options(): { workTypes: string[] } {
    return this.interventions.options();
  }

  /** Interventions (équipes support & prestataires) avec avancement, retard et alertes */
  @Get('interventions')
  findAll(@Query() query: InterventionQueryDto): Promise<InterventionSummary[]> {
    return this.interventions.findAll(query);
  }

  /** Détail complet : équipe, tâches (intervenants, engins, alertes), journal des travaux */
  @Get('interventions/:id')
  findOne(@Param('id', IdPipe) id: number): Promise<InterventionDetail> {
    return this.interventions.findOne(id);
  }

  /** Rapport d'avancement Excel (.xlsx) */
  @Get('interventions/:id/export.xlsx')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async export(@Param('id', IdPipe) id: number): Promise<StreamableFile> {
    const detail = await this.interventions.findOne(id);
    return new StreamableFile(await interventionWorkbook(detail), {
      disposition: `attachment; filename="${detail.code}-rapport-avancement.xlsx"`,
    });
  }

  @Post('interventions')
  create(@Body() dto: CreateInterventionDto): Promise<InterventionDetail> {
    return this.interventions.create(dto);
  }

  /** Mise à jour (dont statut : dates réelles renseignées automatiquement) */
  @Patch('interventions/:id')
  update(@Param('id', IdPipe) id: number, @Body() dto: UpdateInterventionDto): Promise<InterventionDetail> {
    return this.interventions.update(id, dto);
  }

  @Delete('interventions/:id')
  @HttpCode(204)
  remove(@Param('id', IdPipe) id: number): Promise<void> {
    return this.interventions.remove(id);
  }

  @Post('interventions/:id/members')
  addMember(@Param('id', IdPipe) id: number, @Body() dto: MemberDto): Promise<InterventionDetail> {
    return this.interventions.addMember(id, dto);
  }

  @Patch('intervention-members/:id')
  updateMember(@Param('id', IdPipe) id: number, @Body() dto: UpdateMemberDto): Promise<InterventionDetail> {
    return this.interventions.updateMember(id, dto);
  }

  @Delete('intervention-members/:id')
  removeMember(@Param('id', IdPipe) id: number): Promise<InterventionDetail> {
    return this.interventions.removeMember(id);
  }

  @Post('interventions/:id/tasks')
  addTask(@Param('id', IdPipe) id: number, @Body() dto: CreateTaskDto): Promise<InterventionDetail> {
    return this.interventions.addTask(id, dto);
  }

  /** Mise à jour d'une tâche (avancement, statut, intervenants, engins) */
  @Patch('intervention-tasks/:id')
  updateTask(@Param('id', IdPipe) id: number, @Body() dto: UpdateTaskDto): Promise<InterventionDetail> {
    return this.interventions.updateTask(id, dto);
  }

  @Delete('intervention-tasks/:id')
  removeTask(@Param('id', IdPipe) id: number): Promise<InterventionDetail> {
    return this.interventions.removeTask(id);
  }

  /** Compte rendu de travaux exécutés (peut mettre à jour l'avancement d'une tâche) */
  @Post('interventions/:id/logs')
  addLog(@Param('id', IdPipe) id: number, @Body() dto: CreateWorkLogDto): Promise<InterventionDetail> {
    return this.interventions.addLog(id, dto);
  }

  @Delete('work-logs/:id')
  removeLog(@Param('id', IdPipe) id: number): Promise<InterventionDetail> {
    return this.interventions.removeLog(id);
  }
}

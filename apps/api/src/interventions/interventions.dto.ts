import { PartialType } from '@nestjs/swagger';
import { InterventionStatus, ProviderKind, TaskStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateInterventionDto {
  @MaxLength(160) @IsString() @IsNotEmpty({ message: "L'intitulé du projet est obligatoire." }) title: string;
  /** Nettoyage, Réimplantation, Inventaire… */
  @MaxLength(80) @IsString() @IsNotEmpty({ message: 'Le type de travaux est obligatoire.' }) workType: string;
  @IsEnum(ProviderKind) providerKind: ProviderKind;
  @MaxLength(120) @IsString() @IsNotEmpty({ message: "La société ou l'équipe est obligatoire." }) company: string;
  @MaxLength(120) @IsString() @IsNotEmpty({ message: 'Le responsable sur place est obligatoire.' }) managerName: string;
  @IsOptional() @MaxLength(30) @IsString() managerPhone?: string;
  /** Zone du magasin concernée ; `null` = plusieurs zones / non précisée */
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsInt() @IsPositive() zoneId?: number | null;
  @IsOptional() @MaxLength(2000) @IsString() description?: string;
  @IsDateString({}, { message: 'Date de début prévue invalide.' }) plannedStart: string;
  @IsDateString({}, { message: 'Date de fin prévue invalide.' }) plannedEnd: string;
}

export class UpdateInterventionDto extends PartialType(CreateInterventionDto) {
  @IsOptional() @IsEnum(InterventionStatus) status?: InterventionStatus;
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsDateString() actualStart?: string | null;
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsDateString() actualEnd?: string | null;
}

export class InterventionQueryDto {
  @IsOptional() @IsEnum(InterventionStatus) status?: InterventionStatus;
}

export class MemberDto {
  @MaxLength(120) @IsString() @IsNotEmpty({ message: "Le nom de l'intervenant est obligatoire." }) name: string;
  @MaxLength(80) @IsString() @IsNotEmpty({ message: 'La fonction est obligatoire.' }) role: string;
  @IsOptional() @MaxLength(120) @IsString() company?: string;
  @IsOptional() @MaxLength(30) @IsString() phone?: string;
}

export class UpdateMemberDto extends PartialType(MemberDto) {}

export class CreateTaskDto {
  @MaxLength(160) @IsString() @IsNotEmpty({ message: "L'intitulé de la tâche est obligatoire." }) title: string;
  @IsOptional() @MaxLength(2000) @IsString() description?: string;
  @IsDateString({}, { message: 'Date de début invalide.' }) plannedStart: string;
  @IsDateString({}, { message: 'Date de fin invalide.' }) plannedEnd: string;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsInt({ each: true }) memberIds?: number[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsInt({ each: true }) enginIds?: number[];
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
}

export class CreateWorkLogDto {
  @IsDateString({}, { message: 'Date invalide.' }) date: string;
  @MaxLength(2000) @IsString() @IsNotEmpty({ message: 'Décrivez les travaux exécutés.' }) description: string;
  @MaxLength(120) @IsString() @IsNotEmpty({ message: "Le nom de l'auteur est obligatoire." }) author: string;
  /** Tâche concernée (optionnelle) */
  @IsOptional() @IsInt() @IsPositive() taskId?: number;
  /** Avancement atteint par la tâche (met à jour la tâche) */
  @IsOptional() @IsInt() @Min(0) @Max(100) progressAfter?: number;
}

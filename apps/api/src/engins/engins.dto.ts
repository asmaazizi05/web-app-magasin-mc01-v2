import { PartialType } from '@nestjs/swagger';
import { EnginOwnership, EnginStatus, MaintenanceType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { INSPECTION_RESULTS } from './engins.config';

/** Fiche engin : identification, propriété, caractéristiques techniques, plan d'entretien */
export class CreateEnginDto {
  /** Code interne (ex. ENG-02) ; généré automatiquement s'il est omis */
  @IsOptional() @MaxLength(20) @IsString() code?: string;
  @MaxLength(120) @IsString() @IsNotEmpty({ message: "La désignation de l'engin est obligatoire." }) name: string;
  @MaxLength(80) @IsString() @IsNotEmpty({ message: "Le type d'engin est obligatoire." }) type: string;
  @IsOptional() @IsEnum(EnginStatus) status?: EnginStatus;
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsInt() @IsPositive() requiredHabilitationTypeId?: number | null;

  // Identification
  @IsOptional() @MaxLength(60) @IsString() brand?: string;
  @IsOptional() @MaxLength(60) @IsString() model?: string;
  @IsOptional() @MaxLength(80) @IsString() serialNumber?: string;
  /** Immatriculation / n° de parc */
  @IsOptional() @MaxLength(80) @IsString() reference?: string;
  @IsOptional() @IsInt() @Min(1950) @Max(2100) commissioningYear?: number;

  // Propriété
  @IsOptional() @IsEnum(EnginOwnership) ownership?: EnginOwnership;
  @IsOptional() @MaxLength(120) @IsString() ownerService?: string;
  @IsOptional() @MaxLength(120) @IsString() rentalCompany?: string;
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsDateString() rentalEndDate?: string | null;

  // Caractéristiques techniques
  @IsOptional() @MaxLength(40) @IsString() energy?: string;
  @IsOptional() @IsInt() @Min(0) @Max(200000) capacityKg?: number;
  @IsOptional() @IsInt() @Min(0) @Max(200000) weightKg?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) liftHeightM?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) workingHeightM?: number;
  @IsOptional() @IsInt() @Min(0) @Max(5000) forkLengthMm?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000) batteryVoltage?: number;
  @IsOptional() @IsInt() @Min(0) @Max(5000) batteryCapacityAh?: number;
  @IsOptional() @IsInt() @Min(1) @Max(20) maxPersons?: number;
  @IsOptional() @MaxLength(40) @IsString() usage?: string;
  @IsOptional() @MaxLength(80) @IsString() dimensions?: string;
  @IsOptional() @MaxLength(2000) @IsString() notes?: string;

  // Compteur & plan d'entretien
  @IsOptional() @IsInt() @Min(0) hourMeter?: number;
  @IsOptional() @IsInt() @Min(1) @Max(20000) serviceIntervalHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(60) serviceIntervalMonths?: number;
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsDateString() lastServiceDate?: string | null;
  @IsOptional() @IsInt() @Min(0) lastServiceHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(60) inspectionIntervalMonths?: number;
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsDateString() lastInspectionDate?: string | null;
}

export class UpdateEnginDto extends PartialType(CreateEnginDto) {}

export class CreateMaintenanceDto {
  @IsEnum(MaintenanceType) type: MaintenanceType;
  @IsDateString({}, { message: 'Date invalide.' }) date: string;
  /** Remise en service (vide = intervention / panne en cours) */
  @IsOptional() @IsDateString({}, { message: 'Date de remise en service invalide.' }) endDate?: string;
  @IsOptional() @IsInt() @Min(0) hourMeter?: number;
  @MaxLength(2000) @IsString() @IsNotEmpty({ message: "Décrivez l'intervention." }) description: string;
  @IsOptional() @MaxLength(1000) @IsString() partsReplaced?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) cost?: number;
  @IsOptional() @MaxLength(120) @IsString() provider?: string;
  @IsOptional() @IsIn(INSPECTION_RESULTS, { message: 'Résultat de contrôle inconnu.' }) result?: string;
}

export class BreakdownDto {
  @MaxLength(2000) @IsString() @IsNotEmpty({ message: 'Décrivez la panne.' }) description: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsInt() @Min(0) hourMeter?: number;
}

export class CloseMaintenanceDto {
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) cost?: number;
  @IsOptional() @MaxLength(1000) @IsString() partsReplaced?: string;
  @IsOptional() @MaxLength(120) @IsString() provider?: string;
}

export class EnginStatusDto {
  @IsEnum(EnginStatus) status: EnginStatus;
}

export class CheckItemDto {
  @IsString() @IsNotEmpty() key: string;
  @IsBoolean() ok: boolean;
}

export class CreateCheckDto {
  @IsOptional() @IsInt() @IsPositive() storekeeperId?: number;
  /** Nom du conducteur s'il n'est pas magasinier */
  @IsOptional() @MaxLength(120) @IsString() operatorName?: string;
  @IsOptional() @IsInt() @Min(0) hourMeter?: number;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => CheckItemDto) items: CheckItemDto[];
  @IsOptional() @MaxLength(1000) @IsString() comment?: string;
  /** Anomalie : mettre l'engin à l'arrêt (déclare une panne) */
  @IsOptional() @IsBoolean() stopEngin?: boolean;
}

export class ChecklistItemDto {
  /** Clé d'un point existant (à conserver) ; omise pour un nouveau point */
  @IsOptional() @IsString() key?: string;
  @MaxLength(160) @IsString() @IsNotEmpty({ message: 'Un point de la check-list est vide.' }) label: string;
}

export class ChecklistDto {
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ChecklistItemDto) items?: ChecklistItemDto[];
  /** Revenir à la liste type de la famille d'engin */
  @IsOptional() @IsBoolean() reset?: boolean;
}

import { ShiftType } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsPositive, Max, Min, ValidateIf } from 'class-validator';

export class PlanningQueryDto {
  /** Premier jour affiché (« YYYY-MM-DD ») ; ramené au lundi. Par défaut : semaine en cours */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Nombre de semaines affichées (1–12, défaut 6) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  weeks?: number;
}

export class UpsertShiftDto {
  @IsInt()
  @IsPositive()
  storekeeperId: number;

  /** Un jour de la semaine visée (« YYYY-MM-DD ») ; ramené au lundi */
  @IsDateString()
  weekStart: string;

  /** Poste ; `null` efface l'affectation. Omis : poste inchangé (ex. simple verrouillage) */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsEnum(ShiftType)
  type?: ShiftType | null;

  /** Verrouille / déverrouille la semaine */
  @IsOptional()
  @IsBoolean()
  locked?: boolean;
}

export class ExtendRotationDto {
  /** Nombre de semaines à générer après la dernière semaine planifiée (1–12, défaut 4) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  weeks?: number;
}

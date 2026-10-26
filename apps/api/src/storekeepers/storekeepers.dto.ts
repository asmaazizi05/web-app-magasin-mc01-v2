import { PartialType } from '@nestjs/swagger';
import { ShiftType } from '@prisma/client';
import { IsDateString, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class CreateStorekeeperDto {
  /** Matricule unique (ex. M-8806) */
  @Matches(/^M-\d{4}$/, { message: 'Le matricule doit respecter le format M-####.' })
  matricule: string;

  @MaxLength(120) @IsString() @IsNotEmpty({ message: 'Le nom est obligatoire.' }) name: string;
  @MaxLength(80) @IsString() @IsNotEmpty({ message: 'La fonction est obligatoire.' }) role: string;
  @MaxLength(120) @IsString() @IsNotEmpty({ message: 'La spécialité est obligatoire.' }) specialty: string;

  @IsOptional() @MaxLength(30) @IsString() phone?: string;

  /** Facultatifs ; `null` efface la valeur */
  @IsOptional() @MaxLength(160) @IsEmail({}, { message: "L'adresse e-mail n'est pas valide." }) email?: string | null;
  @IsOptional() @MaxLength(120) @IsString() company?: string | null;

  /** Date d'entrée (« YYYY-MM-DD ») */
  @IsOptional() @IsDateString() hireDate?: string;
}

export class UpdateStorekeeperDto extends PartialType(CreateStorekeeperDto) {
  /** Poste fixe (la personne ne tourne plus) ; `null` = retour dans la rotation */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsEnum(ShiftType)
  fixedPost?: ShiftType | null;
}

export class CreateTrainingDto {
  @MaxLength(160) @IsString() @IsNotEmpty({ message: "L'intitulé de la formation est obligatoire." }) title: string;
  @IsOptional() @MaxLength(120) @IsString() organization?: string;
  @IsDateString({}, { message: 'Date de formation invalide.' }) date: string;
  @IsOptional() @IsInt() @Min(1) @Max(2000) durationHours?: number;
}

export class UpdateTrainingDto extends PartialType(CreateTrainingDto) {}

export class CreateHabilitationDto {
  @IsInt() @IsPositive() typeId: number;
  @IsOptional() @MaxLength(80) @IsString() reference?: string;
  @IsOptional() @MaxLength(120) @IsString() organization?: string;
  @IsDateString({}, { message: "Date d'obtention invalide." }) obtainedAt: string;
  /** Par défaut : date d'obtention + durée de validité du type */
  @IsOptional() @IsDateString({}, { message: "Date d'expiration invalide." }) expiresAt?: string;
}

export class UpdateHabilitationDto extends PartialType(CreateHabilitationDto) {}

export class HabilitationTypeDto {
  @MaxLength(120) @IsString() @IsNotEmpty({ message: "Le nom de l'habilitation est obligatoire." }) name: string;
  @IsOptional() @MaxLength(240) @IsString() description?: string;
  @IsInt() @Min(1) @Max(240) validityMonths: number;
}

export class UpdateHabilitationTypeDto extends PartialType(HabilitationTypeDto) {}

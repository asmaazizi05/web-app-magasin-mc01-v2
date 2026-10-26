import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateSettingsDto {
  /** En-tête de l'application */
  @IsOptional() @MaxLength(60) @IsString() @IsNotEmpty({ message: "Le titre de l'application est obligatoire." }) appTitle?: string;
  @IsOptional() @MaxLength(40) @IsString() @IsNotEmpty({ message: 'Le nom du site est obligatoire.' }) siteLabel?: string;
  /** Contrôle périodique proposé pour un nouvel engin (mois) */
  @IsOptional() @IsInt() @Min(1) @Max(60) enginInspectionMonths?: number;
  /** Nombre de semaines proposé par « Prolonger la rotation » */
  @IsOptional() @IsIn([1, 2, 3, 4, 5, 6, 8, 12]) rotationExtendWeeks?: number;
  /** Délai d'alerte avant expiration d'une habilitation (jours) */
  @IsOptional() @IsInt() @Min(1) @Max(365) habilitationAlertDays?: number;
  /** Stock : marge « Limite Approche » au-dessus du stock minimum (%) */
  @IsOptional() @IsInt() @Min(0) @Max(200) stockLimitMarginPct?: number;
  /** Engins : alerte « bientôt » N jours avant une échéance (entretien, contrôle, fin de location) */
  @IsOptional() @IsInt() @Min(1) @Max(180) enginAlertDays?: number;
  /** Engins : alerte « bientôt » N heures de compteur avant un entretien */
  @IsOptional() @IsInt() @Min(1) @Max(500) enginAlertHours?: number;
  @IsOptional() @IsString() @IsNotEmpty() sapSystem?: string;
  @IsOptional() @IsString() @IsNotEmpty() sapHost?: string;
  @IsOptional() @IsString() @IsNotEmpty() sapClient?: string;
  @IsOptional() @IsString() @IsNotEmpty() sapPlant?: string;
  @IsOptional() @IsString() @IsNotEmpty() sapStorageLocation?: string;
  @IsOptional() @IsInt() @Min(5) @Max(1440) syncIntervalMinutes?: number;
  @IsOptional() @IsBoolean() autoSync?: boolean;
}

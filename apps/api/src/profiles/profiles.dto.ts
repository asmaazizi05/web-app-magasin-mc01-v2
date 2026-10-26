import { PartialType } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Rubriques du menu qu'on peut autoriser ou masquer par personne (mêmes chemins que le menu du site) */
export const PROFILE_ROUTES = ['/', '/cartographie', '/shifts', '/stock', '/receptions', '/expeditions', '/mouvements', '/inventaire-saisie', '/inventaire', '/parametres'] as const;

export class CreateProfileDto {
  @MaxLength(120) @IsString() @IsNotEmpty({ message: 'Le nom est obligatoire.' }) name: string;
  @MaxLength(120) @IsString() @IsNotEmpty({ message: 'Le titre / poste est obligatoire.' }) role: string;
  @IsOptional() @IsBoolean() admin?: boolean;

  /** Coordonnées, facultatives ; `null` efface la valeur */
  @IsOptional() @MaxLength(30) @IsString() phone?: string | null;
  @IsOptional() @MaxLength(160) @IsEmail({}, { message: "L'adresse e-mail n'est pas valide." }) email?: string | null;

  /** Rubriques masquées pour cette personne */
  @IsOptional()
  @ArrayUnique()
  @IsIn(PROFILE_ROUTES, { each: true, message: 'Rubrique inconnue.' })
  @IsArray()
  hiddenRoutes?: string[];

  /** Rubriques en consultation seulement (visibles, non modifiables) */
  @IsOptional()
  @ArrayUnique()
  @IsIn(PROFILE_ROUTES, { each: true, message: 'Rubrique inconnue.' })
  @IsArray()
  readOnlyRoutes?: string[];
}

export class UpdateProfileDto extends PartialType(CreateProfileDto) {}

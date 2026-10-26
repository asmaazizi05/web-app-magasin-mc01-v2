import { ApiProperty } from '@nestjs/swagger';
import { MovementType, ShiftType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SHEET_CATEGORIES, SHEET_DEST_ZONES, SHEET_REQUESTER_TYPES, SHEET_UNITS } from './sheet-options';

/** Champs texte de la fiche (multipart/form-data, les photos arrivent dans le champ `photos`). */
export class CreateStockSheetDto {
  /** Type de mouvements : IN = Entrée, OUT = Sortie */
  @IsEnum(MovementType)
  type: MovementType;

  @IsDateString()
  date: string;

  /** Désignation / Référence telle que saisie */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  designation: string;

  /** Article du catalogue correspondant à la désignation */
  @IsInt()
  @IsPositive()
  articleId: number;

  @IsIn(SHEET_CATEGORIES, { message: 'Catégorie inconnue.' })
  category: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsIn(SHEET_UNITS, { message: 'Unité inconnue.' })
  unit: string;

  @IsIn(SHEET_REQUESTER_TYPES, { message: 'Demandeur inconnu.' })
  requesterType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  requesterName: string;

  @IsInt()
  @IsPositive()
  storekeeperId: number;

  @IsEnum(ShiftType)
  post: ShiftType;

  /** Entrée : fournisseur (obligatoire pour une entrée) */
  @ValidateIf((o: CreateStockSheetDto) => o.type === MovementType.IN)
  @MaxLength(160)
  @IsString()
  // class-validator évalue les décorateurs de bas en haut : le contrôle « obligatoire » passe en premier
  @IsNotEmpty({ message: 'Le fournisseur est obligatoire pour une entrée.' })
  supplier?: string;

  /** Sortie : zone de destination (LAVERIE, TREMIE, LIAISON) */
  @ValidateIf((o: CreateStockSheetDto) => o.type === MovementType.OUT)
  @IsIn(Object.keys(SHEET_DEST_ZONES), { message: 'Zone de destination inconnue.' })
  destinationZone?: string;

  /** Sortie : secteur de la zone (ex. « 320 - Conditionnement et flottation ») */
  @ValidateIf((o: CreateStockSheetDto) => o.type === MovementType.OUT)
  @MaxLength(160)
  @IsString()
  @IsNotEmpty({ message: 'Le secteur de la zone est obligatoire pour une sortie.' })
  destinationArea?: string;
}

/** Schéma Swagger du formulaire multipart (champs + photos) */
export class CreateStockSheetFormDto extends CreateStockSheetDto {
  @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' }, description: "Photos d'article (1 à 5 images)" })
  photos: unknown[];
}

export class StockSheetQueryDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(200)
  limit?: number;
}

import { AbcClass, ArticleCategory, PurchaseScope, ShiftType } from '@prisma/client';
import { SHEET_CATEGORIES } from '../stock-sheets/sheet-options';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { COUNT_UNITS } from './inventory.config';

export class CountLineDto {
  /** Article trouvé dans le référentiel ; sinon référence et/ou désignation libres */
  @IsOptional() @IsInt() @IsPositive() articleId?: number;
  @IsOptional() @MaxLength(80) @IsString() enteredReference?: string;
  @ValidateIf((o: CountLineDto) => !o.articleId && !o.enteredReference)
  @MaxLength(200)
  @IsString()
  @IsNotEmpty({ message: 'Choisissez un article du référentiel ou saisissez une référence / désignation.' })
  enteredDesignation?: string;
  @IsInt() @Min(0) quantity: number;
  @IsIn(COUNT_UNITS, { message: 'Unité inconnue.' }) unit: string;
  @IsEnum(PurchaseScope) purchaseScope: PurchaseScope;
  @IsIn(SHEET_CATEGORIES, { message: 'Choisissez la catégorie de l\'article.' }) category: string;
}

export class CreateCountDto {
  @IsInt() @IsPositive() storekeeperId: number;
  @IsDateString({}, { message: 'Date de comptage invalide.' }) countedAt: string;
  @IsEnum(ShiftType, { message: 'Choisissez le poste de travail.' }) post: ShiftType;
  @IsOptional() @MaxLength(120) @IsString() location?: string;
  @IsOptional() @MaxLength(1000) @IsString() comment?: string;
  @IsArray()
  @ArrayMinSize(1, { message: 'Ajoutez au moins une ligne de comptage.' })
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => CountLineDto)
  lines: CountLineDto[];
}

export class SearchDto {
  @IsOptional() @MaxLength(100) @IsString() q?: string;
}

/** Nom du responsable qui traite (profil actif) */
export class ResolverDto {
  @MaxLength(120) @IsString() @IsNotEmpty() resolvedBy: string;
}

export class LinkLineDto extends ResolverDto {
  @IsInt() @IsPositive() articleId: number;
}

export class CreateArticleFromLineDto extends ResolverDto {
  @Matches(/^ART-\d{4,}$/, { message: 'Le code doit respecter le format ART-####.' }) code: string;
  @MaxLength(160) @IsString() @IsNotEmpty({ message: 'La désignation officielle est obligatoire.' }) designation: string;
  @IsEnum(ArticleCategory) category: ArticleCategory;
  @IsInt() @IsPositive() zoneId: number;
  @IsOptional() @MaxLength(120) @IsString() rackLocation?: string;
  @IsOptional() @IsInt() @Min(0) minStock?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) unitCostCMP?: number;
  @IsOptional() @IsEnum(AbcClass) abcClass?: AbcClass;
}

export class RejectDto extends ResolverDto {
  @IsOptional() @MaxLength(300) @IsString() reason?: string;
}

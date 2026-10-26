import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { AbcClass, ArticleCategory, ArticleOrigin } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateArticleDto {
  /** Code article unique (ex. ART-1006) */
  @Matches(/^ART-\d{4,}$/, { message: 'Le code doit respecter le format ART-####.' })
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  designation: string;

  @IsEnum(ArticleCategory)
  category: ArticleCategory;

  @IsEnum(ArticleOrigin)
  origin: ArticleOrigin;

  /** Libellé d'origine affiché (ex. « Cession OCP Jorf ») */
  @IsString()
  @IsNotEmpty()
  originLabel: string;

  @IsInt()
  @IsPositive()
  zoneId: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  rackId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  rackLevel?: number;

  /** Emplacement libre ; déduit du rack/niveau s'il est omis */
  @IsOptional()
  @IsString()
  rackLocation?: string;

  /** Stock d'ouverture (les variations suivantes passent par les BR/BS) */
  @IsOptional()
  @IsInt()
  @Min(0)
  currentStock?: number;

  @IsInt()
  @Min(0)
  minStock: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCostCMP: number;

  @IsEnum(AbcClass)
  abcClass: AbcClass;
}

export class UpdateArticleDto extends PartialType(OmitType(CreateArticleDto, ['code', 'currentStock'] as const)) {}

export class ArticleQueryDto {
  /** Recherche plein texte sur code, désignation, emplacement ou zone */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(ArticleOrigin)
  origin?: ArticleOrigin;

  @IsOptional()
  @IsInt()
  zoneId?: number;

  @IsOptional()
  @IsInt()
  rackId?: number;

  /** Uniquement les articles sous le stock minimum */
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean()
  alertOnly?: boolean;
}

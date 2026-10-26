import { MovementType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsPositive, Max } from 'class-validator';

export class MovementQueryDto {
  /** IN = entrées, OUT = sorties ; omis = tous les mouvements */
  @IsOptional()
  @IsEnum(MovementType)
  type?: MovementType;

  @IsOptional()
  @IsInt()
  @IsPositive()
  articleId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(1000)
  limit?: number;
}

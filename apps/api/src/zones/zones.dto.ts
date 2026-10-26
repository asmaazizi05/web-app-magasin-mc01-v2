import { PartialType } from '@nestjs/swagger';
import { ZoneType } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches, Min } from 'class-validator';

export class CreateZoneDto {
  @Matches(/^[a-z0-9-]+$/, { message: 'Le code zone doit être en minuscules (ex. grand-abri).' })
  code: string;

  @IsInt()
  @Min(1)
  position: number;

  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() category: string;
  @IsString() @IsNotEmpty() description: string;
  @IsString() @IsNotEmpty() planTitle: string;
  @IsString() @IsNotEmpty() planSubtitle: string;

  @IsEnum(ZoneType)
  type: ZoneType;

  @IsInt()
  @IsPositive()
  capacity: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  areaM2?: number;
}

export class UpdateZoneDto extends PartialType(CreateZoneDto) {}

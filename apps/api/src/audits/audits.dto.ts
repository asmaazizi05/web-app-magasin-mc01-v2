import { AuditStatus } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class AuditQueryDto {
  @IsOptional() @IsInt() @Min(2000) @Max(2100) year?: number;
  @IsOptional() @IsInt() @Min(1) @Max(12) month?: number;
}

export class UpdateAuditDto {
  @IsOptional() @IsEnum(AuditStatus) status?: AuditStatus;
  @IsOptional() @IsInt() @Min(0) countedLines?: number;
  @IsOptional() @IsInt() @Min(0) accurateLines?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) countedValue?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) varianceValue?: number;
}

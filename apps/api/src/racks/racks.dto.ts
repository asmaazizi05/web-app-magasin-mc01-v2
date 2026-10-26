import { PartialType } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches, Max, Min } from 'class-validator';

export class CreateRackDto {
  @Matches(/^R\d+$/, { message: 'Le code rack doit respecter le format R1, R2…' })
  code: string;

  @IsInt() @IsPositive() zoneId: number;
  @IsInt() @Min(1) aisle: number;
  @IsString() @IsNotEmpty() aisleLabel: string;
  @IsInt() @Min(1) @Max(10) levels: number;
  @IsInt() @IsPositive() capacity: number;
}

export class UpdateRackDto extends PartialType(CreateRackDto) {}

export class RackQueryDto {
  @IsOptional()
  @IsInt()
  zoneId?: number;
}

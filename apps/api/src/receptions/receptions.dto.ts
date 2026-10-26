import { ReceptionStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches } from 'class-validator';

export class CreateReceptionDto {
  /** N° BR SAP ; généré automatiquement (BR-YYYY-####) s'il est omis */
  @IsOptional()
  @Matches(/^BR-\d{4}-\d{4}$/, { message: 'Le N° BR doit respecter le format BR-YYYY-####.' })
  number?: string;

  /** Fournisseur ou site d'origine (ex. « SKF Maroc SA », « Cession Site OCP Jorf ») */
  @IsString()
  @IsNotEmpty()
  supplier: string;

  @IsInt() @IsPositive() articleId: number;
  @IsInt() @IsPositive() quantity: number;
  @IsInt() @IsPositive() receiverId: number;

  /** Date/heure de réception (ISO 8601) ; maintenant par défaut */
  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @IsOptional()
  @IsEnum(ReceptionStatus)
  status?: ReceptionStatus;
}

export class UpdateReceptionStatusDto {
  @IsEnum(ReceptionStatus)
  status: ReceptionStatus;
}

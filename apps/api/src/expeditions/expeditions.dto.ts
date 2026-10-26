import { ExpeditionPriority, ExpeditionStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches } from 'class-validator';

export class CreateExpeditionDto {
  /** N° BS SAP ; généré automatiquement (BS-YYYY-####) s'il est omis */
  @IsOptional()
  @Matches(/^BS-\d{4}-\d{4}$/, { message: 'Le N° BS doit respecter le format BS-YYYY-####.' })
  number?: string;

  /** Service demandeur / chantier destinataire */
  @IsString()
  @IsNotEmpty()
  requesterService: string;

  @IsInt() @IsPositive() articleId: number;
  @IsInt() @IsPositive() quantity: number;

  @IsEnum(ExpeditionPriority)
  priority: ExpeditionPriority;

  /** Magasinier préparateur ; si renseigné le bon passe directement « En Picking » */
  @IsOptional()
  @IsInt()
  @IsPositive()
  preparerId?: number;

  @IsOptional() @IsDateString() requestedAt?: string;

  /** Échéance de livraison (OTIF) ; déduite de la priorité si omise */
  @IsOptional() @IsDateString() dueAt?: string;
}

export class UpdateExpeditionStatusDto {
  @IsEnum(ExpeditionStatus)
  @IsIn([ExpeditionStatus.EN_PICKING, ExpeditionStatus.LIVRE, ExpeditionStatus.ANNULE])
  status: ExpeditionStatus;
}

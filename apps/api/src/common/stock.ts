import { Prisma } from '@prisma/client';
import { alertConfig } from './alert-config';

export type AlertStatus = 'CRITIQUE' | 'LIMITE' | 'CONFORME';

export function computeAlertStatus(currentStock: number, minStock: number): AlertStatus {
  if (currentStock < minStock) return 'CRITIQUE';
  // « Limite Approche » : marge réglable au-dessus du stock minimum (25 % par défaut)
  if (currentStock < minStock * (1 + alertConfig.stockLimitMarginPct / 100)) return 'LIMITE';
  return 'CONFORME';
}

export function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

export function round(value: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function pct(part: number, total: number, digits = 1): number {
  return total > 0 ? round((part / total) * 100, digits) : 0;
}

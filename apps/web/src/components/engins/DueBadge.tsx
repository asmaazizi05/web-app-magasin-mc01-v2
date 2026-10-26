import { DUE_STATUS } from '@/lib/labels';
import type { DueStatus } from '@/lib/types';
import { StatusBadge } from '../ui/StatusBadge';
import { useT } from '@/lib/i18n';

/** Pastille d'échéance (entretien, contrôle, location) */
export function DueBadge({ status }: { status: DueStatus }) {
  const tr = useT();
  return <StatusBadge tone={DUE_STATUS[status].tone} label={tr(DUE_STATUS[status].label)} />;
}

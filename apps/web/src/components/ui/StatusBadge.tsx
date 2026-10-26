import type { LucideIcon } from 'lucide-react';
import type { Tone } from '@/lib/labels';
import { BADGE_TONE } from './tones';

interface StatusBadgeProps {
  tone: Tone;
  label: string;
  icon?: LucideIcon;
  /** `rounded-lg` pour les statuts, `rounded` pour les étiquettes */
  shape?: 'status' | 'tag';
  weight?: 'semibold' | 'bold' | 'extrabold';
  className?: string;
}

export function StatusBadge({ tone, label, icon: Icon, shape = 'status', weight = 'bold', className = '' }: StatusBadgeProps) {
  const weightClass = { semibold: 'font-semibold', bold: 'font-bold', extrabold: 'font-extrabold' }[weight];
  return (
    <span
      className={`badge-pop inline-flex w-fit items-center gap-1 whitespace-nowrap px-2 py-0.5 ${shape === 'status' ? 'rounded-lg' : 'rounded'} ${weightClass} ${BADGE_TONE[tone]} ${className}`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}

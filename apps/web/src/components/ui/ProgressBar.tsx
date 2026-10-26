/** Barre d'avancement 0–100 % (verte à 100 %, ambre si en retard) */
export function ProgressBar({ value, late = false, size = 'md' }: { value: number; late?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const h = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' }[size];
  const color = value >= 100 ? 'bg-green-500' : late ? 'bg-amber-500' : 'bg-jesa';
  return (
    <div className={`w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${h}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full origin-left animate-bar rounded-full transition-all ${color}`} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </div>
  );
}

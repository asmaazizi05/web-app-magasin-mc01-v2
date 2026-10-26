import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { PlanningBoard } from '@/components/shifts/PlanningBoard';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { api } from '@/lib/api';
import { getT } from '@/lib/i18n/server';

const WEEKS = 6;

const shift = (day: string, weeks: number): string => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
};

export default async function ShiftsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const tr = await getT();
  const { from } = await searchParams;
  const [planning, settings] = await Promise.all([api.planning(from, WEEKS), api.settings()]);
  const first = planning.weeks[0]?.weekStart ?? planning.currentWeekStart;
  const navClass =
    'flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-jesa dark:border-gray-700 dark:bg-navy-light dark:text-gray-200';

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr('Rotation des Magasiniers (Planning des Postes)')}
        subtitle={tr("Planning hebdomadaire des {0} magasiniers : cliquez sur une case pour changer le poste, la verrouiller ou l'effacer.", planning.rows.length)}
        actions={
          <div className="flex items-center gap-1.5">
            <Link href={`/shifts?from=${shift(first, -4)}`} className={navClass}>
              <ChevronLeft className="h-3.5 w-3.5" /> {tr('4 semaines')}
            </Link>
            <Link href="/shifts" className={navClass}>
              {tr('Semaine actuelle')}
            </Link>
            <Link href={`/shifts?from=${shift(first, 4)}`} className={navClass}>
              {tr('4 semaines')} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        }
      />
      <Card className="space-y-4 !rounded-xl">
        <PlanningBoard planning={planning} defaultExtendWeeks={settings.rotationExtendWeeks} />
      </Card>
    </div>
  );
}

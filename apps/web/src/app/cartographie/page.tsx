import { MapPin, Package } from 'lucide-react';
import Link from 'next/link';
import { PillGroup } from '@/components/ui/PillGroup';
import { RackPlan } from '@/components/RackPlan';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { api } from '@/lib/api';
import { fmtDH, fmtUnits } from '@/lib/format';
import { ALERT_LABEL } from '@/lib/labels';
import { getT } from '@/lib/i18n/server';

export default async function CartographiePage({ searchParams }: { searchParams: Promise<{ zone?: string }> }) {
  const tr = await getT();
  const { zone: zoneCode } = await searchParams;
  const zones = await api.zones();
  const current = zones.find((z) => z.code === zoneCode) ?? zones[0];
  const detail = current ? await api.zone(current.id) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr('Cartographie 2D du Magasin Central MC01')}
        subtitle={tr('Plan spatial interactif des {0} zones de stockage : Hangar Rayonnages, Abris et Parc Extérieur.', zones.length)}
      />

      <PillGroup className="stagger grid grid-cols-2 gap-3 md:grid-cols-5" pillClassName="border-2 border-jesa bg-jesa/20">
        {zones.map((z) => {
          const active = z.id === current?.id;
          return (
            <Link
              key={z.id}
              href={`/cartographie?zone=${z.code}`}
              scroll={false}
              data-active={active}
              className={`rounded-xl p-3 text-left transition ${
                active
                  ? 'border-2 border-jesa bg-jesa/20 hover:bg-jesa/30'
                  : 'border border-gray-300 bg-white hover:border-jesa dark:border-gray-700 dark:bg-navy-light'
              }`}
            >
              <p className="text-xs font-bold text-gray-900 dark:text-white">
                {z.position}. {z.name}
              </p>
              <p className={`text-[10px] ${active ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>{z.planSubtitle}</p>
            </Link>
          );
        })}
      </PillGroup>

      {detail && (
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-navy-light">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3 text-xs dark:border-gray-700/80">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-jesa-light" />
              <span className="text-sm font-bold text-gray-900 dark:text-white">{detail.planTitle}</span>
            </div>
            <span className="text-gray-500 dark:text-gray-400">
              {fmtUnits(detail.units)} · {fmtDH(detail.valuation)} · {detail.occupancyPct}{tr('% occupé')}
            </span>
          </div>

          {detail.racks.length > 0 ? (
            <RackPlan racks={detail.racks} />
          ) : (
            <div className="min-h-[200px] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-navy-dark">
              {detail.articles.length === 0 ? (
                <p className="flex h-40 items-center justify-center text-xs text-gray-500 dark:text-gray-400">{tr('Aucun article stocké dans cette zone.')}</p>
              ) : (
                <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {detail.articles.map((a) => (
                    <div key={a.id} className="space-y-1.5 rounded-lg border border-gray-200 bg-white p-3 text-xs dark:border-gray-800 dark:bg-navy-light">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-gray-500 dark:text-gray-400">{a.code}</span>
                        <StatusBadge tone={ALERT_LABEL[a.alertStatus].tone} label={tr(ALERT_LABEL[a.alertStatus].label)} />
                      </div>
                      <p className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                        <Package className="h-3.5 w-3.5 text-jesa-light" /> {a.designation}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {a.rackLocation} · {fmtUnits(a.currentStock)} {tr('(Min :')} {fmtUnits(a.minStock)})
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

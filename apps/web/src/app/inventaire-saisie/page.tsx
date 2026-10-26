import { InventoryTabs } from '@/components/inventory/InventoryTabs';
import { PageHeader } from '@/components/ui/PageHeader';
import { api } from '@/lib/api';
import type { ShiftType } from '@/lib/types';
import { getT } from '@/lib/i18n/server';

export default async function SaisieInventairePage() {
  const tr = await getT();
  const [storekeepers, options, sheetOptions, shifts, counts, requests, pending, zones, articles] = await Promise.all([
    api.storekeepers(),
    api.inventoryOptions(),
    api.stockSheetOptions(),
    api.currentShifts(),
    api.inventoryCounts(),
    api.designationRequests(),
    api.pendingValidations(),
    api.zones(),
    api.articles(),
  ]);
  const currentPosts: Record<number, ShiftType> = {};
  for (const p of shifts.posts) for (const s of p.storekeepers) currentPosts[s.id] = p.type;
  const nextCode = `ART-${Math.max(1000, ...articles.map((a) => Number(a.code.replace(/\D/g, '')) || 0)) + 1}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr("Saisie d'Inventaire")}
        subtitle={tr("Le magasinier choisit chaque article dans le référentiel (par référence ou désignation) ; s'il ne le trouve pas, sa saisie part en demande de désignation, traitée par un responsable avant validation et régularisation du stock.")}
      />
      <InventoryTabs storekeepers={storekeepers} options={options} sheetOptions={sheetOptions} currentPosts={currentPosts} counts={counts} requests={requests} pending={pending} zones={zones} nextCode={nextCode} />
    </div>
  );
}

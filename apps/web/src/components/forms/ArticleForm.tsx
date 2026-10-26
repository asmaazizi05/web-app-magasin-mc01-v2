'use client';

import { Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { CATEGORY_LABEL } from '@/lib/labels';
import type { AbcClass, ArticleCategory, ArticleOrigin, Rack, Zone } from '@/lib/types';
import { Field, FormError, inputClass } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { useSubmit } from './useSubmit';
import { useT } from '@/lib/i18n';

const ORIGIN_DEFAULT: Record<ArticleOrigin, string> = { JESA: 'Projet JESA', OCP: 'Magasin OCP', CESSION: 'Cession OCP ', ANNEXE_D: 'Annexe D (PDR projet)' };

export function ArticleForm({ zones, racks, nextCode }: { zones: Zone[]; racks: Rack[]; nextCode: string }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [zoneId, setZoneId] = useState<number>(zones[0]?.id ?? 0);
  const [origin, setOrigin] = useState<ArticleOrigin>('JESA');
  const { pending, error, run } = useSubmit(() => setOpen(false));
  const zoneRacks = racks.filter((r) => r.zoneId === zoneId);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const rackId = Number(f.get('rackId'));
    void run(() =>
      api.createArticle({
        code: String(f.get('code')).trim(),
        designation: String(f.get('designation')).trim(),
        category: f.get('category') as ArticleCategory,
        origin,
        originLabel: String(f.get('originLabel')).trim(),
        zoneId,
        rackId: rackId > 0 ? rackId : undefined,
        rackLevel: rackId > 0 ? Number(f.get('rackLevel')) : undefined,
        currentStock: Number(f.get('currentStock')),
        minStock: Number(f.get('minStock')),
        unitCostCMP: Number(f.get('unitCostCMP')),
        abcClass: f.get('abcClass') as AbcClass,
      }),
    );
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-jesa px-3 py-1.5 text-xs font-bold text-white shadow transition hover:bg-jesa-dark">
        <Plus className="h-4 w-4" /> {tr('Ajouter un Article')}
      </button>
      <Modal open={open} title={tr('Ajouter un Article')} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label={tr('Code Article')}>
              <input name="code" required defaultValue={nextCode} pattern="ART-\d{4,}" className={inputClass} />
            </Field>
            <Field label={tr('Désignation')} className="col-span-2">
              <input name="designation" required className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('Catégorie')}>
              <select name="category" className={inputClass}>
                {(Object.keys(CATEGORY_LABEL) as ArticleCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {tr(CATEGORY_LABEL[c])}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tr('Classe ABC')}>
              <select name="abcClass" className={inputClass} defaultValue="C">
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('Origine')}>
              <select value={origin} onChange={(e) => setOrigin(e.target.value as ArticleOrigin)} className={inputClass}>
                <option value="JESA">{tr('JESA')}</option>
                <option value="OCP">OCP</option>
                <option value="CESSION">{tr('Cession Intra-Site OCP')}</option>
                <option value="ANNEXE_D">{tr('Annexe D (PDR projet)')}</option>
              </select>
            </Field>
            <Field label={tr('Libellé Origine / Source')}>
              <input key={origin} name="originLabel" required defaultValue={ORIGIN_DEFAULT[origin]} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label={tr('Zone')}>
              <select value={zoneId} onChange={(e) => setZoneId(Number(e.target.value))} className={inputClass}>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tr('Rayonnage')}>
              <select key={zoneId} name="rackId" className={inputClass} defaultValue="0">
                <option value="0">—</option>
                {zoneRacks.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tr('Niveau')}>
              <input name="rackLevel" type="number" min={1} max={10} defaultValue={1} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label={tr('Stock initial')}>
              <input name="currentStock" type="number" min={0} required defaultValue={0} className={inputClass} />
            </Field>
            <Field label={tr('Stock Min')}>
              <input name="minStock" type="number" min={0} required defaultValue={0} className={inputClass} />
            </Field>
            <Field label={tr('Prix Unitaire (CMP)')}>
              <input name="unitCostCMP" type="number" min={0} step="0.01" required className={inputClass} />
            </Field>
          </div>
          <FormError message={error} />
          <button disabled={pending} className="w-full rounded-xl bg-jesa px-3 py-2 text-xs font-bold text-white hover:bg-jesa-dark disabled:opacity-60">
            {pending ? tr('Enregistrement…') : tr("Créer l'article")}
          </button>
        </form>
      </Modal>
    </>
  );
}

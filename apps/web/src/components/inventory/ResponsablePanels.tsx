'use client';

import { Ban, CheckCheck, Link2, PackagePlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { api, apiUrl } from '@/lib/api';
import { fmtDay, fmtDH, fmtInt } from '@/lib/format';
import { CATEGORY_LABEL } from '@/lib/labels';
import type { AbcClass, ArticleCategory, DesignationRequest, InventoryOptions, PendingValidation, Zone } from '@/lib/types';
import { useSubmit } from '../forms/useSubmit';
import { Field, FormError, inputClass } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { useProfile } from '../layout/ProfileContext';
import { ArticlePicker, type PickedArticle } from './ArticlePicker';
import { useT } from '@/lib/i18n';

const scopeLabel = (options: InventoryOptions, v: string) => {
  const tr = useT();
  return tr(options.purchaseScopes.find((s) => s.value === v)?.label ?? v);
};
/** Vignette cliquable de la photo prise par le magasinier */
function PhotoThumb({ url, size = 'h-16 w-16' }: { url: string | null; size?: string }) {
  const tr = useT();
  if (!url) return null;
  return (
    <a href={apiUrl(url)} target="_blank" rel="noreferrer" className="flex-shrink-0" title={tr('Agrandir la photo')}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={apiUrl(url)} alt={tr("Photo de l'article")} className={`${size} rounded-lg border border-gray-200 object-cover dark:border-gray-700`} />
    </a>
  );
}

const smallBtn = 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-60';

function CreateArticleModal({ request, zones, nextCode, resolvedBy, onClose }: { request: DesignationRequest; zones: Zone[]; nextCode: string; resolvedBy: string; onClose: () => void }) {
  const tr = useT();
  const { pending, error, run } = useSubmit(onClose);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const n = (k: string) => (String(f.get(k) ?? '').trim() === '' ? undefined : Number(String(f.get(k)).replace(',', '.')));
    void run(() =>
      api.createArticleFromLine(request.id, {
        code: String(f.get('code')).trim(),
        designation: String(f.get('designation')).trim(),
        category: f.get('category') as ArticleCategory,
        zoneId: Number(f.get('zoneId')),
        rackLocation: String(f.get('rackLocation')).trim() || undefined,
        minStock: n('minStock'),
        unitCostCMP: n('unitCostCMP'),
        abcClass: f.get('abcClass') as AbcClass,
        resolvedBy,
      }),
    );
  };
  return (
    <Modal open title={tr('Créer la référence officielle')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="rounded-lg bg-amber-50 p-2 text-[11px] text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
          {tr('Saisie du magasinier :')} <strong>{[request.enteredReference, request.enteredDesignation].filter(Boolean).join(' — ')}</strong>
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Field label={tr('Code article')}>
            <input name="code" required pattern="ART-\d{4,}" defaultValue={request.enteredReference && /^ART-\d{4,}$/.test(request.enteredReference) ? request.enteredReference : nextCode} className={inputClass} />
          </Field>
          <Field label={tr('Désignation officielle')} className="col-span-2">
            <input name="designation" required defaultValue={request.enteredDesignation ?? ''} className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={tr('Catégorie')}>
            <select name="category" className={inputClass}>
              {(Object.keys(CATEGORY_LABEL) as ArticleCategory[]).map((c) => (
                <option key={c} value={c}>
                  {tr(CATEGORY_LABEL[c])}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr('Zone')}>
            <select name="zoneId" className={inputClass}>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr('Emplacement')}>
            <input name="rackLocation" defaultValue={request.count.location ?? ''} className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={tr('Prix unitaire CMP (DH)')}>
            <input name="unitCostCMP" type="number" min={0} step="0.01" className={inputClass} />
          </Field>
          <Field label={tr('Stock minimum')}>
            <input name="minStock" type="number" min={0} className={inputClass} />
          </Field>
          <Field label={tr('Classe ABC')}>
            <select name="abcClass" defaultValue="C" className={inputClass}>
              <option>A</option>
              <option>B</option>
              <option>C</option>
            </select>
          </Field>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400">
          {tr("L'article est créé avec un stock de 0 ; la ligne passe ensuite dans « Validation & régularisation » pour mettre le stock à la quantité comptée.")}
        </p>
        <FormError message={error} />
        <button disabled={pending} className="flex w-full justify-center rounded-xl bg-jesa px-3 py-2 text-xs font-bold text-white hover:bg-jesa-dark disabled:opacity-60">
          {pending ? tr('Création…') : tr("Créer l'article et rattacher la ligne")}
        </button>
      </form>
    </Modal>
  );
}

function RequestCard({ request, options, zones, nextCode }: { request: DesignationRequest; options: InventoryOptions; zones: Zone[]; nextCode: string }) {
  const tr = useT();
  const { profile } = useProfile();
  const [picked, setPicked] = useState<PickedArticle>(null);
  const [creating, setCreating] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const { pending, error, run } = useSubmit(() => undefined);
  const link = (articleId: number) => void run(() => api.linkCountLine(request.id, articleId, profile.name));

  return (
    <div className="space-y-3 rounded-2xl border border-amber-500/40 bg-white p-4 shadow-sm dark:bg-navy-light">
      <div className="flex flex-wrap items-start gap-3">
        <PhotoThumb url={request.photoUrl} size="h-20 w-20" />
        <div>
          <p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">{tr('Saisie du magasinier')}</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {request.enteredDesignation ?? <span className="italic text-gray-500">{tr('(pas de désignation)')}</span>}
            {request.enteredReference && <span className="ml-2 font-mono text-xs text-gray-500">{tr('réf.')} {request.enteredReference}</span>}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {fmtInt(request.quantity)} {request.unit} · {scopeLabel(options, request.purchaseScope)}{request.category ? ` · ${request.category}` : ''} · {request.count.storekeeperName} {tr('le')} {fmtDay(request.count.countedAt)}
            {request.count.location ? ` · ${request.count.location}` : ''} · {request.count.number}
          </p>
        </div>
      </div>

      {request.suggestions.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{tr("Articles qui ressemblent — « C'est cet article » :")}</p>
          <div className="flex flex-wrap gap-1.5">
            {request.suggestions.map((s) => (
              <button
                key={s.id}
                disabled={pending}
                onClick={() => link(s.id)}
                className="rounded-lg border border-jesa/50 bg-jesa/10 px-2 py-1 text-left text-[11px] hover:bg-jesa/20 disabled:opacity-60"
                title={tr('Correspondance {0} %', s.score)}
              >
                <span className="font-mono font-bold text-jesa-light">{s.code}</span> <span className="text-gray-900 dark:text-white">{s.designation}</span>
                <span className="ml-1 text-[9px] text-gray-500">{s.score} %</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{tr('Aucun article ressemblant trouvé automatiquement.')}</p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[240px] flex-1">
          <ArticlePicker value={picked} onChange={setPicked} allowFree={false} placeholder={tr('Chercher un autre article du référentiel…')} />
        </div>
        {picked?.kind === 'article' && (
          <button disabled={pending} onClick={() => link(picked.article.id)} className={`${smallBtn} bg-jesa text-white hover:bg-jesa-dark`}>
            <Link2 className="h-3.5 w-3.5" /> {tr('Rattacher à')} {picked.article.code}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2 dark:border-gray-800">
        <button onClick={() => setCreating(true)} className={`${smallBtn} bg-blue-600 text-white hover:bg-blue-500`}>
          <PackagePlus className="h-3.5 w-3.5" /> {tr('Nouvel article (créer la référence)')}
        </button>
        {rejecting ? (
          <span className="flex flex-wrap items-center gap-1.5">
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr('Motif (doublon, erreur…)')} className={`${inputClass} w-56`} />
            <button disabled={pending} onClick={() => void run(() => api.rejectCountLine(request.id, profile.name, reason))} className={`${smallBtn} bg-red-600 text-white`}>
              {tr('Confirmer le rejet')}
            </button>
          </span>
        ) : (
          <button onClick={() => setRejecting(true)} className={`${smallBtn} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30`}>
            <Ban className="h-3.5 w-3.5" /> {tr('Rejeter')}
          </button>
        )}
      </div>
      <FormError message={error} />
      {creating && <CreateArticleModal request={request} zones={zones} nextCode={nextCode} resolvedBy={profile.name} onClose={() => setCreating(false)} />}
    </div>
  );
}

export function RequestsPanel({ requests, options, zones, nextCode }: { requests: DesignationRequest[]; options: InventoryOptions; zones: Zone[]; nextCode: string }) {
  const tr = useT();
  if (requests.length === 0) {
    return <p className="rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">{tr('Aucune demande de désignation en attente.')}</p>;
  }
  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <RequestCard key={r.id} request={r} options={options} zones={zones} nextCode={nextCode} />
      ))}
    </div>
  );
}

function ValidationRow({ item, options }: { item: PendingValidation; options: InventoryOptions }) {
  const tr = useT();
  const { profile } = useProfile();
  const { pending, error, run } = useSubmit(() => undefined);
  const [done, setDone] = useState<string | null>(null);
  const tone = item.gap === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  return (
    <tr className="align-top">
      <td className="p-3">
        <span className="font-mono font-bold text-jesa-light">{item.article.code}</span>
        <span className="block font-semibold text-gray-900 dark:text-white">{item.article.designation}</span>
        <span className="block text-[10px] text-gray-500">{item.article.rackLocation}</span>
      </td>
      <td className="p-3">
        <ul className="space-y-0.5 text-[11px] text-gray-600 dark:text-gray-300">
          {item.lines.map((l) => (
            <li key={l.id} className="flex items-center gap-2">
              <PhotoThumb url={l.photoUrl} size="h-8 w-8" />
              {fmtInt(l.quantity)} {l.unit} · {l.storekeeperName} {tr('le')} {fmtDay(l.countedAt)}
              {l.location ? ` (${l.location})` : ''} · {scopeLabel(options, l.purchaseScope)}
            </li>
          ))}
        </ul>
      </td>
      <td className="p-3 text-right font-semibold">{fmtInt(item.article.currentStock)}</td>
      <td className="p-3 text-right font-bold text-gray-900 dark:text-white">{fmtInt(item.counted)}</td>
      <td className={`p-3 text-right font-extrabold ${tone}`}>
        {item.gap > 0 ? '+' : ''}
        {fmtInt(item.gap)}
        <span className="block text-[10px] font-semibold">{item.gap !== 0 ? fmtDH(item.gapValue) : tr('aucun écart')}</span>
      </td>
      <td className="p-3">
        {done ? (
          <span className="text-[11px] font-bold text-green-600">{done}</span>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <button
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  const r = await api.validateArticleCount(item.article.id, profile.name);
                  setDone(r.movementNumber ? tr('Régularisé ({0})', r.movementNumber) : tr('Validé sans écart'));
                })
              }
              className={`${smallBtn} bg-jesa text-white hover:bg-jesa-dark`}
            >
              <CheckCheck className="h-3.5 w-3.5" /> {tr('Valider & régulariser')}
            </button>
            <button
              disabled={pending}
              onClick={() => void run(() => api.rejectArticleCount(item.article.id, profile.name, 'À recompter'))}
              className={`${smallBtn} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30`}
            >
              <Ban className="h-3.5 w-3.5" /> {tr('Rejeter (à recompter)')}
            </button>
            {error && <span className="text-[10px] text-red-500">{tr(error)}</span>}
          </div>
        )}
      </td>
    </tr>
  );
}

export function ValidationPanel({ pending, options }: { pending: PendingValidation[]; options: InventoryOptions }) {
  const tr = useT();
  if (pending.length === 0) {
    return <p className="rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">{tr('Aucun comptage en attente de validation.')}</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-600 dark:text-gray-400">
        {tr("Un article compté à plusieurs endroits est additionné. « Valider & régulariser » met le stock à la quantité comptée par un mouvement d'inventaire tracé (INV-…) dans l'historique.")}
      </p>
      <div className="custom-scrollbar overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-navy-light">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-gray-100 font-semibold uppercase text-gray-600 dark:bg-navy-dark dark:text-gray-400">
            <tr>
              <th className="p-3">{tr('Article')}</th>
              <th className="p-3">{tr('Comptages')}</th>
              <th className="p-3 text-right">{tr('Stock théorique')}</th>
              <th className="p-3 text-right">{tr('Compté')}</th>
              <th className="p-3 text-right">{tr('Écart')}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {pending.map((p) => (
              <ValidationRow key={p.article.id} item={p} options={options} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

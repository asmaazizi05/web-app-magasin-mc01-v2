'use client';

import { CheckCircle2, ImagePlus, Plus, Send, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { siteToday } from '@/lib/format';
import type { InventoryCount, InventoryOptions, PurchaseScope, SheetOptions, ShiftType, Storekeeper } from '@/lib/types';
import { Field, FormError, inputClass } from '../ui/Field';
import { ArticlePicker, type PickedArticle } from './ArticlePicker';
import { useT } from '@/lib/i18n';

interface LineState {
  id: number;
  picked: PickedArticle;
  quantity: string;
  unit: string;
  scope: PurchaseScope | '';
  category: string;
  photo: File | null;
}

const newLine = (id: number, unit: string): LineState => ({ id, picked: null, quantity: '', unit, scope: '', category: '', photo: null });

/** Photo obligatoire de la ligne : bouton « Ajouter » (appareil photo sur téléphone) + aperçu */
function LinePhoto({ photo, onChange, invalid }: { photo: File | null; onChange: (f: File | null) => void; invalid: boolean }) {
  const tr = useT();
  const input = useRef<HTMLInputElement>(null);
  const url = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  return (
    <div>
      {url ? (
        <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={tr("Photo de l'article")} className="h-full w-full object-cover" />
          <button type="button" onClick={() => onChange(null)} className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white" aria-label={tr('Retirer la photo')}>
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={`flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-[10px] font-semibold transition hover:border-jesa hover:text-jesa-light ${
            invalid ? 'border-red-500 text-red-500' : 'border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400'
          }`}
        >
          <ImagePlus className="h-5 w-5" />
          {tr('Photo *')}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && f.type.startsWith('image/')) onChange(f);
          e.target.value = '';
        }}
        className="hidden"
      />
    </div>
  );
}

interface CountFormProps {
  storekeepers: Storekeeper[];
  options: InventoryOptions;
  /** Listes de la fiche « Mouvements de stock (E/S) » : catégories et postes */
  sheetOptions: SheetOptions;
  /** Poste de chaque magasinier sur la semaine en cours (pré-remplissage) */
  currentPosts: Record<number, ShiftType>;
}

export function CountForm({ storekeepers, options, sheetOptions, currentPosts }: CountFormProps) {
  const tr = useT();
  const router = useRouter();
  const [storekeeperId, setStorekeeperId] = useState<number>(0);
  const [post, setPost] = useState<ShiftType | ''>('');
  const [date, setDate] = useState(siteToday());
  const [location, setLocation] = useState('');
  const [comment, setComment] = useState('');
  const [lines, setLines] = useState<LineState[]>([newLine(1, options.units[0] ?? 'U')]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<InventoryCount | null>(null);

  const update = (id: number, patch: Partial<LineState>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const add = () => setLines((ls) => [...ls, newLine(Math.max(0, ...ls.map((l) => l.id)) + 1, ls[ls.length - 1]?.unit ?? options.units[0] ?? 'U')]);

  const chooseStorekeeper = (id: number) => {
    setStorekeeperId(id);
    // Poste pré-sélectionné d'après le planning de la semaine (modifiable)
    const p = currentPosts[id];
    if (p && sheetOptions.posts.some((x) => x.value === p)) setPost(p);
  };

  // Article trouvé dans le référentiel : la catégorie est remplie automatiquement
  const pick = (id: number, picked: PickedArticle) =>
    update(id, picked?.kind === 'article' ? { picked, category: picked.article.category } : { picked });

  const validate = (): boolean => {
    const e: Record<number, string> = {};
    for (const l of lines) {
      const q = Number(l.quantity);
      if (!l.picked) e[l.id] = tr('Choisissez un article ou saisissez une désignation.');
      else if (l.picked.kind === 'free' && !l.picked.designation.trim() && !l.picked.reference.trim()) e[l.id] = tr('Saisissez une référence ou une désignation.');
      else if (!l.category) e[l.id] = tr('Choisissez la catégorie.');
      else if (l.quantity === '' || !Number.isInteger(q) || q < 0) e[l.id] = tr('Quantité comptée invalide (nombre entier ≥ 0).');
      else if (!l.scope) e[l.id] = tr('Choisissez le volet achat.');
      else if (!l.photo) e[l.id] = tr("La photo de l'article est obligatoire.");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (!storekeeperId) return setError(tr('Choisissez le magasinier qui a compté.'));
    if (!post) return setError(tr('Choisissez le poste de travail.'));
    if (!validate()) return setError(tr('Certaines lignes sont incomplètes.'));
    setPending(true);
    try {
      const count = await api.createInventoryCount(
        {
          storekeeperId,
          countedAt: date,
          post,
          location: location.trim() || undefined,
          comment: comment.trim() || undefined,
          lines: lines.map((l) =>
            l.picked?.kind === 'article'
              ? { articleId: l.picked.article.id, quantity: Number(l.quantity), unit: l.unit, purchaseScope: l.scope as PurchaseScope, category: l.category }
              : {
                  enteredReference: l.picked?.kind === 'free' ? l.picked.reference.trim() || undefined : undefined,
                  enteredDesignation: l.picked?.kind === 'free' ? l.picked.designation.trim() || undefined : undefined,
                  quantity: Number(l.quantity),
                  unit: l.unit,
                  purchaseScope: l.scope as PurchaseScope,
                  category: l.category,
                },
          ),
        },
        lines.map((l) => l.photo as File),
      );
      setResult(count);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('Erreur inattendue.'));
    } finally {
      setPending(false);
    }
  };

  if (result) {
    const free = result.lines.filter((l) => l.status === 'DEMANDE_DESIGNATION').length;
    return (
      <div className="space-y-3 rounded-2xl border border-jesa/50 bg-white p-6 text-center shadow-sm dark:bg-navy-light">
        <CheckCircle2 className="mx-auto h-10 w-10 text-jesa-light" />
        <p className="text-sm font-bold text-gray-900 dark:text-white">{tr('Comptage')} {result.number} {tr('enregistré — merci !')}</p>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          {result.lines.length - free} {tr('ligne(s) rattachée(s) au référentiel, en attente de validation par un responsable.')}
          {free > 0 && tr(' {0} ligne(s) en saisie libre envoyée(s) en « demande de désignation ».', free)}
        </p>
        <button
          onClick={() => {
            setResult(null);
            setLines([newLine(1, options.units[0] ?? 'U')]);
            setComment('');
          }}
          className="rounded-xl bg-jesa px-4 py-2 text-xs font-bold text-white hover:bg-jesa-dark"
        >
          {tr('Nouveau comptage')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-navy-light sm:grid-cols-4">
        <Field label={tr('Magasinier (compteur)')}>
          <select value={storekeeperId} onChange={(e) => chooseStorekeeper(Number(e.target.value))} className={inputClass}>
            <option value={0}>{tr('— Choisir —')}</option>
            {storekeepers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tr('Poste de travail')}>
          <select value={post} onChange={(e) => setPost(e.target.value as ShiftType)} className={inputClass}>
            <option value="">{tr('— Choisir —')}</option>
            {sheetOptions.posts.map((p) => (
              <option key={p.value} value={p.value}>
                {tr(p.label)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tr('Date du comptage')}>
          <input type="date" value={date} max={siteToday()} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label={tr('Emplacement / zone comptée')}>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={tr('ex. Rayonnage R1, Grand Abri…')} className={inputClass} />
        </Field>
      </div>

      <div className="space-y-2">
        {lines.map((l, i) => (
          <div
            key={l.id}
            className={`rounded-2xl border bg-white p-3 shadow-sm dark:bg-navy-light ${errors[l.id] ? 'border-red-500/70' : 'border-gray-200 dark:border-gray-800'}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">{tr('Ligne')} {i + 1}</span>
              {lines.length > 1 && (
                <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))} className="text-red-500 hover:text-red-600" aria-label={tr('Supprimer la ligne')}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <LinePhoto photo={l.photo} onChange={(photo) => update(l.id, { photo })} invalid={Boolean(errors[l.id]) && !l.photo} />
              <div className="min-w-0 flex-1 space-y-2">
                <ArticlePicker value={l.picked} onChange={(picked) => pick(l.id, picked)} />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Field label={tr('Catégorie')} className="col-span-2">
                    <select value={l.category} onChange={(e) => update(l.id, { category: e.target.value })} className={inputClass}>
                      <option value="">{tr('— Choisir —')}</option>
                      {sheetOptions.categories.map((c) => (
                        <option key={c} value={c}>
                          {tr(c)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={tr('Quantité comptée')}>
                    <input type="number" min={0} step={1} inputMode="numeric" value={l.quantity} onChange={(e) => update(l.id, { quantity: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label={tr('Unité')}>
                    <select value={l.unit} onChange={(e) => update(l.id, { unit: e.target.value })} className={inputClass}>
                      {options.units.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={tr('Volet achat')} className="col-span-2 sm:col-span-4">
                    <div className="flex flex-wrap gap-1.5">
                      {options.purchaseScopes.map((s) => (
                        <label
                          key={s.value}
                          className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 ${
                            l.scope === s.value ? 'border-jesa bg-jesa/10 font-semibold text-gray-900 dark:text-white' : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <input type="radio" checked={l.scope === s.value} onChange={() => update(l.id, { scope: s.value })} className="accent-[#003088]" />
                          {tr(s.label)}
                        </label>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>
            </div>
            {errors[l.id] && <p className="mt-2 text-[11px] font-semibold text-red-500">{errors[l.id]}</p>}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 py-2 text-xs font-bold text-gray-600 hover:border-jesa hover:text-jesa-light dark:border-gray-700 dark:text-gray-300"
      >
        <Plus className="h-4 w-4" /> {tr('Ajouter une ligne')}
      </button>

      <Field label={tr('Commentaire (optionnel)')}>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className={inputClass} />
      </Field>
      <FormError message={error} />
      <button disabled={pending} className="flex items-center gap-1.5 rounded-xl bg-jesa px-5 py-2 text-xs font-bold text-white shadow hover:bg-jesa-dark disabled:opacity-60">
        <Send className="h-3.5 w-3.5" /> {pending ? tr('Envoi…') : tr('Envoyer le comptage ({0} ligne{1})', lines.length, lines.length > 1 ? 's' : '')}
      </button>
    </form>
  );
}

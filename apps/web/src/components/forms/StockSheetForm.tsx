'use client';

import { CheckCircle2, ImagePlus, Send, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { fmtInt } from '@/lib/format';
import type { Article, MovementType, SheetOptions, ShiftType, StockSheet, Storekeeper } from '@/lib/types';
import { inputClass } from '../ui/Field';
import { useT } from '@/lib/i18n';

interface StockSheetFormProps {
  options: SheetOptions;
  articles: Article[];
  storekeepers: Storekeeper[];
  /** Poste de chaque magasinier sur la semaine de rotation courante (pré-remplissage) */
  currentPosts: Record<number, ShiftType>;
}

type FieldKey =
  | 'type'
  | 'date'
  | 'designation'
  | 'category'
  | 'quantity'
  | 'unit'
  | 'requesterType'
  | 'requesterName'
  | 'storekeeperId'
  | 'post'
  | 'photos'
  | 'supplier'
  | 'destinationZone'
  | 'destinationArea';

const REQUIRED = 'Cette question est obligatoire.';
const articleLabel = (a: Article) => `${a.code} — ${a.designation}`;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function Question({ n, title, hint, error, children }: { n: number; title: string; hint?: string; error?: string; children: ReactNode }) {
  const tr = useT();
  return (
    <div
      className={`space-y-3 rounded-2xl border bg-white p-5 shadow-sm transition-colors dark:bg-navy-light ${
        error ? 'border-red-500/70' : 'border-gray-200 dark:border-gray-800'
      }`}
    >
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {n}. {title} <span className="text-red-500">*</span>
        </p>
        {hint && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      </div>
      {children}
      {error && <p className="text-xs font-semibold text-red-500">{tr(error)}</p>}
    </div>
  );
}

function RadioList<T extends string | number>({
  name,
  value,
  onChange,
  items,
  columns = 1,
}: {
  name: string;
  value: T | null;
  onChange: (v: T) => void;
  items: { value: T; label: string }[];
  columns?: 1 | 2;
}) {
  const tr = useT();
  return (
    <div className={`grid gap-2 ${columns === 2 ? 'sm:grid-cols-2' : ''}`}>
      {items.map((item) => {
        const checked = value === item.value;
        return (
          <label
            key={String(item.value)}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-xs transition ${
              checked
                ? 'border-jesa bg-jesa/10 font-semibold text-gray-900 dark:text-white'
                : 'border-gray-200 text-gray-700 hover:border-jesa/60 dark:border-gray-700 dark:text-gray-300'
            }`}
          >
            <input type="radio" name={name} checked={checked} onChange={() => onChange(item.value)} className="h-4 w-4 accent-[#003088]" />
            {tr(item.label)}
          </label>
        );
      })}
    </div>
  );
}

export function StockSheetForm({ options, articles, storekeepers, currentPosts }: StockSheetFormProps) {
  const tr = useT();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<MovementType | null>(null);
  const [date, setDate] = useState(today);
  const [designation, setDesignation] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<string | null>(null);
  const [requesterType, setRequesterType] = useState<string | null>(null);
  const [requesterName, setRequesterName] = useState('');
  const [storekeeperId, setStorekeeperId] = useState<number | null>(null);
  const [post, setPost] = useState<ShiftType | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  // Questions conditionnelles : Fournisseur (Entrée) · Zone + secteur de destination (Sorties)
  const [supplier, setSupplier] = useState('');
  const [destinationZone, setDestinationZone] = useState<string | null>(null);
  const [destinationArea, setDestinationArea] = useState('');

  // Après une première tentative d'envoi, la validation est recalculée à chaque saisie :
  // chaque message disparaît dès que la question est correctement remplie.
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<StockSheet | null>(null);

  const article = useMemo(() => {
    const q = designation.trim().toLowerCase();
    if (!q) return null;
    return (
      articles.find((a) => articleLabel(a).toLowerCase() === q) ??
      articles.find((a) => a.code.toLowerCase() === q || a.designation.toLowerCase() === q) ??
      null
    );
  }, [designation, articles]);

  const previews = useMemo(() => photos.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [photos]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const chooseStorekeeper = (id: number) => {
    setStorekeeperId(id);
    // Pré-sélectionne le poste du magasinier sur la semaine courante (modifiable)
    if (!post && currentPosts[id]) setPost(currentPosts[id]);
  };

  const addPhotos = (list: FileList | null) => {
    if (!list) return;
    const images = Array.from(list).filter((f) => f.type.startsWith('image/'));
    setPhotos((prev) => [...prev, ...images].slice(0, options.maxPhotos));
    if (fileInput.current) fileInput.current.value = '';
  };

  const validate = (): Partial<Record<FieldKey, string>> => {
    const e: Partial<Record<FieldKey, string>> = {};
    const qty = Number(quantity);
    if (!type) e.type = REQUIRED;
    if (!date) e.date = REQUIRED;
    if (!designation.trim()) e.designation = REQUIRED;
    else if (!article) e.designation = tr('Choisissez un article du catalogue dans la liste proposée (code ou désignation).');
    if (!category) e.category = REQUIRED;
    if (!quantity) e.quantity = REQUIRED;
    else if (!Number.isInteger(qty) || qty <= 0) e.quantity = tr('Saisissez un nombre entier supérieur à 0.');
    else if (type === 'OUT' && article && qty > article.currentStock)
      e.quantity = tr('Stock insuffisant : {0} disponible(s).', fmtInt(article.currentStock));
    if (!unit) e.unit = REQUIRED;
    if (!requesterType) e.requesterType = REQUIRED;
    if (!requesterName.trim()) e.requesterName = REQUIRED;
    if (!storekeeperId) e.storekeeperId = REQUIRED;
    if (!post) e.post = REQUIRED;
    if (photos.length === 0) e.photos = REQUIRED;
    if (type === 'IN' && !supplier.trim()) e.supplier = REQUIRED;
    if (type === 'OUT' && !destinationZone) e.destinationZone = REQUIRED;
    if (type === 'OUT' && destinationZone && !destinationArea.trim()) e.destinationArea = REQUIRED;
    return e;
  };
  const errors = attempted ? validate() : {};

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setServerError(null);
    setAttempted(true);
    const e = validate();
    if (Object.keys(e).length > 0) {
      document.getElementById(`q-${Object.keys(e)[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // La date choisie est complétée par l'heure courante de saisie
    const now = new Date();
    const at = new Date(`${date}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`);
    setPending(true);
    try {
      const sheet = await api.createStockSheet({
        type: type as MovementType,
        date: at.toISOString(),
        designation: designation.trim(),
        articleId: (article as Article).id,
        category: category as string,
        quantity: Number(quantity),
        unit: unit as string,
        requesterType: requesterType as string,
        requesterName: requesterName.trim(),
        storekeeperId: storekeeperId as number,
        post: post as ShiftType,
        photos,
        ...(type === 'IN'
          ? { supplier: supplier.trim() }
          : { destinationZone: destinationZone as string, destinationArea: destinationArea.trim() }),
      });
      setResult(sheet);
      router.refresh();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : tr('Erreur inattendue.'));
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setType(null);
    setDate(today());
    setDesignation('');
    setCategory(null);
    setQuantity('');
    setUnit(null);
    setRequesterType(null);
    setRequesterName('');
    setStorekeeperId(null);
    setPost(null);
    setPhotos([]);
    setSupplier('');
    setDestinationZone(null);
    setDestinationArea('');
    setAttempted(false);
    setServerError(null);
    setResult(null);
  };

  const header = (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-navy-light">
      <div className="h-2 bg-jesa" />
      <div className="space-y-1 p-5">
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{tr('Mouvements de stock (E/S)')}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{tr('Formulaire de saisie des mouvements de stock Entrées / Sorties')}</p>
        {!result && <p className="pt-2 text-xs font-semibold text-red-500">{tr('* Obligatoire')}</p>}
      </div>
    </div>
  );

  if (result) {
    return (
      <div className="space-y-4">
        {header}
        <div className="space-y-4 rounded-2xl border border-jesa/50 bg-white p-6 text-center shadow-sm dark:bg-navy-light">
          <CheckCircle2 className="mx-auto h-10 w-10 text-jesa-light" />
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{tr('Merci ! Votre saisie a été enregistrée.')}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {tr(options.types.find((t) => t.value === result.type)?.label ?? '')} {tr('de')} {fmtInt(result.quantity)} {result.unit} – {result.article.code} {result.article.designation}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <span className="rounded-lg bg-jesa/20 px-3 py-1 font-mono font-bold text-jesa-light">{result.documentNumber}</span>
            {result.stockAfter !== null && (
              <span className="rounded-lg bg-gray-100 px-3 py-1 font-semibold text-gray-800 dark:bg-navy-dark dark:text-gray-200">
                {tr('Stock après mouvement :')} {fmtInt(result.stockAfter)}
              </span>
            )}
          </div>
          <button onClick={reset} className="rounded-xl bg-jesa px-4 py-2 text-xs font-bold text-white shadow hover:bg-jesa-dark">
            {tr('Envoyer une autre réponse')}
          </button>
        </div>
      </div>
    );
  }

  let n = 0;
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {header}

      <div id="q-type">
        <Question n={++n} title={tr('Type de mouvements')} error={errors.type}>
          <RadioList name="type" value={type} onChange={setType} items={options.types} />
        </Question>
      </div>

      <div id="q-date">
        <Question n={++n} title={tr('Date')} error={errors.date}>
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className={`${inputClass} max-w-xs`} />
        </Question>
      </div>

      <div id="q-designation">
        <Question n={++n} title={tr('Désignation / Référence')} hint={tr("Saisissez le code ou la désignation puis choisissez l'article dans la liste.")} error={errors.designation}>
          <input
            list="sheet-articles"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder={tr('ex. ART-1002 ou Vanne à papillon DN100')}
            className={inputClass}
          />
          <datalist id="sheet-articles">
            {articles.map((a) => (
              <option key={a.id} value={articleLabel(a)} />
            ))}
          </datalist>
          {article && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              <span className="font-mono text-jesa-light">{article.code}</span> · {article.rackLocation} {tr('· Stock actuel :')}{' '}
              <strong className="text-gray-900 dark:text-white">{fmtInt(article.currentStock)}</strong> {tr('(Min :')} {fmtInt(article.minStock)})
            </p>
          )}
        </Question>
      </div>

      <div id="q-category">
        <Question n={++n} title={tr('Catégorie')} error={errors.category}>
          <RadioList name="category" value={category} onChange={setCategory} items={options.categories.map((c) => ({ value: c, label: c }))} columns={2} />
        </Question>
      </div>

      <div id="q-quantity">
        <Question n={++n} title={tr('Quantité')} error={errors.quantity}>
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={tr('Entrez un nombre')}
            className={`${inputClass} max-w-xs`}
          />
        </Question>
      </div>

      <div id="q-unit">
        <Question n={++n} title={tr('Unité')} error={errors.unit}>
          <RadioList name="unit" value={unit} onChange={setUnit} items={options.units.map((u) => ({ value: u, label: u }))} columns={2} />
        </Question>
      </div>

      <div id="q-requesterType">
        <Question n={++n} title={tr('Demandeur')} error={errors.requesterType}>
          <RadioList name="requesterType" value={requesterType} onChange={setRequesterType} items={options.requesterTypes.map((r) => ({ value: r, label: r }))} />
        </Question>
      </div>

      <div id="q-requesterName">
        <Question n={++n} title={tr('Nom du demandeur')} error={errors.requesterName}>
          <input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} placeholder={tr('Entrez votre réponse')} maxLength={120} className={inputClass} />
        </Question>
      </div>

      <div id="q-storekeeperId">
        <Question n={++n} title={tr('Nom magasinier')} hint={tr('Merci de saisir votre nom complet')} error={errors.storekeeperId}>
          <RadioList
            name="storekeeperId"
            value={storekeeperId}
            onChange={chooseStorekeeper}
            items={storekeepers.map((s) => ({ value: s.id, label: `${s.name} (${s.matricule})` }))}
          />
        </Question>
      </div>

      <div id="q-post">
        <Question n={++n} title={tr('Postes de travail')} error={errors.post}>
          <RadioList name="post" value={post} onChange={setPost} items={options.posts} />
        </Question>
      </div>

      <div id="q-photos">
        <Question n={++n} title={tr("Photos d'article")} hint={tr('1 à {0} images (JPEG, PNG, WEBP, HEIC) · 5 Mo max par photo', options.maxPhotos)} error={errors.photos}>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addPhotos(e.dataTransfer.files);
            }}
            className="flex flex-wrap gap-3"
          >
            {previews.map((p, i) => (
              <div key={p.url} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.file.name} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white"
                  aria-label={tr('Retirer {0}', p.file.name)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < options.maxPhotos && (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-[10px] font-semibold text-gray-500 transition hover:border-jesa hover:text-jesa-light dark:border-gray-700 dark:text-gray-400"
              >
                <ImagePlus className="h-5 w-5" />
                {tr('Ajouter')}
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
            multiple
            onChange={(e) => addPhotos(e.target.files)}
            className="hidden"
          />
        </Question>
      </div>

      {type === 'IN' && (
        <div id="q-supplier">
          <Question n={++n} title={tr('Fournisseur')} error={errors.supplier}>
            <input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder={tr('ex. PETROLAF (FUCHS)')}
              maxLength={160}
              className={inputClass}
            />
          </Question>
        </div>
      )}

      {type === 'OUT' && (
        <div id="q-destinationZone">
          <Question n={++n} title={tr('Zone')} error={errors.destinationZone}>
            <RadioList
              name="destinationZone"
              value={destinationZone}
              onChange={(z) => {
                setDestinationZone(z);
                setDestinationArea('');
              }}
              items={Object.keys(options.destinationZones).map((z) => ({ value: z, label: z }))}
            />
          </Question>
        </div>
      )}

      {type === 'OUT' && destinationZone && (
        <div id="q-destinationArea">
          <Question n={++n} title={tr('Zone {0}', destinationZone)} hint={tr('Choisissez un secteur dans la liste ou saisissez-le.')} error={errors.destinationArea}>
            <input
              list="sheet-areas"
              value={destinationArea}
              onChange={(e) => setDestinationArea(e.target.value)}
              placeholder={tr('ex. 320 - Conditionnement et flottation')}
              maxLength={160}
              className={inputClass}
            />
            <datalist id="sheet-areas">
              {(options.destinationZones[destinationZone] ?? []).map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </Question>
        </div>
      )}

      {serverError && (
        <p className="rounded-xl border border-red-500/50 bg-red-100 p-3 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-200">{serverError}</p>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-1.5 rounded-xl bg-jesa px-5 py-2 text-xs font-bold text-white shadow transition hover:bg-jesa-dark disabled:opacity-60"
        >
          <Send className="h-3.5 w-3.5" /> {pending ? tr('Envoi…') : tr('Envoyer')}
        </button>
        <button type="button" onClick={reset} className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          {tr('Effacer le formulaire')}
        </button>
      </div>
    </form>
  );
}

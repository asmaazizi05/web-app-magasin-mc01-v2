'use client';

import { PencilLine, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { ReferentialItem } from '@/lib/types';
import { inputClass } from '../ui/Field';
import { useT } from '@/lib/i18n';

export type PickedArticle =
  | { kind: 'article'; article: Pick<ReferentialItem, 'id' | 'code' | 'designation' | 'category'> }
  | { kind: 'free'; reference: string; designation: string }
  | null;

interface ArticlePickerProps {
  value: PickedArticle;
  onChange: (v: PickedArticle) => void;
  /** Autoriser la saisie libre si l'article n'est pas trouvé (formulaire magasinier) */
  allowFree?: boolean;
  placeholder?: string;
}

/** Recherche dans le référentiel par référence ou désignation (tolère accents, majuscules, ordre des mots) */
export function ArticlePicker({ value, onChange, allowFree = true, placeholder }: ArticlePickerProps) {
  const tr = useT();
  const hint = placeholder ?? tr('Rechercher par référence ou désignation…');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ReferentialItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await api.searchReferential(q));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (value?.kind === 'article') {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-jesa/60 bg-jesa/10 px-3 py-1.5 text-xs">
        <span>
          <span className="font-mono font-bold text-jesa-light">{value.article.code}</span>{' '}
          <span className="font-semibold text-gray-900 dark:text-white">{value.article.designation}</span>
        </span>
        <button type="button" onClick={() => onChange(null)} className="rounded p-0.5 text-gray-500 hover:text-gray-900 dark:hover:text-white" aria-label={tr("Changer d'article")}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (value?.kind === 'free') {
    return (
      <div className="space-y-1.5 rounded-xl border border-amber-500/60 bg-amber-50 p-2 dark:bg-amber-900/20">
        <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 dark:text-amber-300">
          <span className="flex items-center gap-1">
            <PencilLine className="h-3 w-3" /> {tr('Saisie libre — sera envoyée en « demande de désignation »')}
          </span>
          <button type="button" onClick={() => onChange(null)} className="underline">
            {tr('Revenir à la recherche')}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <input
            value={value.reference}
            onChange={(e) => onChange({ ...value, reference: e.target.value })}
            placeholder={tr('Référence (si connue)')}
            className={inputClass}
          />
          <input
            value={value.designation}
            onChange={(e) => onChange({ ...value, designation: e.target.value })}
            placeholder={tr("Désignation telle que lue sur l'article")}
            className={`${inputClass} col-span-2`}
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={box} className="relative">
      <Search className="pointer-events-none absolute left-3 top-2 h-3.5 w-3.5 text-gray-400" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={hint}
        className={`${inputClass} pl-8`}
      />
      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white text-xs shadow-xl custom-scrollbar dark:border-gray-700 dark:bg-navy-light">
          {loading && results.length === 0 && <p className="p-3 text-gray-500">{tr('Recherche…')}</p>}
          {!loading && results.length === 0 && <p className="p-3 text-gray-500">{tr('Aucun article ne correspond.')}</p>}
          {results.map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => {
                onChange({ kind: 'article', article: { id: r.id, code: r.code, designation: r.designation, category: r.category } });
                setOpen(false);
                setQ('');
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-navy-dark"
            >
              <span className="font-mono font-bold text-jesa-light">{r.code}</span> <span className="text-gray-900 dark:text-white">{r.designation}</span>
            </button>
          ))}
          {allowFree && (
            <button
              type="button"
              onClick={() => {
                onChange({ kind: 'free', reference: /^[A-Za-z]{0,4}[-\s]?\d/.test(q.trim()) ? q.trim() : '', designation: /^[A-Za-z]{0,4}[-\s]?\d/.test(q.trim()) ? '' : q.trim() });
                setOpen(false);
              }}
              className="flex w-full items-center gap-1.5 border-t border-gray-200 px-3 py-2 text-left font-semibold text-amber-700 hover:bg-amber-50 dark:border-gray-700 dark:text-amber-300 dark:hover:bg-amber-900/20"
            >
              <PencilLine className="h-3.5 w-3.5" /> {tr('Article introuvable : saisir ma propre référence / désignation')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

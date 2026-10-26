'use client';

import { Building2, FileText, Hash, type LucideIcon, MapPin, Package, Search, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { normalize, type SearchOption } from '@/lib/search';

const ICONS: Record<SearchOption['icon'], LucideIcon> = { hash: Hash, package: Package, pin: MapPin, doc: FileText, user: User, building: Building2 };
const MAX = 8;

interface LiveSearchProps {
  /** Recherche appliquée (paramètre `q` de la page) */
  initial: string;
  /** Page à filtrer, ex. « /stock » */
  basePath: string;
  /** Autres filtres de la page à conserver (ex. origine) */
  params?: Record<string, string | undefined>;
  placeholder: string;
  /** Propositions possibles, dans l'ordre de priorité ; filtrées pendant la saisie */
  options: SearchOption[];
}

/** Recherche d'une liste : une seule zone ; pendant la saisie, des propositions s'affichent et le tableau se filtre en direct */
export function LiveSearch({ initial, basePath, params, placeholder, options }: LiveSearchProps) {
  const tr = useT();
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLFormElement>(null);
  const extra = JSON.stringify(params ?? {});

  // La page renvoie la recherche appliquée : on ne réécrit pas la saisie en cours si elle correspond déjà
  useEffect(() => setQ((cur) => (cur.trim() === initial ? cur : initial)), [initial]);

  const urlFor = (text: string) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(JSON.parse(extra) as Record<string, string | undefined>)) if (v) sp.set(k, v);
    if (text.trim()) sp.set('q', text.trim());
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  // Le tableau en dessous se filtre en direct, peu après la dernière frappe
  useEffect(() => {
    if (q.trim() === initial) return;
    const timer = setTimeout(() => router.replace(urlFor(q), { scroll: false }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, initial, extra, basePath]);

  const list = useMemo(() => {
    const t = normalize(q.trim());
    if (t.length < 2) return [];
    const seen = new Set<string>();
    const out: SearchOption[] = [];
    for (const o of options) {
      if (!normalize(o.title).includes(t) || seen.has(o.query)) continue;
      seen.add(o.query);
      out.push(o);
      if (out.length === MAX) break;
    }
    return out;
  }, [q, options]);
  useEffect(() => setActive(-1), [list]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const go = (text: string) => {
    setOpen(false);
    setQ(text);
    router.push(urlFor(text));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    go(active >= 0 && list[active] ? list[active].query : q);
  };

  return (
    <form ref={box} onSubmit={submit} className="relative flex flex-wrap items-center gap-2">
      <Search className="h-4 w-4 flex-shrink-0 text-jesa-light" />
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          else if (e.key === 'ArrowDown' && list.length) {
            e.preventDefault();
            setActive((i) => (i + 1) % list.length);
          } else if (e.key === 'ArrowUp' && list.length) {
            e.preventDefault();
            setActive((i) => (i <= 0 ? list.length - 1 : i - 1));
          }
        }}
        role="combobox"
        aria-expanded={open && list.length > 0}
        aria-controls="live-search-suggestions"
        aria-label={tr('Rechercher')}
        autoComplete="off"
        placeholder={placeholder}
        className="min-w-[12rem] flex-1 rounded-xl border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs text-gray-900 outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-jesa dark:border-gray-700 dark:bg-navy-dark dark:text-white dark:placeholder:text-gray-400"
      />
      <button className="flex items-center gap-1.5 rounded-xl bg-jesa px-3 py-1.5 text-xs font-bold text-white transition hover:bg-jesa-dark">
        <Search className="h-3.5 w-3.5" /> {tr('Rechercher')}
      </button>

      {open && list.length > 0 && (
        <ul
          id="live-search-suggestions"
          role="listbox"
          className="custom-scrollbar absolute left-6 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-gray-200 bg-white py-1 shadow-2xl dark:border-gray-700 dark:bg-navy-light"
        >
          {list.map((s, i) => {
            const Icon = ICONS[s.icon];
            return (
              <li key={`${s.kind}-${s.query}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onClick={() => go(s.query)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition ${i === active ? 'bg-jesa-light/15' : ''}`}
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-jesa-light/15 text-jesa-light">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-gray-900 dark:text-white">{s.title}</span>
                    <span className="block truncate text-gray-500 dark:text-gray-400">{s.detail}</span>
                  </span>
                  <span className="flex-shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-600 dark:bg-navy-dark dark:text-gray-300">{s.kind}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </form>
  );
}

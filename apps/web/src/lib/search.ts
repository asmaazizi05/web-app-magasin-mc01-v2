/** Recherche tolérante : sans accents ni majuscules */
export const normalize = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Vrai si l'un des champs contient le texte cherché (ou si rien n'est cherché) */
export function matches(query: string | undefined, ...fields: (string | null | undefined)[]): boolean {
  const q = normalize(query?.trim() ?? '');
  return !q || fields.some((f) => !!f && normalize(f).includes(q));
}

/** Proposition de recherche (donnée simple, transmissible d'une page serveur) */
export interface SearchOption {
  /** Nature : « Référence », « Fournisseur »… (déjà traduite) */
  kind: string;
  title: string;
  detail: string;
  /** Texte recherché quand on choisit la proposition */
  query: string;
  icon: 'hash' | 'package' | 'pin' | 'doc' | 'user' | 'building';
}

/** Regroupe des valeurs répétées (fournisseur, emplacement…) en une proposition chacune, la plus fréquente d'abord */
export function groupOptions(values: (string | null | undefined)[], kind: string, icon: SearchOption['icon'], detail: (count: number) => string): SearchOption[] {
  const counts = new Map<string, number>();
  for (const v of values) if (v?.trim()) counts.set(v.trim(), (counts.get(v.trim()) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([title, n]) => ({ kind, title, detail: detail(n), query: title, icon }));
}

/** Filtre de période d'une page (paramètres d'URL) : date précise, sinon année et/ou mois */
export type PeriodFilter = {
  year?: string;
  month?: string;
  date?: string;
};

export function readPeriod(params: { year?: string; month?: string; date?: string }): PeriodFilter {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? '') ? params.date : undefined;
  if (date) return { date };
  const year = /^\d{4}$/.test(params.year ?? '') ? params.year : undefined;
  const m = Number(params.month);
  return { year, month: Number.isInteger(m) && m >= 1 && m <= 12 ? String(m) : undefined };
}

/** `day` : jour calendaire « YYYY-MM-DD » de la ligne */
export function inPeriod(day: string, p: PeriodFilter): boolean {
  if (p.date) return day === p.date;
  if (p.year && day.slice(0, 4) !== p.year) return false;
  if (p.month && Number(day.slice(5, 7)) !== Number(p.month)) return false;
  return true;
}

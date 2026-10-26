import { ArticleOrigin, PurchaseScope } from '@prisma/client';
import { SHEET_UNITS } from '../stock-sheets/sheet-options';

export const PURCHASE_SCOPES: { value: PurchaseScope; label: string }[] = [
  { value: PurchaseScope.OCP, label: 'OCP' },
  { value: PurchaseScope.CESSION, label: 'Cession' },
  { value: PurchaseScope.JESA, label: 'JESA' },
  { value: PurchaseScope.ANNEXE_D, label: 'Annexe D (PDR projet)' },
];

/** Volet achat → origine de l'article créé à partir d'une demande */
export const ORIGIN_OF_SCOPE: Record<PurchaseScope, { origin: ArticleOrigin; label: string }> = {
  OCP: { origin: ArticleOrigin.OCP, label: 'Magasin OCP' },
  CESSION: { origin: ArticleOrigin.CESSION, label: 'Cession OCP' },
  JESA: { origin: ArticleOrigin.JESA, label: 'Projet JESA' },
  ANNEXE_D: { origin: ArticleOrigin.ANNEXE_D, label: 'Annexe D (PDR projet)' },
};

/** Mêmes unités que la fiche « Mouvements de stock (E/S) » */
export const COUNT_UNITS = [...SHEET_UNITS];

/** Recherche tolérante : sans accents ni majuscules, tous les mots doivent apparaître (dans n'importe quel ordre) */
export const normalize = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const tokens = (s: string): string[] => normalize(s).split(' ').filter(Boolean);

/** Distance d'édition (nombre de lettres à changer / ajouter / retirer) */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/**
 * Mots significatifs d'une saisie : sans accents, et codes recollés (« DN 100 » → « dn100 », « M 16 » → « m16 »).
 * Les mots d'une seule lettre sont ignorés.
 */
export function keywords(s: string): string[] {
  const raw = tokens(s);
  const out: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const w = raw[i];
    const next = raw[i + 1];
    if (/^[a-z]{1,3}$/.test(w) && next && /^\d/.test(next)) {
      out.push(w + next);
      i++;
    } else if (w.length >= 2) out.push(w);
  }
  return out;
}

/** Deux mots se correspondent : identiques, l'un préfixe de l'autre (≥ 3 lettres), ou faute de frappe légère */
export function wordsMatch(w: string, t: string): boolean {
  if (w === t) return true;
  if (w.length >= 3 && t.length >= 3 && (t.startsWith(w) || w.startsWith(t))) return true;
  // Un nombre seul retrouve un code recollé (« 680 » ↔ « xt680 »)
  if (/^\d+$/.test(w) && t.endsWith(w) && t.length - w.length <= 3) return true;
  if (/^\d+$/.test(t) && w.endsWith(t) && w.length - t.length <= 3) return true;
  // Aucune approximation sur ce qui contient des chiffres : DN150 n'est pas DN100
  if (/\d/.test(w) || /\d/.test(t)) return false;
  const max = Math.max(w.length, t.length);
  const tolerance = max >= 7 ? 2 : max >= 4 ? 1 : 0;
  return tolerance > 0 && Math.abs(w.length - t.length) <= tolerance && levenshtein(w, t) <= tolerance;
}

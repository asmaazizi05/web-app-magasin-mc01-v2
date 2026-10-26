import { cache } from 'react';
import { EN } from './en';
import { EN_PATTERNS } from './en-patterns';

/**
 * Langue d'affichage (FR par défaut, EN en option) — choisie dans « Paramètres & Droits », mémorisée dans un cookie.
 * Les textes restent écrits en français dans le code : `tr('Texte')` renvoie la traduction du dictionnaire `en.ts`
 * (ou le texte tel quel s'il n'y figure pas : données saisies, références…).
 */
export type Lang = 'fr' | 'en';
export const LANG_COOKIE = 'mc01-lang';
export const parseLang = (value?: string | null): Lang => (value === 'en' ? 'en' : 'fr');

/** `tr('{0} bons sur {1}', a, b)` : les `{n}` sont remplacés après traduction */
export type Translate = (text: string, ...args: (string | number)[]) => string;

function byPattern(text: string): string {
  for (const [re, to] of EN_PATTERNS) {
    const m = text.match(re);
    if (m) return to(m);
  }
  return text;
}

export function translate(lang: Lang, text: string, args: (string | number)[] = []): string {
  const out = lang === 'en' ? (EN[text] ?? byPattern(text)) : text;
  return args.length ? out.replace(/\{(\d+)\}/g, (m, i: string) => (args[Number(i)] !== undefined ? String(args[Number(i)]) : m)) : out;
}

export const makeT =
  (lang: Lang): Translate =>
  (text, ...args) =>
    translate(lang, text, args);

// Côté serveur : langue de la requête en cours, posée par `getT()` au début de chaque page
const fallback = { lang: 'fr' as Lang };
const serverLang = typeof cache === 'function' ? cache(() => ({ lang: 'fr' as Lang })) : () => fallback;
export const setServerLang = (lang: Lang) => {
  serverLang().lang = lang;
};

// Côté client : le contexte React (LangContext.tsx) s'enregistre ici
let clientLang: (() => Lang) | null = null;
export const registerClientLang = (hook: () => Lang) => {
  clientLang = hook;
};

/** Utilisable dans tout composant, serveur ou client */
export function useLang(): Lang {
  return clientLang ? clientLang() : serverLang().lang;
}

export function useT(): Translate {
  return makeT(useLang());
}

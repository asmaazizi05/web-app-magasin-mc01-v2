'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';

export const THEME_KEY = 'mc01-theme';

/** Script inline exécuté avant le rendu pour éviter un flash : sombre par défaut. */
export const themeInitScript = `try{if(localStorage.getItem('${THEME_KEY}')==='light'){document.documentElement.classList.remove('dark')}}catch(e){}`;

export function ThemeToggle() {
  const tr = useT();
  const [dark, setDark] = useState(true);

  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);

  const toggle = () => {
    const next = !dark;
    const apply = () => document.documentElement.classList.toggle('dark', next);
    // Fondu de toute la page quand le navigateur le permet ; sinon changement direct
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(apply);
    else apply();
    setDark(next);
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  };

  const side = (on: boolean) => `flex h-6 w-7 items-center justify-center rounded-full transition ${on ? 'bg-white shadow dark:bg-jesa' : ''}`;
  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label={tr('Basculer entre le mode clair et le mode sombre')}
      title={dark ? tr('Mode Sombre') : tr('Mode Clair')}
      className="flex items-center gap-0.5 rounded-full border border-gray-300 bg-gray-100 p-0.5 transition hover:bg-gray-200 dark:border-gray-700/50 dark:bg-navy-dark dark:hover:bg-navy"
    >
      <span className={side(!dark)}>
        <Sun className={`h-3.5 w-3.5 ${dark ? 'text-gray-500' : 'text-amber-500'}`} />
      </span>
      <span className={side(dark)}>
        <Moon className={`h-3.5 w-3.5 ${dark ? 'text-white' : 'text-gray-400'}`} />
      </span>
    </button>
  );
}

'use client';

import { Languages } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LANG_COOKIE, type Lang, useLang, useT } from '@/lib/i18n';

const CHOICES: { lang: Lang; code: string; label: string }[] = [
  { lang: 'fr', code: 'FR', label: 'Français' },
  { lang: 'en', code: 'ENG', label: 'English' },
];

/** Langue d'affichage de l'application : mémorisée dans un cookie (un an), appliquée à toutes les pages */
export function LanguageSelector() {
  const tr = useT();
  const current = useLang();
  const router = useRouter();

  const choose = (lang: Lang) => {
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
          <Languages className="h-4 w-4 text-jesa-light" /> {tr("Langue d'affichage")}
        </h3>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          {tr("S'applique à toute l'application sur cet appareil. Les données saisies (articles, fournisseurs, commentaires) restent telles quelles.")}
        </p>
      </div>
      <div className="flex gap-1 rounded-xl border border-gray-300 bg-gray-100 p-1 dark:border-gray-700 dark:bg-navy-dark" role="radiogroup" aria-label={tr("Langue d'affichage")}>
        {CHOICES.map((c) => (
          <button
            key={c.lang}
            role="radio"
            aria-checked={current === c.lang}
            onClick={() => choose(c.lang)}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
              current === c.lang ? 'bg-jesa text-white shadow' : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-navy'
            }`}
          >
            {c.code} <span className="font-medium opacity-80">· {c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

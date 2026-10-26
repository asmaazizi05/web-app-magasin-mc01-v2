'use client';

import { Menu, UserCog } from 'lucide-react';
import { usePathname } from 'next/navigation';
import logo from '@/assets/jesa-logo.png';
import { ExportPdfButton } from './ExportPdf';
import { Notifications } from './Notifications';
import { useProfile } from './ProfileContext';
import { useT } from '@/lib/i18n';

/** Barre d'action supérieure : titre, profil, export PDF (sauf dans Paramètres), notifications. */
export function ActionBar({ appTitle, siteLabel, alertCount, onMenu, scrolled = false }: { appTitle: string; siteLabel: string; alertCount: number; onMenu: () => void; scrolled?: boolean }) {
  const tr = useT();
  const pathname = usePathname();
  const { profile, profiles, setProfile } = useProfile();
  return (
    <header className={`z-30 flex flex-wrap items-center xl:flex-nowrap justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2 backdrop-blur-md transition-[color,background-color,border-color,box-shadow] duration-200 dark:border-gray-800 dark:bg-navy-light/80 md:px-6 print:hidden ${scrolled ? 'shadow-lg shadow-black/20' : ''}`}>
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onMenu} className="rounded-lg p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-navy md:hidden" aria-label={tr('Ouvrir le menu')}>
          <Menu className="h-5 w-5" />
        </button>
        {/* Logo bleu en thème clair, blanc en thème sombre : deux images superposées en fondu croisé,
            au même rythme que le fond de la barre (le logo reste lisible pendant le changement de thème) */}
        <span className="relative flex-shrink-0 px-2.5 py-1">
          <img src={logo.src} alt="JESA" className="h-7 w-auto transition-opacity dark:opacity-0 md:h-9" />
          <img src={logo.src} alt="" aria-hidden="true" className="absolute left-2.5 top-1 h-7 w-auto opacity-0 brightness-0 invert transition-opacity dark:opacity-100 md:h-9" />
        </span>
        <h1 className="min-w-0 text-[13px] font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white md:truncate md:text-lg">
          {tr(appTitle)} <span className="hidden font-normal text-gray-400 dark:text-gray-500 md:inline">|</span>{' '}
          <span className="block text-jesa-light md:inline">{siteLabel}</span>
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:gap-3 xl:flex-shrink-0 xl:flex-nowrap">
        <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-gray-100 px-3 py-1 dark:border-gray-700 dark:bg-navy-dark">
          <UserCog className="h-4 w-4 text-jesa-light" />
          <select
            value={profile.key}
            onChange={(e) => setProfile(e.target.value)}
            className="max-w-[11rem] cursor-pointer bg-transparent text-xs font-extrabold text-jesa-light outline-none md:max-w-none"
            aria-label={tr('Profil actif')}
          >
            {profiles.map((p) => (
              <option key={p.key} value={p.key} className="bg-slate-900 text-white">
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {!pathname.startsWith('/parametres') && <ExportPdfButton />}
        <Notifications initialCount={alertCount} />
      </div>
    </header>
  );
}

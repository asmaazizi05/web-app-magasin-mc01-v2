'use client';

import { ChevronDown, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { NAV_ITEMS, type NavItem } from '@/lib/nav';
import { useProfile } from './ProfileContext';
import { useT } from '@/lib/i18n';
import { PILL_MOTION, pillStyle, useSlidingPill } from '../ui/useSlidingPill';

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tr = useT();
  const pathname = usePathname();
  const { profile } = useProfile();
  const items = NAV_ITEMS.filter((i) => !profile.hiddenRoutes.includes(i.href));
  // Correspondance exacte ou sous-page : « /inventaire » ne doit pas s'allumer sur « /inventaire-saisie »
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

  // Surbrillance de la rubrique active : une pastille unique qui glisse d'une rubrique à l'autre
  const nav = useRef<HTMLElement>(null);
  const { pill, slide } = useSlidingPill(nav, `${pathname}|${profile.key}`);
  const activeClass = pill ? 'relative font-semibold text-white' : 'bg-jesa font-semibold text-white';

  return (
    <>
      {open && <div className="fixed inset-0 z-30 animate-fade-in bg-black/60 md:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`dark fixed inset-y-0 left-0 z-40 flex w-64 flex-shrink-0 flex-col border-r border-gray-800 bg-slate-900 text-white shadow-xl transition-transform duration-300 ease-out dark:bg-navy-dark md:static md:z-20 md:translate-x-0 print:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* En-tête réservé au mobile (fermeture) : le logo est dans la barre du haut */}
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3 md:hidden">
          <p className="text-[11px] font-medium text-gray-400">{tr('Magasin Central MC01')}</p>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-navy-light md:hidden" aria-label={tr('Fermer le menu')}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav ref={nav} className="custom-scrollbar relative flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-0 top-0 bg-jesa shadow-lg shadow-jesa/30 ${slide ? PILL_MOTION : ''} ${pill ? 'opacity-100' : 'opacity-0'}`}
            style={pillStyle(pill)}
          />
          {items.map((item) =>
            item.children ? (
              <NavGroup key={item.href} item={item} pathname={pathname} onNavigate={onClose} activeClass={activeClass} />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                data-active={isActive(item.href)}
                className={`flex w-full flex-shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition ${
                  isActive(item.href) ? activeClass : 'text-gray-300 hover:translate-x-1 hover:bg-navy-light'
                }`}
              >
                <item.icon className="h-4 w-4" /> {tr(item.label)}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center justify-between border-t border-gray-800 bg-navy-dark p-3">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white shadow-md ${profile.avatarClass}`}>
              {profile.initials}
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{profile.name}</p>
              <p className="text-[10px] text-gray-400">{tr(profile.role)}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

/** Rubrique à sous-sections : ouverte automatiquement quand l'une de ses pages est affichée */
function NavGroup({ item, pathname, onNavigate, activeClass }: { item: NavItem; pathname: string; onNavigate: () => void; activeClass: string }) {
  const tr = useT();
  const children = item.children ?? [];
  const inGroup = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const [open, setOpen] = useState(inGroup);
  useEffect(() => {
    if (inGroup) setOpen(true);
  }, [inGroup]);
  // Sous-section active : correspondance la plus longue (« /shifts » ne doit pas rester actif sur « /shifts/engins »)
  const active = children
    .filter((c) => pathname === c.href || pathname.startsWith(`${c.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition ${
          inGroup ? 'font-semibold text-white' : 'text-gray-300'
        } hover:bg-navy-light`}
      >
        <item.icon className={`h-4 w-4 ${inGroup ? 'text-jesa-light' : ''}`} />
        <span className="flex-1 text-left">{tr(item.label)}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="ml-5 mt-1 animate-rise space-y-1 border-l border-gray-700 pl-2">
          {children.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              onClick={onNavigate}
              data-active={active === c.href}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[11px] font-medium transition ${
                active === c.href ? activeClass : 'text-gray-400 hover:translate-x-1 hover:bg-navy-light hover:text-gray-200'
              }`}
            >
              <c.icon className="h-3.5 w-3.5" /> {tr(c.label)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

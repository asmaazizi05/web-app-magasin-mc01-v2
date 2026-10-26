'use client';

import { AlertTriangle, BadgeCheck, Bell, ChevronRight, type LucideIcon, Package, Truck } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDay } from '@/lib/format';
import { type Translate, useT } from '@/lib/i18n';
import { usePresence } from '../ui/usePresence';
import { useProfile } from './ProfileContext';

interface Notice {
  key: string;
  icon: LucideIcon;
  critical: boolean;
  title: string;
  detail: string;
  /** Page de détail ouverte au clic */
  href: string;
  /** Rubrique du menu concernée (masquée selon le profil) */
  route: string;
}

/** Rassemble les alertes de l'application : stock minimum, engins, habilitations. Une source en erreur est ignorée. */
async function loadNotices(tr: Translate): Promise<Notice[]> {
  const [articles, engins, habilitations] = await Promise.all([
    api.articles({ alertOnly: true }).catch(() => []),
    api.enginAlerts().catch(() => []),
    api.habilitationAlerts().catch(() => []),
  ]);
  const notices: Notice[] = [
    ...articles.map((a) => ({
      key: `art-${a.id}`,
      icon: Package,
      critical: a.alertStatus === 'CRITIQUE',
      title: a.alertStatus === 'CRITIQUE' ? tr('Stock sous le minimum') : tr('Stock proche du minimum'),
      detail: tr('{0} {1} — stock {2} / min {3}', a.code, a.designation, a.currentStock, a.minStock),
      href: `/stock?q=${encodeURIComponent(a.code)}`,
      route: '/stock',
    })),
    ...engins.map((e, i) => ({
      key: `eng-${e.enginId}-${i}`,
      icon: Truck,
      critical: e.severity === 'critique',
      title: tr(e.message),
      detail: `${e.code} ${e.name}`,
      href: `/shifts/engins/${e.enginId}`,
      route: '/shifts',
    })),
    ...habilitations.map((h) => ({
      key: `hab-${h.id}`,
      icon: BadgeCheck,
      critical: h.status === 'EXPIREE',
      title: h.status === 'EXPIREE' ? tr('Habilitation expirée') : tr('Habilitation à renouveler'),
      detail: `${h.storekeeperName} — ${h.typeName} (${h.status === 'EXPIREE' ? tr('expirée le') : tr('expire le')} ${fmtDay(h.expiresAt)})`,
      href: `/shifts/magasiniers/${h.storekeeperId}`,
      route: '/shifts',
    })),
  ];
  // Les points critiques d'abord
  return notices.sort((a, b) => Number(b.critical) - Number(a.critical));
}

/** Cloche de l'en-tête : un clic affiche les messages, un clic sur un message ouvre son détail */
export function Notifications({ initialCount }: { initialCount: number }) {
  const tr = useT();
  const pathname = usePathname();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[] | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const { mounted, leaving } = usePresence(open);

  const refresh = useCallback(() => {
    void loadNotices(tr).then(setNotices);
    // `tr` change à chaque rendu : la langue est relue à l'ouverture
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compteur à jour au chargement et à chaque changement de page ; liste rechargée à l'ouverture
  useEffect(refresh, [refresh, pathname]);
  useEffect(() => {
    if (open) void loadNotices(tr).then(setNotices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = notices?.filter((n) => !profile.hiddenRoutes.includes(n.route)) ?? null;
  const count = visible ? visible.length : initialCount;

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={tr('{0} notification(s)', count)}
        title={tr('{0} notification(s)', count)}
        className="relative rounded-xl bg-gray-100 p-1.5 text-gray-700 transition hover:bg-gray-200 dark:bg-navy-light dark:text-gray-300 dark:hover:bg-slate-700"
      >
        <Bell className={`h-4 w-4 ${count > 0 ? 'bell-swing' : ''}`} />
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 animate-pop items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {mounted && (
        <div className={`absolute right-0 top-full z-50 mt-2 origin-top-right ${leaving ? 'pointer-events-none animate-pop-out' : 'animate-pop'} w-[min(24rem,calc(100vw-2rem))] overflow-hidden max-md:fixed max-md:inset-x-4 max-md:top-full max-md:w-auto rounded-2xl border border-teal-200 bg-teal-50 shadow-2xl dark:border-teal-700 dark:bg-teal-950`}>
          <p className="flex items-center gap-2 bg-teal-600 px-4 py-3 text-sm font-bold text-white dark:bg-teal-700">
            <AlertTriangle className="h-4 w-4 text-white" /> {tr('Notifications')}
            {count > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] text-white">{count}</span>}
          </p>
          {!visible ? (
            <p className="animate-pulse px-4 py-6 text-center text-xs text-gray-500 dark:text-gray-400">{tr('Chargement…')}</p>
          ) : visible.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-gray-500 dark:text-gray-400">{tr('Aucune notification : tout est en ordre.')}</p>
          ) : (
            <ul className="stagger custom-scrollbar max-h-[60vh] divide-y divide-teal-100 overflow-y-auto dark:divide-teal-900">
              {visible.map((n) => (
                <li key={n.key}>
                  <Link href={n.href} onClick={() => setOpen(false)} className="flex items-start gap-3 px-4 py-3 text-xs transition hover:bg-teal-100 dark:hover:bg-teal-900">
                    <span className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${n.critical ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                      <n.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block font-bold ${n.critical ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{n.title}</span>
                      <span className="block text-gray-600 dark:text-gray-300">{n.detail}</span>
                    </span>
                    <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

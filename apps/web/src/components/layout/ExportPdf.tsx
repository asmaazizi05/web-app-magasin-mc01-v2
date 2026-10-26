'use client';

import { ArrowLeft, Download, FileText } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NAV_ITEMS } from '@/lib/nav';
import { Modal } from '../ui/Modal';
import { useProfile } from './ProfileContext';
import { type Translate, useT } from '@/lib/i18n';

interface Block {
  label: string;
  checked: boolean;
}

/** Pages du menu, sous-sections dépliées */
const PAGES = NAV_ITEMS.flatMap((i) => i.children ?? [i])
  .filter((i) => i.href !== '/parametres')
  .map(({ href, label }) => ({ href, label }));

/** Blocs de la page affichée : enfants directs du conteneur de page, nommés d'après leur premier titre */
function scanBlocks(): HTMLElement[] | null {
  const page = document.querySelector('[data-export-root]')?.lastElementChild;
  if (!page || page.hasAttribute('data-loading')) return null;
  return [...page.children].filter((el): el is HTMLElement => el instanceof HTMLElement && el.offsetParent !== null && !el.classList.contains('print:hidden'));
}

/** Titre d'un élément : son premier titre, sinon son premier texte */
function firstTitle(el: Element): string {
  const heading = el.querySelector('h1, h2, h3, h4, p.uppercase')?.textContent;
  if (heading?.trim()) return heading;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if ((n.textContent ?? '').trim().length > 1) return n.textContent ?? '';
  return '';
}

function blockLabel(el: HTMLElement, index: number, tr: Translate): string {
  // Grille de cartes : on nomme le bloc d'après chacune de ses cartes
  const parts = el.classList.contains('grid') ? [...el.children].slice(0, 4).map(firstTitle) : [firstTitle(el)];
  const text = parts
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' · ');
  if (!text) return tr('Bloc {0}', index + 1);
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}

/** Export PDF en deux étapes : choix de la page, puis des blocs à inclure (les autres sont masqués à l'impression). */
export function ExportPdfButton() {
  const tr = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<{ href: string; label: string } | null>(null);
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const elements = useRef<HTMLElement[]>([]);

  const pages = PAGES.filter((p) => !profile.hiddenRoutes.includes(p.href));
  const onMenuPage = pages.some((p) => p.href === pathname);

  const close = () => {
    setOpen(false);
    setTarget(null);
    setBlocks(null);
  };

  const choose = (page: { href: string; label: string }) => {
    setBlocks(null);
    setTarget(page);
    if (page.href !== pathname) router.push(page.href);
  };

  // Étape 2 : attend que la page choisie soit affichée (hors écran de chargement), puis liste ses blocs
  useEffect(() => {
    if (!open || !target || blocks || pathname !== target.href) return;
    const scan = () => {
      const found = scanBlocks();
      if (!found) return;
      elements.current = found;
      setBlocks(found.map((el, i) => ({ label: blockLabel(el, i, tr), checked: true })));
    };
    scan();
    const timer = setInterval(scan, 300);
    return () => clearInterval(timer);
  }, [open, target, blocks, pathname]);

  const exportPdf = () => {
    const skipped = elements.current.filter((_, i) => !blocks?.[i]?.checked);
    skipped.forEach((el) => el.setAttribute('data-export-skip', ''));
    const restore = () => skipped.forEach((el) => el.removeAttribute('data-export-skip'));
    window.addEventListener('afterprint', restore, { once: true });
    close();
    // Laisse la fenêtre de choix disparaître avant d'ouvrir l'impression
    setTimeout(() => window.print(), 150);
  };

  const setAll = (checked: boolean) => setBlocks((l) => l?.map((b) => ({ ...b, checked })) ?? null);
  const count = blocks?.filter((b) => b.checked).length ?? 0;
  const rowClass =
    'flex w-full items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-800 transition hover:border-jesa-light hover:bg-jesa-light/10 dark:border-gray-700 dark:text-gray-200';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 transition hover:bg-gray-200 dark:border-gray-700/50 dark:bg-navy-light dark:text-gray-200 dark:hover:bg-slate-700"
      >
        <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{tr('Exporter PDF')}</span>
      </button>

      {/* Portail : la barre du haut est floutée (backdrop), ce qui piégerait une fenêtre en position fixe */}
      {open &&
        createPortal(
      <Modal open={open} title={target ? tr('Exporter PDF — {0}', target.label) : tr('Exporter PDF')} onClose={close}>
        {!target ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">{tr('1. Choisissez la page à exporter.')}</p>
            {!onMenuPage && (
              <button onClick={() => choose({ href: pathname, label: tr('Page affichée') })} className={`${rowClass} font-bold`}>
                <FileText className="h-4 w-4 text-jesa-light" /> {tr('Page affichée')}
              </button>
            )}
            {pages.map((p) => (
              <button key={p.href} onClick={() => choose(p)} className={rowClass}>
                <FileText className="h-4 w-4 text-jesa-light" />
                <span className="flex-1">{tr(p.label)}</span>
                {p.href === pathname && <span className="rounded bg-jesa-light/15 px-1.5 py-0.5 text-[10px] font-bold text-jesa-light">{tr('Page affichée')}</span>}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">{tr('2. Cochez les blocs à inclure dans le PDF.')}</p>
            {!blocks ? (
              <p className="animate-pulse py-6 text-center text-xs text-gray-500 dark:text-gray-400">{tr('Chargement de la page…')}</p>
            ) : (
              <>
                <div className="flex gap-3 text-[11px] font-bold text-jesa-light">
                  <button onClick={() => setAll(true)}>{tr('Tout cocher')}</button>
                  <button onClick={() => setAll(false)}>{tr('Tout décocher')}</button>
                </div>
                <div className="space-y-1.5">
                  {blocks.map((b, i) => (
                    <label key={i} className={`${rowClass} cursor-pointer`}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 flex-shrink-0 accent-[#003088]"
                        checked={b.checked}
                        onChange={() => setBlocks((l) => l?.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x)) ?? null)}
                      />
                      <span>{tr(b.label)}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  setTarget(null);
                  setBlocks(null);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-navy-dark"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {tr('Retour')}
              </button>
              <button
                onClick={exportPdf}
                disabled={count === 0}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-jesa px-3 py-2 text-xs font-bold text-white hover:bg-jesa-dark disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" /> {tr('Exporter')} {count} {tr('bloc')}{count > 1 ? 's' : ''} {tr('en PDF')}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{tr("Dans la fenêtre qui s'ouvre, choisissez « Enregistrer au format PDF ».")}</p>
          </div>
        )}
      </Modal>,
          document.body,
        )}
    </>
  );
}

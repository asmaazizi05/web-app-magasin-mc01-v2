'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'run' | 'done';
type TransitionDocument = Document & { startViewTransition?: (cb: () => Promise<void> | void) => unknown };

/** Lien interne vers une autre page (clic simple, même onglet) ; sinon null */
function internalTarget(e: MouseEvent): URL | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return null;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname === location.pathname) return null;
  return url;
}

/**
 * Fluidité de navigation, montée une seule fois dans l'application :
 * – trait de progression en haut de l'écran dès le clic sur un lien, jusqu'à l'arrivée du contenu ;
 * – fondu entre l'ancienne et la nouvelle page (navigateurs récents) ;
 * – blocs situés plus bas dans la page : apparition quand on y arrive en défilant ;
 * – reflet qui suit la souris sur les cartes d'indicateurs.
 */
export function Motion() {
  const pathname = usePathname();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const arrived = useRef<(() => void) | null>(null);

  // Clic sur un lien : progression + fondu de page
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onClick = (e: MouseEvent) => {
      const url = internalTarget(e);
      if (!url) return;
      setPhase('run');
      const doc = document as TransitionDocument;
      if (!doc.startViewTransition || reduced) return;
      // On navigue nous-mêmes, à l'intérieur de la transition : l'instantané de l'ancienne page est pris avant
      e.preventDefault();
      doc.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            arrived.current = resolve;
            // La zone de contenu repart du haut (sans défilement visible : l'ancienne page est déjà figée)
            document.querySelector('[data-export-root]')?.scrollTo({ top: 0, behavior: 'instant' });
            router.push(url.pathname + url.search + url.hash);
            // Page lente à arriver : on ne fige pas l'écran, elle apparaîtra avec son animation habituelle
            setTimeout(resolve, 300);
          }),
      );
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [router]);

  // Nouvelle page affichée : fin du fondu, puis fin de la progression quand le contenu a remplacé les blocs d'attente
  useEffect(() => {
    arrived.current?.();
    arrived.current = null;
    let frame = 0;
    const started = performance.now();
    const check = () => {
      if (document.querySelector('[data-loading]') && performance.now() - started < 15000) frame = requestAnimationFrame(check);
      else setPhase((p) => (p === 'run' ? 'done' : p));
    };
    frame = requestAnimationFrame(check);
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (phase === 'idle') return;
    // « run » sans changement de page (lien annulé…) : on ne laisse pas le trait indéfiniment
    const id = setTimeout(() => setPhase('idle'), phase === 'done' ? 400 : 15000);
    return () => clearTimeout(id);
  }, [phase]);

  // Apparition au défilement des blocs situés sous l'écran
  useEffect(() => {
    const root = document.querySelector('[data-export-root]');
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Animations pilotées en JavaScript, sans toucher aux attributs : React garde la main sur le HTML
    const known = new WeakSet<Element>();
    const holds = new WeakMap<Element, Animation>();
    const seen = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          holds.get(entry.target)?.cancel();
          entry.target.animate([{ opacity: 0, transform: 'translateY(-22px)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
          seen.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    let frame = 0;
    const scan = () => {
      frame = 0;
      const limit = window.innerHeight - 20;
      for (const el of root.querySelectorAll<HTMLElement>('.page-enter > * > *:not([role="dialog"])')) {
        if (known.has(el)) continue;
        known.add(el);
        if (el.getBoundingClientRect().top <= limit) continue;
        // Bloc sous l'écran : maintenu invisible jusqu'à ce qu'on y arrive
        holds.set(el, el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: 'forwards' }));
        seen.observe(el);
      }
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(scan);
    };
    const mutations = new MutationObserver(schedule);
    mutations.observe(root, { childList: true, subtree: true });
    schedule();
    return () => {
      mutations.disconnect();
      seen.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  // Reflet qui suit la souris sur la carte survolée (une seule écriture par image)
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return;
    let frame = 0;
    let last: PointerEvent | null = null;
    const apply = () => {
      frame = 0;
      const card = (last?.target as Element | null)?.closest?.('.lift') as HTMLElement | null;
      if (!card || !last) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${last.clientX - r.left}px`);
      card.style.setProperty('--my', `${last.clientY - r.top}px`);
    };
    const onMove = (e: PointerEvent) => {
      last = e;
      frame ||= requestAnimationFrame(apply);
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div aria-hidden="true" data-phase={phase} className="route-progress print:hidden" />;
}

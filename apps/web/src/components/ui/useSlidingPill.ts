'use client';

import { type RefObject, useCallback, useEffect, useLayoutEffect, useState } from 'react';

export interface Pill {
  x: number;
  y: number;
  w: number;
  h: number;
  r: string;
}

/**
 * Pastille de sélection qui glisse : position de l'élément `[data-active="true"]` dans `root`.
 * `slide` = la pastille est déjà en place, les déplacements suivants sont animés.
 */
export function useSlidingPill(root: RefObject<HTMLElement | null>, key: string): { pill: Pill | null; slide: boolean } {
  const [pill, setPill] = useState<Pill | null>(null);
  const [slide, setSlide] = useState(false);

  const place = useCallback(() => {
    const box = root.current;
    const el = box?.querySelector<HTMLElement>('[data-active="true"]');
    if (!box || !el) return setPill(null);
    let x = 0;
    let y = 0;
    for (let e: HTMLElement | null = el; e && e !== box; e = e.offsetParent as HTMLElement | null) {
      x += e.offsetLeft;
      y += e.offsetTop;
    }
    const next = { x, y, w: el.offsetWidth, h: el.offsetHeight, r: getComputedStyle(el).borderRadius };
    setPill((p) => (p && p.x === next.x && p.y === next.y && p.w === next.w && p.h === next.h && p.r === next.r ? p : next));
  }, [root]);

  useLayoutEffect(place, [place, key]);

  // Élément actif changé, contenu déplié ou replié, fenêtre redimensionnée : la pastille suit
  useEffect(() => {
    const box = root.current;
    if (!box) return;
    const observer = new MutationObserver(place);
    observer.observe(box, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-active'] });
    window.addEventListener('resize', place);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [root, place]);

  // Pas de glissement pour la toute première mise en place
  const placed = pill !== null;
  useEffect(() => {
    if (!placed) return setSlide(false);
    const id = requestAnimationFrame(() => setSlide(true));
    return () => cancelAnimationFrame(id);
  }, [placed]);

  return { pill, slide };
}

/** Style de la pastille (à poser sur un élément en `absolute left-0 top-0`) */
export function pillStyle(pill: Pill | null): React.CSSProperties {
  // `animation: none` : la pastille ne doit pas hériter d'une animation d'apparition du conteneur
  return pill
    ? { transform: `translate(${pill.x}px, ${pill.y}px)`, width: pill.w, height: pill.h, borderRadius: pill.r, animation: 'none' }
    : { animation: 'none' };
}

export const PILL_MOTION = 'transition-[transform,width,height,opacity] duration-300 ease-out';

'use client';

import { type ReactNode, useRef } from 'react';
import { PILL_MOTION, pillStyle, useSlidingPill } from './useSlidingPill';

interface PillGroupProps {
  children: ReactNode;
  className?: string;
  /** Apparence de la pastille (fond, bordure) : celle du choix actif */
  pillClassName?: string;
}

/**
 * Groupe d'onglets / de filtres : la pastille glisse vers l'enfant marqué `data-active="true"`.
 * Une fois la pastille en place, le fond propre de l'enfant actif est masqué (règle `[data-pill-ready]`).
 */
export function PillGroup({ children, className = '', pillClassName = 'bg-jesa shadow' }: PillGroupProps) {
  const box = useRef<HTMLDivElement>(null);
  const { pill, slide } = useSlidingPill(box, '');
  return (
    <div ref={box} data-pill-ready={pill ? '' : undefined} className={`relative ${className}`}>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-0 top-0 ${pillClassName} ${slide ? PILL_MOTION : ''} ${pill ? 'opacity-100' : 'opacity-0'}`}
        style={pillStyle(pill)}
      />
      {children}
    </div>
  );
}

'use client';

import { useLayoutEffect, useRef } from 'react';

const NUMBER = /\d[\d\s  .,]*\d|\d/;
const DURATION = 2000;

interface Parsed {
  start: number;
  end: number;
  target: number;
  decimals: number;
  decimalSep: string;
  groupSep: string;
}

/** Repère le premier nombre d'un texte déjà formaté (« +1 234 unités », « 92,5 % ») */
function parse(text: string): Parsed | null {
  const m = NUMBER.exec(text);
  if (!m) return null;
  const raw = m[0];
  // Dernier « , » ou « . » suivi de 1 ou 2 chiffres : séparateur décimal ; sinon séparateur de milliers
  const dec = /[.,](\d{1,2})$/.exec(raw);
  const decimals = dec ? dec[1].length : 0;
  const decimalSep = dec ? dec[0][0] : ',';
  const intPart = dec ? raw.slice(0, -dec[0].length) : raw;
  const groupSep = /[^\d]/.exec(intPart)?.[0] ?? '';
  const target = Number(`${intPart.replace(/\D/g, '')}${dec ? `.${dec[1]}` : ''}`);
  if (!Number.isFinite(target) || target === 0) return null;
  return { start: m.index, end: m.index + raw.length, target, decimals, decimalSep, groupSep };
}

function format(n: number, p: Parsed): string {
  const [int, frac] = n.toFixed(p.decimals).split('.');
  const grouped = p.groupSep ? int.replace(/\B(?=(\d{3})+(?!\d))/g, p.groupSep) : int;
  return frac ? `${grouped}${p.decimalSep}${frac}` : grouped;
}

/** Chiffre d'indicateur qui « compte » de 0 jusqu'à sa valeur à l'affichage ; le texte final est exactement `value` */
export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const node = ref.current?.firstChild;
    const p = parse(value);
    if (!node || !p || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const before = value.slice(0, p.start);
    const after = value.slice(p.end);
    let frame = 0;
    let t0 = 0;
    // Écriture directe dans le nœud texte : aucun nouveau rendu React pendant l'animation
    const tick = (now: number) => {
      t0 ||= now;
      const t = Math.min((now - t0) / DURATION, 1);
      const eased = 1 - (1 - t) ** 3;
      node.nodeValue = t < 1 ? `${before}${format(p.target * eased, p)}${after}` : value;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    node.nodeValue = `${before}${format(0, p)}${after}`;
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      node.nodeValue = value;
    };
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {value}
    </span>
  );
}

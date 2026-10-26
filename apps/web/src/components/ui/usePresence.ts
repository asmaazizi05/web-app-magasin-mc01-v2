'use client';

import { useEffect, useState } from 'react';

/** Garde un élément affiché le temps de son animation de fermeture : `leaving` = en train de disparaître */
export function usePresence(open: boolean, ms = 160): { mounted: boolean; leaving: boolean } {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const id = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(id);
  }, [open, ms]);
  return { mounted: open || mounted, leaving: !open && mounted };
}

'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Entrée animée du contenu à chaque changement de page (pas lors d'un simple rafraîchissement des données) */
export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}

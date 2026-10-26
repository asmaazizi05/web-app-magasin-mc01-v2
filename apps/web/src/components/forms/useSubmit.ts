'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { showToast } from '@/lib/toast';

/** Envois en cours : `html[data-submitting]` affiche le cercle d'attente sur le bouton désactivé */
let submitting = 0;
function markSubmitting(delta: 1 | -1): void {
  submitting += delta;
  document.documentElement.toggleAttribute('data-submitting', submitting > 0);
}

/** Gère l'état d'envoi d'un formulaire puis rafraîchit les données serveur de la page. */
export function useSubmit(onDone: () => void) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setPending(true);
    setError(null);
    markSubmitting(1);
    try {
      await action();
      onDone();
      router.refresh();
      showToast('Enregistré');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue.');
    } finally {
      markSubmitting(-1);
      setPending(false);
    }
  };

  return { pending, error, run, setError };
}

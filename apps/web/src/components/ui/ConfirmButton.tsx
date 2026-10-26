'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { useProfile } from '../layout/ProfileContext';
import { useT } from '@/lib/i18n';

interface ConfirmButtonProps {
  /** Ressource API à supprimer (ex. « /habilitations/12 ») — une chaîne, transmissible depuis une page serveur */
  deletePath: string;
  label?: string;
  confirmLabel?: string;
  /** Après succès : redirection au lieu d'un simple rafraîchissement */
  redirectTo?: string;
}

/** Bouton en deux temps : un premier clic demande confirmation, le second exécute */
export function ConfirmButton({ deletePath, label, confirmLabel, redirectTo }: ConfirmButtonProps) {
  const tr = useT();
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { canEdit } = useProfile();

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  const click = async () => {
    if (!armed) return setArmed(true);
    setPending(true);
    setError(null);
    try {
      await api.remove(deletePath);
      showToast('Supprimé');
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('Erreur inattendue.'));
      setArmed(false);
    } finally {
      setPending(false);
    }
  };

  // Suppression : masquée en consultation seule
  if (!canEdit) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={click}
        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition disabled:opacity-50 ${
          armed ? 'bg-red-600 text-white' : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30'
        }`}
      >
        <Trash2 className="h-3 w-3" /> {armed ? (confirmLabel ?? tr('Confirmer ?')) : (label ?? tr('Supprimer'))}
      </button>
      {error && <span className="text-[10px] text-red-500">{tr(error)}</span>}
    </span>
  );
}

'use client';

import { X } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { usePresence } from './usePresence';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Largeur : « lg » pour les formulaires détaillés */
  size?: 'md' | 'lg';
}

export function Modal({ open, title, onClose, children, size = 'md' }: ModalProps) {
  const tr = useT();
  const { mounted, leaving } = usePresence(open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ${leaving ? 'pointer-events-none animate-fade-out' : 'animate-fade-in'}`} onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={`max-h-[90vh] w-full ${size === 'lg' ? 'max-w-3xl' : 'max-w-lg'} custom-scrollbar ${leaving ? 'animate-pop-out' : 'animate-pop'} overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-navy-light`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-dark" aria-label={tr('Fermer')}>
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

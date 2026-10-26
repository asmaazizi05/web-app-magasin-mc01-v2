'use client';

import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { TOAST_EVENT } from '@/lib/toast';
import { usePresence } from '../ui/usePresence';

/** Bulle de confirmation : glisse en bas de l'écran après un enregistrement, puis disparaît seule */
export function Toaster() {
  const tr = useT();
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [open, setOpen] = useState(false);
  const { mounted, leaving } = usePresence(open, 200);

  useEffect(() => {
    const onToast = (e: Event) => {
      setToast({ id: Date.now(), message: (e as CustomEvent<string>).detail });
      setOpen(true);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => setOpen(false), 2600);
    return () => clearTimeout(id);
  }, [open, toast?.id]);

  if (!mounted || !toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4 print:hidden" role="status" aria-live="polite">
      <p
        key={toast.id}
        className={`flex items-center gap-2 rounded-full border border-green-500/40 bg-white px-4 py-2 text-xs font-bold text-gray-900 shadow-2xl dark:bg-navy-light dark:text-white ${leaving ? 'animate-fade-out' : 'animate-rise'}`}
      >
        <CheckCircle2 className="h-4 w-4 text-green-500" /> {tr(toast.message)}
      </p>
    </div>
  );
}

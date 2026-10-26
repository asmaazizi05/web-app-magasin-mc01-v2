'use client';

import { ErrorPanel } from '@/components/ui/ErrorPanel';
import { useT } from '@/lib/i18n';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const tr = useT();
  return (
    <div className="space-y-3">
      <ErrorPanel message={error.message} />
      <button onClick={reset} className="rounded-xl bg-jesa px-3 py-1.5 text-xs font-bold text-white hover:bg-jesa-dark">
        {tr('Réessayer')}
      </button>
    </div>
  );
}

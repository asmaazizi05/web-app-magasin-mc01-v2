'use client';

import { type ReactNode, useState } from 'react';
import type { Lang } from '@/lib/i18n';
import { LangProvider } from '@/lib/i18n/LangContext';
import type { ProfileView } from '@/lib/types';
import { Motion } from './Motion';
import { ProfileProvider, ReadOnlyBanner } from './ProfileContext';
import { Sidebar } from './Sidebar';
import { Toaster } from './Toaster';
import { ActionBar } from './Topbar';

interface AppShellProps {
  children: ReactNode;
  lang: Lang;
  alertCount: number;
  appTitle: string;
  siteLabel: string;
  profiles: ProfileView[];
}

export function AppShell({ children, lang, alertCount, appTitle, siteLabel, profiles }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Contenu défilé : ombre sous la barre du haut
  const [scrolled, setScrolled] = useState(false);
  return (
    <LangProvider lang={lang}>
    <ProfileProvider profiles={profiles}>
      <div className="flex h-full flex-col print:block print:h-auto">
        <Motion />
        <ActionBar scrolled={scrolled} appTitle={appTitle} siteLabel={siteLabel} alertCount={alertCount} onMenu={() => setMenuOpen(true)} />
        <div className="flex flex-1 overflow-hidden print:block print:overflow-visible">
          <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-100 transition-colors dark:bg-navy print:block print:overflow-visible print:bg-white">
            <div data-export-root onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)} className="custom-scrollbar relative flex-1 overflow-y-auto p-4 md:p-6 print:overflow-visible print:p-0">
              <ReadOnlyBanner />
              {children}
            </div>
          </main>
        </div>
        <Toaster />
      </div>
    </ProfileProvider>
    </LangProvider>
  );
}

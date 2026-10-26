import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { themeInitScript } from '@/components/layout/ThemeToggle';
import { api } from '@/lib/api';
import type { ProfileView } from '@/lib/types';
import './globals.css';
import { getLang, getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return {
    title: tr('JESA - Magasin Central MC01'),
    description: tr("Gestion d'entrepôt du Magasin Central MC01"),
  };
}

export const dynamic = 'force-dynamic';

/** Données de l'en-tête ; API indisponible : titres par défaut */
async function shellData(): Promise<{ alertCount: number; appTitle: string; siteLabel: string; profiles: ProfileView[] }> {
  try {
    const [settings, alerts, profiles] = await Promise.all([api.settings(), api.articles({ alertOnly: true }), api.profiles()]);
    return { alertCount: alerts.length, appTitle: settings.appTitle, siteLabel: settings.siteLabel, profiles };
  } catch {
    return { alertCount: 0, appTitle: 'Gestion Intégrée Magasin', siteLabel: 'MC01 Benguerir', profiles: [] };
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getLang();
  const { alertCount, appTitle, siteLabel, profiles } = await shellData();
  return (
    <html lang={lang} className="dark h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="h-full bg-navy font-sans text-gray-900 transition-colors duration-200 dark:text-gray-100">
        <AppShell lang={lang} alertCount={alertCount} appTitle={appTitle} siteLabel={siteLabel} profiles={profiles}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}

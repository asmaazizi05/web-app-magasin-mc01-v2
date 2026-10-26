'use client';

import { Eye } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { setApiReadOnly } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { accessOf, FALLBACK_PROFILE, type Profile, sectionOf, toProfiles } from '@/lib/profiles';
import type { ProfileView } from '@/lib/types';

interface ProfileContextValue {
  /** Profil actif (personne choisie dans la barre du haut) */
  profile: Profile;
  profiles: Profile[];
  setProfile: (key: string) => void;
  /** Faux quand la rubrique affichée est en consultation seule pour le profil actif */
  canEdit: boolean;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);
const STORAGE_KEY = 'mc01-profile';
const READ_ONLY = 'Consultation seule : votre profil ne peut pas modifier cette rubrique.';

/** `profiles` : personnes enregistrées (lues par la page racine) ; le choix est mémorisé sur l'appareil */
export function ProfileProvider({ profiles: views, children }: { profiles: ProfileView[]; children: ReactNode }) {
  const pathname = usePathname();
  const profiles = useMemo(() => toProfiles(views), [views]);
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      setKey(localStorage.getItem(STORAGE_KEY));
    } catch {
      /* stockage indisponible : première personne de la liste */
    }
  }, []);

  const setProfile = (next: string) => {
    setKey(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  // Personne mémorisée, sinon la première de la liste (personne supprimée, premier accès…)
  const profile = profiles.find((p) => p.key === key) ?? profiles[0] ?? FALLBACK_PROFILE;
  const canEdit = accessOf(profile, sectionOf(pathname)) !== 'view';

  // Consultation seule : la passerelle API refuse toute modification depuis cette rubrique
  useEffect(() => {
    setApiReadOnly(canEdit ? null : READ_ONLY);
    return () => setApiReadOnly(null);
  }, [canEdit]);

  return <ProfileContext.Provider value={{ profile, profiles, setProfile, canEdit }}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile doit être utilisé dans <ProfileProvider>.');
  return ctx;
}

/** N'affiche son contenu (boutons d'ajout, de suppression…) que si le profil actif peut modifier la rubrique */
export function EditOnly({ children }: { children: ReactNode }) {
  return useProfile().canEdit ? <>{children}</> : null;
}

/** Bandeau affiché en haut d'une rubrique en consultation seule */
export function ReadOnlyBanner() {
  const tr = useT();
  if (useProfile().canEdit) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 print:hidden">
      <Eye className="h-4 w-4 flex-shrink-0 text-amber-500" /> {tr(READ_ONLY)}
    </div>
  );
}

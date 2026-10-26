// Personnes utilisant l'application et visibilité des menus. Elles sont enregistrées en base (« Paramètres & Droits »
// → matrice des droits) ; ce fichier ne fait que les habiller pour l'affichage.
// Il ne s'agit pas d'une authentification : le profil choisi filtre le menu et les actions affichées.
import { initials } from './format';
import type { ProfileView } from './types';

export interface Profile {
  /** Identifiant mémorisé sur l'appareil (sélecteur de profil) */
  key: string;
  id: number;
  name: string;
  /** Titre / poste */
  role: string;
  initials: string;
  avatarClass: string;
  badgeClass: string;
  phone: string | null;
  email: string | null;
  /** Rubriques du menu masquées */
  hiddenRoutes: string[];
  /** Rubriques visibles en consultation seulement (aucune modification) */
  readOnlyRoutes: string[];
  /** Administrateur : accès complet + actions de responsable (validation des comptages…) */
  admin: boolean;
}

/** Couleurs des personnes non administratrices, dans l'ordre de la liste */
const PALETTE = [
  { avatar: 'bg-blue-600', badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-semibold' },
  { avatar: 'bg-purple-600', badge: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 font-semibold' },
  { avatar: 'bg-amber-500', badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-semibold' },
  { avatar: 'bg-teal-600', badge: 'bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 font-semibold' },
  { avatar: 'bg-rose-600', badge: 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 font-semibold' },
];
const ADMIN_STYLE = { avatar: 'bg-jesa', badge: 'bg-jesa-light/15 text-jesa-light font-bold' };

export function toProfiles(views: ProfileView[]): Profile[] {
  let n = 0;
  return views.map((v) => {
    const style = v.admin ? ADMIN_STYLE : PALETTE[n++ % PALETTE.length];
    return { key: String(v.id), id: v.id, name: v.name, role: v.role, initials: initials(v.name), avatarClass: style.avatar, badgeClass: style.badge, phone: v.phone, email: v.email, hiddenRoutes: v.hiddenRoutes, readOnlyRoutes: v.readOnlyRoutes, admin: v.admin };
  });
}

/** Utilisé quand la liste est indisponible (API arrêtée) : tout reste accessible */
export const FALLBACK_PROFILE: Profile = { key: '0', id: 0, name: '—', role: '', initials: '—', avatarClass: ADMIN_STYLE.avatar, badgeClass: ADMIN_STYLE.badge, phone: null, email: null, hiddenRoutes: [], readOnlyRoutes: [], admin: true };

/** Niveau d'accès d'une personne à une rubrique du menu */
export type Access = 'edit' | 'view' | 'none';

export function accessOf(profile: Pick<Profile, 'admin' | 'hiddenRoutes' | 'readOnlyRoutes'>, route: string): Access {
  if (profile.admin) return 'edit';
  if (profile.hiddenRoutes.includes(route)) return 'none';
  return profile.readOnlyRoutes.includes(route) ? 'view' : 'edit';
}

/** Rubrique du menu d'une page : « /shifts/engins/3 » → « /shifts », « / » → « / » */
export const sectionOf = (pathname: string): string => (pathname === '/' ? '/' : `/${pathname.split('/')[1] ?? ''}`);

/** Société d'une personne, déduite du domaine de son adresse e-mail (…@jesagroup.com → JESA, …@ocpgroup.ma → OCP) */
export type Organization = 'JESA' | 'OCP';

export function organizationOf(email: string | null | undefined): Organization | null {
  const domain = email?.split('@')[1]?.toLowerCase() ?? '';
  if (domain.includes('jesa')) return 'JESA';
  if (domain.includes('ocp')) return 'OCP';
  return null;
}

export const ORGANIZATION_BADGE: Record<Organization, string> = {
  JESA: 'bg-jesa text-white',
  OCP: 'bg-[#008343] text-white',
};

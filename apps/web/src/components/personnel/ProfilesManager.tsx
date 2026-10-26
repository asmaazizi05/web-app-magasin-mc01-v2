'use client';

import { ChevronDown, Eye, EyeOff, type LucideIcon, Mail, Pencil, PencilLine, Phone, Save, ShieldCheck, UserPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { NAV_ITEMS } from '@/lib/nav';
import { type Access, accessOf, ORGANIZATION_BADGE, organizationOf, type Profile, toProfiles } from '@/lib/profiles';
import type { ProfileInput, ProfileView } from '@/lib/types';
import { useSubmit } from '../forms/useSubmit';
import { ConfirmButton } from '../ui/ConfirmButton';
import { Field, FormError, inputClass } from '../ui/Field';
import { Modal } from '../ui/Modal';

/** Rubriques du menu dont on règle l'accès */
const SECTIONS = NAV_ITEMS.map(({ href, label, icon }) => ({ href, label, icon }));

/** Niveaux d'accès à une rubrique */
const LEVELS: { value: Access; label: string; icon: LucideIcon; on: string; cell: string }[] = [
  { value: 'edit', label: 'Éditer', icon: PencilLine, on: 'bg-green-600 text-white shadow', cell: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'view', label: 'Voir', icon: Eye, on: 'bg-amber-500 text-white shadow', cell: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: 'none', label: 'Masquer', icon: EyeOff, on: 'bg-gray-500 text-white shadow', cell: 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-500' },
];
const levelOf = (value: Access) => LEVELS.find((l) => l.value === value) ?? LEVELS[0];

/** Fenêtre d'ajout ou de modification d'une personne : identité, coordonnées, accès par rubrique */
function ProfileModal({ profile, onClose }: { profile?: Profile; onClose: () => void }) {
  const tr = useT();
  const [admin, setAdmin] = useState(profile?.admin ?? false);
  // Nouvelle personne : tout en « Éditer », sauf les paramètres (masqués)
  const [access, setAccess] = useState<Record<string, Access>>(() =>
    Object.fromEntries(SECTIONS.map((s) => [s.href, profile ? accessOf({ ...profile, admin: false }, s.href) : s.href === '/parametres' ? 'none' : 'edit'])),
  );
  const [email, setEmail] = useState(profile?.email ?? '');
  const organization = organizationOf(email);
  const { pending, error, run } = useSubmit(onClose);
  const setAll = (level: Access) => setAccess(Object.fromEntries(SECTIONS.map((s) => [s.href, level])));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const routes = (level: Access) => (admin ? [] : SECTIONS.filter((s) => access[s.href] === level).map((s) => s.href));
    const body: ProfileInput = {
      name: String(f.get('name')).trim(),
      role: String(f.get('role')).trim(),
      phone: String(f.get('phone')).trim() || null,
      email: String(f.get('email')).trim() || null,
      admin,
      hiddenRoutes: routes('none'),
      readOnlyRoutes: routes('view'),
    };
    void run(() => (profile ? api.updateProfile(profile.id, body) : api.createProfile(body)));
  };

  return (
    <Modal open title={profile ? tr('Modifier — {0}', profile.name) : tr('Ajouter une personne')} onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-5 text-xs">
        <section className="space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{tr('Identité et coordonnées')}</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={tr('Nom complet')}>
              <input name="name" required maxLength={120} defaultValue={profile?.name} className={inputClass} />
            </Field>
            <Field label={tr('Titre / poste')}>
              <input name="role" required maxLength={120} defaultValue={profile?.role} placeholder={tr('ex. Approvisionneur, Magasinier, Chef de quart…')} className={inputClass} />
            </Field>
            <Field label={tr('Téléphone')}>
              <input name="phone" type="tel" maxLength={30} defaultValue={profile?.phone ?? ''} placeholder="06 00 00 00 00" className={inputClass} />
            </Field>
            <Field label={tr('Adresse e-mail')}>
              <input name="email" type="email" maxLength={160} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={tr('ex. prenom.nom@jesagroup.com')} className={inputClass} />
            </Field>
            <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 sm:col-span-2">
              {tr("Société (d'après l'adresse e-mail) :")}
              {organization ? (
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${ORGANIZATION_BADGE[organization]}`}>{organization}</span>
              ) : (
                <span className="font-semibold text-gray-700 dark:text-gray-300">{email.includes('@') ? tr('non reconnue (ni JESA ni OCP)') : tr('saisissez une adresse @jesagroup.com ou @ocpgroup.ma')}</span>
              )}
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{tr("Droits d'accès")}</h4>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-jesa-light/40 bg-jesa-light/10 p-3">
            <input type="checkbox" checked={admin} onChange={() => setAdmin((a) => !a)} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#003088]" />
            <span>
              <strong className="flex items-center gap-1.5 text-gray-900 dark:text-white">
                <ShieldCheck className="h-3.5 w-3.5 text-jesa-light" /> {tr('Administrateur')}
              </strong>
              <span className="block text-[11px] text-gray-500 dark:text-gray-400">{tr('Voit et modifie toutes les rubriques, et peut valider les comptages, créer les références et modifier les paramètres.')}</span>
            </span>
          </label>

          <div className={`overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 ${admin ? 'pointer-events-none opacity-50' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-100 px-3 py-2 dark:bg-navy-dark">
              <span className="font-bold text-gray-700 dark:text-gray-300">{tr('Rubrique')}</span>
              <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                {tr('Tout mettre sur :')}
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setAll(l.value)}
                    title={tr(l.label)}
                    aria-label={tr(l.label)}
                    className="flex h-6 w-10 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-200 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-navy"
                  >
                    <l.icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </span>
            </div>
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {SECTIONS.map((s) => {
                const current = admin ? 'edit' : access[s.href];
                return (
                  <li key={s.href} className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5">
                    <span className={`flex items-center gap-2 font-semibold ${current === 'none' ? 'text-gray-400 line-through dark:text-gray-600' : 'text-gray-800 dark:text-gray-200'}`}>
                      <s.icon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" /> {tr(s.label)}
                    </span>
                    <span className="flex gap-0.5 rounded-lg bg-gray-200 p-0.5 dark:bg-navy-dark" role="radiogroup" aria-label={tr(s.label)}>
                      {LEVELS.map((l) => (
                        <button
                          key={l.value}
                          type="button"
                          role="radio"
                          aria-checked={current === l.value}
                          disabled={admin}
                          onClick={() => setAccess((a) => ({ ...a, [s.href]: l.value }))}
                          title={tr(l.label)}
                          aria-label={tr(l.label)}
                          className={`flex h-7 w-10 items-center justify-center rounded-md transition ${
                            current === l.value ? l.on : 'text-gray-500 hover:bg-gray-300 dark:text-gray-500 dark:hover:bg-navy'
                          }`}
                        >
                          <l.icon className="h-4 w-4" />
                        </button>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <FormError message={error} />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
          <span>{profile && <ConfirmButton deletePath={`/profiles/${profile.id}`} label={tr('Supprimer cette personne')} confirmLabel={tr('Confirmer la suppression ?')} />}</span>
          <span className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-300 px-4 py-1.5 font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-navy-dark">
              {tr('Annuler')}
            </button>
            <button disabled={pending} className="flex items-center gap-1.5 rounded-xl bg-jesa px-4 py-1.5 font-bold text-white shadow hover:bg-jesa-dark disabled:opacity-60">
              <Save className="h-3.5 w-3.5" /> {pending ? tr('Enregistrement…') : profile ? tr('Enregistrer') : tr('Ajouter la personne')}
            </button>
          </span>
        </div>
      </form>
    </Modal>
  );
}

/** Matrice des droits : une carte par personne, niveau d'accès par rubrique en pictogrammes ; ajout et modification dans une fenêtre */
export function ProfilesManager({ profiles: views }: { profiles: ProfileView[] }) {
  const tr = useT();
  const profiles = toProfiles(views);
  /** Fenêtre ouverte : identifiant de la personne, « new » pour l'ajout, ou rien */
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const edited = typeof editing === 'number' ? profiles.find((p) => p.id === editing) : undefined;
  /** Cartes dépliées : les accès d'une personne ne s'affichent qu'après un clic sur sa carte */
  const [opened, setOpened] = useState<number[]>([]);
  const toggle = (id: number) => setOpened((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300">
          {LEVELS.map((l) => (
            <span key={l.value} className="flex items-center gap-1.5">
              <span className={`flex h-6 w-6 items-center justify-center rounded-md ${l.cell}`}>
                <l.icon className="h-3.5 w-3.5" />
              </span>
              <strong>{tr(l.label)}</strong>
              <span className="text-gray-500 dark:text-gray-400">
                {l.value === 'edit' ? tr('consulter et modifier') : l.value === 'view' ? tr('consulter sans modifier') : tr('rubrique absente du menu')}
              </span>
            </span>
          ))}
        </div>
        <button onClick={() => setEditing('new')} className="flex items-center gap-1.5 rounded-xl bg-jesa px-3 py-1.5 text-xs font-bold text-white shadow transition hover:bg-jesa-dark">
          <UserPlus className="h-4 w-4" /> {tr('Ajouter une personne')}
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => {
          const open = opened.includes(p.id);
          return (
          <div key={p.id} className={`rounded-xl border bg-gray-50 transition dark:bg-navy-dark ${open ? 'border-jesa-light' : p.admin ? 'border-jesa/50' : 'border-gray-200 dark:border-gray-800'}`}>
            {/* En-tête cliquable : déplie ou replie les accès de la personne */}
            <div
              role="button"
              tabIndex={0}
              aria-expanded={open}
              onClick={() => toggle(p.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle(p.id))}
              className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 rounded-xl p-4 transition hover:bg-gray-100 dark:hover:bg-navy/60"
            >
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${p.avatarClass}`}>{p.initials}</div>
              <div className="min-w-0 flex-1">
                <h4 className="break-words text-xs font-bold text-gray-900 dark:text-white">{p.name}</h4>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(p.id);
                }}
                className="flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-jesa-light hover:bg-jesa-light/15"
              >
                <Pencil className="h-3 w-3" /> {tr('Modifier')}
              </button>
              <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
              <div className="min-w-0 basis-full">
                <span className="flex flex-wrap items-center gap-1.5">
                  {organizationOf(p.email) && (
                    <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${ORGANIZATION_BADGE[organizationOf(p.email) as 'JESA' | 'OCP']}`} title={tr("Société (d'après l'adresse e-mail) :")}>
                      {organizationOf(p.email)}
                    </span>
                  )}
                  <span className={`inline-block min-w-0 break-words rounded px-2 py-0.5 text-[10px] ${p.badgeClass}`}>{tr(p.role)}</span>
                </span>
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
                  <Phone className="h-3 w-3 flex-shrink-0 text-gray-400" /> {p.phone ?? <span className="text-gray-400 dark:text-gray-500">{tr('Téléphone non renseigné')}</span>}
                </p>
                <p className="mt-0.5 flex min-w-0 items-start gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
                  <Mail className="mt-0.5 h-3 w-3 flex-shrink-0 text-gray-400" />
                  {p.email ? (
                    <a href={`mailto:${p.email}`} onClick={(e) => e.stopPropagation()} className="min-w-0 break-words hover:text-jesa-light hover:underline">
                      {p.email}
                    </a>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">{tr('E-mail non renseigné')}</span>
                  )}
                </p>
              </div>
            </div>
            {open && (
            <div className="space-y-1.5 border-t border-gray-200 px-4 pb-4 pt-3 text-[11px] dark:border-gray-800">
              {p.admin && (
                <p className="flex items-center gap-1.5 font-bold text-jesa-light">
                  <ShieldCheck className="h-3.5 w-3.5" /> {tr('Administrateur : accès complet')}
                </p>
              )}
              <ul className="space-y-1 pt-1 text-gray-700 dark:text-gray-300">
                {SECTIONS.map((s) => {
                  const level = levelOf(accessOf(p, s.href));
                  return (
                    <li key={s.href} className="flex items-center justify-between gap-2">
                      <span className={level.value === 'none' ? 'text-gray-400 line-through dark:text-gray-600' : ''}>{tr(s.label)}</span>
                      <span className={`flex h-6 w-8 flex-shrink-0 items-center justify-center rounded-md ${level.cell}`} role="img" aria-label={tr(level.label)} title={tr(level.label)}>
                        <level.icon className="h-3.5 w-3.5" />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            )}
          </div>
          );
        })}
      </div>

      {editing === 'new' && <ProfileModal onClose={() => setEditing(null)} />}
      {edited && <ProfileModal key={edited.id} profile={edited} onClose={() => setEditing(null)} />}
    </div>
  );
}

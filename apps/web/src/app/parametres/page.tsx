import { BadgeCheck, BellRing, Building2, CalendarDays, Monitor, ShieldCheck, SunMoon, Truck } from 'lucide-react';
import { HabilitationTypesManager } from '@/components/personnel/HabilitationTypesManager';
import { ProfilesManager } from '@/components/personnel/ProfilesManager';
import { SettingsForm } from '@/components/forms/SettingsForm';
import { LanguageSelector } from '@/components/layout/LanguageSelector';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { SettingsGroup } from '@/components/ui/SettingsGroup';
import { PageHeader } from '@/components/ui/PageHeader';
import { api } from '@/lib/api';
import { getT } from '@/lib/i18n/server';

export default async function ParametresPage() {
  const tr = await getT();
  const [settings, habilitationTypes, profiles] = await Promise.all([api.settings(), api.habilitationTypes(), api.profiles()]);

  return (
    <div className="space-y-3">
      <PageHeader
        title={tr("Paramètres Système & Matrice des Droits d'Accès")}
        subtitle={tr('Cliquez sur une rubrique pour la développer et modifier ses réglages.')}
      />

      <SettingsGroup icon={Monitor} title={tr('Affichage')} description={tr("Langue et thème de l'application sur cet appareil.")}>
        <LanguageSelector />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <SunMoon className="h-4 w-4 text-jesa-light" /> {tr("Thème d'affichage")}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{tr('Mode clair (soleil) ou mode sombre (lune), mémorisé sur cet appareil.')}</p>
          </div>
          <ThemeToggle />
        </div>
      </SettingsGroup>

      <SettingsGroup icon={Building2} title={tr('Identité du site')} description={tr("Titre et nom du site affichés dans l'en-tête de l'application.")} badge={tr('{0} réglage(s)', 2)}>
        <SettingsForm settings={settings} section="site" />
      </SettingsGroup>

      <SettingsGroup
        icon={BellRing}
        title={tr('Réglages des alertes')}
        description={tr("Seuils à partir desquels l'application prévient : habilitations, stock, engins.")}
        badge={tr('{0} réglage(s)', 4)}
      >
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          {tr("Seuils à partir desquels l'application prévient (notifications, tableau de bord, pastilles de statut). Ils s'appliquent dès l'enregistrement.")}
        </p>
        <SettingsForm settings={settings} section="alerts" />
      </SettingsGroup>

      <SettingsGroup icon={Truck} title={tr('Parc engins')} description={tr("Valeurs proposées à l'ajout d'un engin.")} badge={tr('{0} réglage(s)', 1)}>
        <SettingsForm settings={settings} section="engins" />
      </SettingsGroup>

      <SettingsGroup icon={CalendarDays} title={tr('Planning des postes')} description={tr('Valeurs proposées pour la rotation des magasiniers.')} badge={tr('{0} réglage(s)', 1)}>
        <SettingsForm settings={settings} section="planning" />
      </SettingsGroup>

      <SettingsGroup
        icon={BadgeCheck}
        title={tr("Types d'habilitation des magasiniers")}
        description={tr("Catalogue utilisé dans les fiches magasiniers et pour les engins.")}
        badge={tr('{0} type(s)', habilitationTypes.length)}
      >
        <HabilitationTypesManager types={habilitationTypes} />
      </SettingsGroup>

      <SettingsGroup
        icon={ShieldCheck}
        title={tr("Matrice Détaillée des Droits d'Accès et Visibilité Web App")}
        description={tr('Personnes, titres et rubriques que chacune peut voir.')}
        badge={`${profiles.length} ${tr('Utilisateurs Référencés')}`}
      >
        <ProfilesManager profiles={profiles} />
      </SettingsGroup>
    </div>
  );
}

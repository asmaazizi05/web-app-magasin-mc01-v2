'use client';

import { BadgeCheck, CalendarDays, type LucideIcon, Package, Save, Truck, Type } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import { api } from '@/lib/api';
import type { Settings, UpdateSettingsInput } from '@/lib/types';
import { FormError, inputClass } from '../ui/Field';
import { useSubmit } from './useSubmit';
import { useT } from '@/lib/i18n';

/** Rubriques de réglages enregistrées dans la base (une par formulaire) */
export type SettingsSection = 'site' | 'alerts' | 'engins' | 'planning';

/** Un réglage : libellé, explication de l'effet, valeur et unité */
function Setting({ icon: Icon, title, help, unit, wide, children }: { icon: LucideIcon; title: string; help: string; unit?: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3 last:border-0 last:pb-0 dark:border-gray-800">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white">
          <Icon className="h-4 w-4 flex-shrink-0 text-jesa-light" /> {title}
        </p>
        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{help}</p>
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
        <span className={wide ? 'w-56' : 'w-24'}>{children}</span>
        {!wide && <span className="w-14">{unit}</span>}
      </label>
    </div>
  );
}

const num = (f: FormData, name: string) => Number(f.get(name));
const text = (f: FormData, name: string) => String(f.get(name)).trim();

/** Formulaire d'une rubrique de réglages ; seuls les réglages de la rubrique sont envoyés */
export function SettingsForm({ settings, section }: { settings: Settings; section: SettingsSection }) {
  const tr = useT();
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useSubmit(() => setSaved(true));

  const read = (f: FormData): UpdateSettingsInput => {
    switch (section) {
      case 'site':
        return { appTitle: text(f, 'appTitle'), siteLabel: text(f, 'siteLabel') };
      case 'alerts':
        return {
          habilitationAlertDays: num(f, 'habilitationAlertDays'),
          stockLimitMarginPct: num(f, 'stockLimitMarginPct'),
          enginAlertDays: num(f, 'enginAlertDays'),
          enginAlertHours: num(f, 'enginAlertHours'),
        };
      case 'engins':
        return { enginInspectionMonths: num(f, 'enginInspectionMonths') };
      case 'planning':
        return { rotationExtendWeeks: num(f, 'rotationExtendWeeks') };
    }
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaved(false);
    const body = read(new FormData(e.currentTarget));
    void run(() => api.updateSettings(body));
  };

  return (
    <form onSubmit={submit} onChange={() => setSaved(false)} className="space-y-3">
      {section === 'site' && (
        <>
          <Setting icon={Type} title={tr("Titre de l'application")} help={tr("Affiché en haut de toutes les pages, à côté du logo.")} wide>
            <input name="appTitle" maxLength={60} defaultValue={settings.appTitle} required className={inputClass} />
          </Setting>
          <Setting icon={Type} title={tr('Nom du site')} help={tr('Affiché en bleu après le titre (ex. « MC01 Benguerir »).')} wide>
            <input name="siteLabel" maxLength={40} defaultValue={settings.siteLabel} required className={inputClass} />
          </Setting>
        </>
      )}
      {section === 'alerts' && (
        <>
          <Setting
            icon={BadgeCheck}
            title={tr('Alerte habilitations : jours avant expiration')}
            help={tr("Une habilitation passe « Expire bientôt » et apparaît dans les notifications ce nombre de jours avant sa date d'expiration.")}
            unit={tr('jours')}
          >
            <input name="habilitationAlertDays" type="number" min={1} max={365} defaultValue={settings.habilitationAlertDays} required className={inputClass} />
          </Setting>
          <Setting
            icon={Package}
            title={tr('Alerte stock : marge au-dessus du stock minimum')}
            help={tr("Un article passe « Limite Approche » quand son stock est à moins de ce pourcentage au-dessus de son stock minimum (ex. 25 % : minimum 100 → alerte sous 125). Sous le minimum, il est toujours en alerte critique.")}
            unit="%"
          >
            <input name="stockLimitMarginPct" type="number" min={0} max={200} defaultValue={settings.stockLimitMarginPct} required className={inputClass} />
          </Setting>
          <Setting
            icon={Truck}
            title={tr('Alerte engins : jours avant une échéance')}
            help={tr("Un entretien, un contrôle périodique ou une fin de location passe « À prévoir » ce nombre de jours avant la date prévue.")}
            unit={tr('jours')}
          >
            <input name="enginAlertDays" type="number" min={1} max={180} defaultValue={settings.enginAlertDays} required className={inputClass} />
          </Setting>
          <Setting
            icon={Truck}
            title={tr('Alerte engins : heures de compteur avant un entretien')}
            help={tr("Un entretien prévu au compteur passe « À prévoir » quand il reste moins de ce nombre d'heures de fonctionnement.")}
            unit={tr('heures')}
          >
            <input name="enginAlertHours" type="number" min={1} max={500} defaultValue={settings.enginAlertHours} required className={inputClass} />
          </Setting>
        </>
      )}
      {section === 'engins' && (
        <Setting
          icon={Truck}
          title={tr('Contrôle périodique par défaut')}
          help={tr("Intervalle proposé dans « Ajouter un engin ». Il reste modifiable sur chaque fiche ; les engins déjà enregistrés gardent le leur.")}
          unit={tr('mois')}
        >
          <input name="enginInspectionMonths" type="number" min={1} max={60} defaultValue={settings.enginInspectionMonths} required className={inputClass} />
        </Setting>
      )}
      {section === 'planning' && (
        <Setting
          icon={CalendarDays}
          title={tr('Semaines ajoutées par « Prolonger la rotation »')}
          help={tr('Nombre de semaines proposé quand vous prolongez le planning des postes. Il reste modifiable au moment de générer.')}
          unit={tr('semaines')}
        >
          <select name="rotationExtendWeeks" defaultValue={settings.rotationExtendWeeks} className={inputClass}>
            {[1, 2, 3, 4, 5, 6, 8, 12].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Setting>
      )}
      <FormError message={error} />
      <div className="flex items-center gap-3 pt-1">
        <button disabled={pending} className="flex items-center gap-1.5 rounded-xl bg-jesa px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-jesa-dark disabled:opacity-60">
          <Save className="h-3.5 w-3.5" /> {pending ? tr('Enregistrement…') : tr('Enregistrer')}
        </button>
        {saved && <span className="text-xs font-semibold text-jesa-light">{tr('Paramètres enregistrés.')}</span>}
      </div>
    </form>
  );
}

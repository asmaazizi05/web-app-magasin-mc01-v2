/**
 * Seuils d'alerte réglables dans « Paramètres & Droits » (table Settings).
 * Chargés au démarrage et après chaque enregistrement par SettingsService ; les valeurs ci-dessous sont les défauts.
 */
export const alertConfig = {
  /** Stock : marge au-dessus du stock minimum signalée « Limite Approche » (en %) */
  stockLimitMarginPct: 25,
  /** Engins : échéance signalée « bientôt » à moins de N jours… */
  enginAlertDays: 30,
  /** … ou à moins de N heures de compteur */
  enginAlertHours: 25,
};

export function applyAlertConfig(s: Partial<typeof alertConfig>): void {
  if (s.stockLimitMarginPct !== undefined) alertConfig.stockLimitMarginPct = s.stockLimitMarginPct;
  if (s.enginAlertDays !== undefined) alertConfig.enginAlertDays = s.enginAlertDays;
  if (s.enginAlertHours !== undefined) alertConfig.enginAlertHours = s.enginAlertHours;
}

const TZ = 'Africa/Casablanca';

const intFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const decFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

export const fmtInt = (n: number): string => intFmt.format(n);
export const fmtDec = (n: number): string => decFmt.format(n);
export const fmtDH = (n: number): string => `${intFmt.format(n)} DH`;
export const fmtUnits = (n: number): string => `${intFmt.format(n)} ${Math.abs(n) > 1 ? 'units' : 'unit'}`;
export const fmtPct = (n: number, digits = 1): string =>
  `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)}%`;

export const fmtDate = (iso: string): string =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));

export const fmtDayMonth = (iso: string): string =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: '2-digit', month: '2-digit' }).format(new Date(iso));

export const fmtTime = (iso: string): string =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

/** `locale` : « en-GB » quand l'affichage est en anglais */
export const fmtMonthYear = (d: Date, locale = 'fr-FR'): string => {
  const s = new Intl.DateTimeFormat(locale, { timeZone: TZ, month: 'long', year: 'numeric' }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Heure locale du site (minutes depuis minuit) */
export function siteMinutesNow(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

export function siteYearMonth(now: Date = new Date()): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).formatToParts(now);
  return {
    year: Number(parts.find((p) => p.type === 'year')?.value),
    month: Number(parts.find((p) => p.type === 'month')?.value),
  };
}

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

/** Jour calendaire « YYYY-MM-DD » (colonnes date sans heure) → « 05/10/2026 », sans conversion de fuseau */
export const fmtDay = (day: string): string => day.split('-').reverse().join('/');

/** « YYYY-MM-DD » → « 05/10 » */
export const fmtDayShort = (day: string): string => day.split('-').reverse().slice(0, 2).join('/');

/** Date du jour sur le site (« YYYY-MM-DD ») */
export const siteToday = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

/** Jour calendaire sur le site (« YYYY-MM-DD ») d'un instant ISO */
export const siteDayOf = (iso: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));

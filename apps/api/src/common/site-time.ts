/** Fuseau horaire du site (Maroc). La base tz d'ICU fait foi pour le décalage (UTC+0 ou UTC+1 selon la période). */
export const SITE_TZ = 'Africa/Casablanca';

/** Décalage UTC (minutes) du fuseau du site à un instant donné. */
export function siteOffsetMinutes(instant: Date): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: SITE_TZ, timeZoneName: 'longOffset' })
    .formatToParts(instant)
    .find((p) => p.type === 'timeZoneName')?.value;
  const m = name?.match(/GMT([+-])(\d{2}):(\d{2})/);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

/** Date + heure locales du site (« 2026-10-04 », « 09:15[:30] ») → instant UTC. */
export function siteDateTime(date: string, time: string): Date {
  const hhmmss = time.length === 5 ? `${time}:00` : time;
  const asUtc = new Date(`${date}T${hhmmss}Z`);
  return new Date(asUtc.getTime() - siteOffsetMinutes(asUtc) * 60_000);
}

/** Date du jour sur le site, au format « YYYY-MM-DD ». */
export function siteToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SITE_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** « YYYY-MM-DD » → Date à minuit UTC (convention des colonnes `@db.Date`). */
export const dayToDate = (day: string): Date => new Date(`${day}T00:00:00Z`);

/** Date `@db.Date` → « YYYY-MM-DD ». */
export const dateToDay = (d: Date): string => d.toISOString().slice(0, 10);

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

export function addMonths(d: Date, months: number): Date {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + months);
  return r;
}

/** Lundi (minuit UTC) de la semaine contenant ce jour. */
export function mondayOf(day: Date): Date {
  const dow = (day.getUTCDay() + 6) % 7; // 0 = lundi
  return addDays(dayToDate(dateToDay(day)), -dow);
}

/** Lundi de la semaine en cours sur le site. */
export const currentWeekStart = (): Date => mondayOf(dayToDate(siteToday()));

/** Numéro de semaine ISO 8601. */
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

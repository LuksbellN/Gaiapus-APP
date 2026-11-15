// Number and date presentation of a report, bound to an explicit locale and display profile. Nothing here reads a
// global "active" language, so a report being exported while the interface changes language keeps its own.
// Canonical values stay numbers in the facts; rounding happens only here, with one precision per unit everywhere.
import type { ReportDisplayProfile, ReportLocale } from '@gaiapus/contracts';

// English uses day-month-year dates and no US-specific convention: the language implies no currency or unit system.
const INTL_TAG: Readonly<Record<ReportLocale, string>> = { 'pt-BR': 'pt-BR', en: 'en-GB', es: 'es', fr: 'fr', de: 'de' };
export const PRECISION = { mm: 1, days: 1, kg_ha: 0, percent: 1 } as const;

export type ReportFormatters = ReturnType<typeof createReportFormatters>;

export function createReportFormatters(locale: ReportLocale, profile: ReportDisplayProfile) {
  const tag = INTL_TAG[locale];
  const numbers = new Map<number, Intl.NumberFormat>();
  const nf = (digits: number) => { let f = numbers.get(digits); if (!f) { f = new Intl.NumberFormat(tag, { minimumFractionDigits: digits, maximumFractionDigits: digits }); numbers.set(digits, f); } return f; };
  /**
   * Fixed decimals. A non-zero value that would round to zero is never shown as zero: it is shown as below the
   * displayed precision ("<0.1"), so a small positive deficit is not read as "no deficit".
   */
  const fixed = (value: number, digits: number): string => {
    if (!Number.isFinite(value)) return '—';
    const step = 10 ** -digits;
    if (value !== 0 && Math.abs(value) < step / 2) return value > 0 ? `<${nf(digits).format(step)}` : `>${nf(digits).format(-step)}`;
    return nf(digits).format(value === 0 ? 0 : value);
  };
  const percentFormat = new Intl.NumberFormat(tag, { style: 'percent', minimumFractionDigits: PRECISION.percent, maximumFractionDigits: PRECISION.percent });
  const wholePercent = new Intl.NumberFormat(tag, { style: 'percent', maximumFractionDigits: 0 });
  const day = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const month = new Intl.DateTimeFormat(tag, { month: 'short', year: '2-digit', timeZone: 'UTC' });
  const instant = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: profile.time_zone, timeZoneName: 'short' });
  const conjunction = new Intl.ListFormat(tag, { style: 'long', type: 'conjunction' });
  const generic = new Intl.NumberFormat(tag, { maximumFractionDigits: 3 });
  const plain = new Intl.NumberFormat(tag, { useGrouping: false, maximumFractionDigits: 0 });
  const asDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return {
    locale, timeZone: profile.time_zone,
    mm: (v: number) => fixed(v, PRECISION.mm),
    days: (v: number) => fixed(v, PRECISION.days),
    kgHa: (v: number) => fixed(v, PRECISION.kg_ha),
    byUnit: (v: number, unit: 'mm' | 'days' | 'kg_ha') => fixed(v, PRECISION[unit]),
    /** True when the value is shown as below the displayed precision. */
    belowPrecision: (v: number, unit: 'mm' | 'days' | 'kg_ha') => v !== 0 && Math.abs(v) < 10 ** -PRECISION[unit] / 2,
    /** A value without a registered unit: shown as published, up to three decimals. */
    generic: (v: number) => (Number.isFinite(v) ? generic.format(v) : '—'),
    count: (v: number) => nf(0).format(v),
    year: (v: number) => plain.format(v),
    /** Share of the scenarios, one decimal; a positive share below 0.05% is shown as below the precision. */
    percent: (share: number) => (share > 0 && share < 0.0005 ? `<${percentFormat.format(0.001)}` : percentFormat.format(share)),
    fraction: (v: number) => wholePercent.format(v),
    /** Calendar date (YYYY-MM-DD): formatted in UTC, never shifted by a time zone. */
    date: (iso: string) => day.format(asDay(iso)),
    monthLabel: (iso: string) => month.format(asDay(iso)),
    /** Instant: shown in the display time zone, with the zone named. */
    instant: (iso: string) => instant.format(new Date(iso)),
    list: (items: string[]) => conjunction.format(items),
    /** Consecutive years as a range ("2017–2021"); otherwise a list. */
    years: (values: readonly number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      if (sorted.length > 1 && sorted.every((y, i) => i === 0 || y === sorted[i - 1]! + 1)) return `${plain.format(sorted[0]!)}–${plain.format(sorted.at(-1)!)}`;
      return conjunction.format(sorted.map(y => plain.format(y)));
    },
  };
}

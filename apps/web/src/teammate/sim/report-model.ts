// Address and identity of a technical report on the screen. The report is the canonical document of a run and an
// explicit scope: the day under the cursor, the climate trajectory, the camera, the zoom and the theme are not part of it.
import type { ReportScope } from '@gaiapus/contracts';
import type { Locale } from '../i18n/locale';

const RUN_ID = /^sim_[0-9a-f]{24}$/;
const REPORT_ID = /^rep_[0-9a-f]{32}$/;
const CROP_ID = /^[a-z0-9_]{2,32}$/;
export type ReportSeason = { crop_id: string; harvest_year: number };

/** Run named in the address (?run=), only when it is a well-formed run id. */
export function reportRunOf(params: URLSearchParams): string | null {
  const run = params.get('run');
  return run && RUN_ID.test(run) ? run : null;
}
/** A saved representation named in the address (?rel=), only when well formed. */
export function reportIdOf(params: URLSearchParams): string | null {
  const id = params.get('rel');
  return id && REPORT_ID.test(id) ? id : null;
}
/** The crop season the person came from (?cultura=&safra=): it only offers the "selected season" scope. */
export function reportSeasonOf(params: URLSearchParams): ReportSeason | null {
  const crop = params.get('cultura'), year = params.get('safra');
  return crop && CROP_ID.test(crop) && year && /^20\d{2}$/.test(year) ? { crop_id: crop, harvest_year: Number(year) } : null;
}
/** Whole run unless the season scope was chosen explicitly (?escopo=safra) for a valid season. */
export function reportScopeOf(params: URLSearchParams): ReportScope {
  const season = reportSeasonOf(params);
  return params.get('escopo') === 'safra' && season ? { kind: 'season', ...season } : { kind: 'run' };
}
export const scopeKey = (scope: ReportScope) => (scope.kind === 'run' ? 'run' : `season:${scope.crop_id}:${scope.harvest_year}`);
/** Identity of one request: a late answer for another key is never shown. */
export const reportRequestKey = (runId: string, scope: ReportScope, locale: Locale) => `${runId}|${scopeKey(scope)}|${locale}`;

const LOCATION = /^(BR:ibge:\d{7}|US:fips:\d{5})$/;
/** Place of the simulation the person came from (?local=): only used to link back to it. */
export function reportPlaceOf(params: URLSearchParams): string | null {
  const local = params.get('local');
  return local && LOCATION.test(local) ? local : null;
}

export interface ReportAddress { run: string; season?: ReportSeason | null; scope?: 'run' | 'season'; reportId?: string | null; local?: string | null }
/** Route and query of the report page (used with the router and, prefixed by #, in plain links). */
export function reportPath({ run, season, scope = 'run', reportId, local }: ReportAddress): string {
  const query = [`run=${run}`, ...(local ? [`local=${local}`] : []), ...(season ? [`cultura=${encodeURIComponent(season.crop_id)}`, `safra=${season.harvest_year}`] : []), ...(scope === 'season' && season ? ['escopo=safra'] : []), ...(reportId ? [`rel=${reportId}`] : [])];
  return `/relatorio?${query.join('&')}`;
}
export const reportHref = (address: ReportAddress) => `#${reportPath(address)}`;
/** Back to the season planning the report came from (place, crop and harvest year when the address has them). */
export function simulationHref(params: URLSearchParams): string {
  const local = reportPlaceOf(params), season = reportSeasonOf(params);
  return `#/simulador?modo=planejamento${local ? `&local=${local}` : ''}${local && season ? `&cultura=${encodeURIComponent(season.crop_id)}&safra=${season.harvest_year}` : ''}`;
}

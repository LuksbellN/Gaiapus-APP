import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { FC } from '../adapters';
import type { LocationSummary } from '../adapters/locations';
import { countiesInState, US_COUNTIES_SOURCE, US_STATES_SOURCE } from '../geo/usStates';
import { norm, byName } from '../format';
import { useI18n } from '../i18n';
import { usStatesCopy } from '../i18n/usStates';
import { ErrorState, Loading, Notice, Pill } from './index';

type Props = {
  states: FC | null; stateCode: string | null; items: LocationSummary[];
  loading: boolean; error: unknown; retry: () => void;
  locationsLoading: boolean; locationsError: unknown; retryLocations: () => void;
  onPick: (code: string) => void;
  /** County boundaries of the selected state (all counties); null while not loaded. */
  counties?: FC | null; countyCode?: string | null; onPickCounty?: (code: string) => void;
  /** Location ids with published data beyond the location cores (e.g. the simulation catalogue). */
  extraCovered?: string[];
};
export function USStatesPanel(p: Props) {
  const { t, locale } = useI18n(); const copy = usStatesCopy[locale];
  const [filter, setFilter] = useState(''); const [countyFilter, setCountyFilter] = useState('');
  if (p.error) return <ErrorState error={p.error} onRetry={p.retry} />;
  if (p.loading || !p.states) return <Loading label={t('explore.loadingStates')} rows={5} />;
  const selected = p.states.features.find(f => f.properties.code === p.stateCode);
  const counties = countiesInState(p.items, p.stateCode);
  const covered = new Set(countiesInState(p.items, null).map(l => l.admin1_code));
  const query = norm(filter);
  const states = p.states.features.filter(f => norm(`${f.properties.name} ${f.properties.sigla} ${f.properties.code}`).includes(query))
    .sort((a, b) => Number(covered.has(b.properties.code)) - Number(covered.has(a.properties.code)) || byName(a.properties.name, b.properties.name));
  return <div className="stack-2" data-testid="us-state-panel">
    {!p.stateCode && <>
      <h2>{copy.states}</h2>
      <label className="sr-only" htmlFor="us-state-filter">{copy.filter}</label>
      <input id="us-state-filter" className="input" value={filter} onChange={e => setFilter(e.target.value)} placeholder={copy.filter} />
      <ul className="list list--long" aria-label={copy.states} data-testid="us-state-list">{states.map(f => <li key={f.properties.code}>
        <button onClick={() => p.onPick(f.properties.code)}><span>{f.properties.name} <span className="meta-13">{f.properties.sigla}</span></span>{covered.has(f.properties.code) ? <Pill tone="water">{t('explore.withDataPill')}</Pill> : <ChevronRight size={18} aria-hidden />}</button>
      </li>)}</ul>
      {!states.length && <Notice>{copy.unknown}</Notice>}
    </>}
    {p.stateCode && !selected && <Notice tone="warn">{copy.unknown}</Notice>}
    {p.stateCode && p.counties && (() => {
      // Every county of the state, like every municipality of a Brazilian state: published ones first, the rest selectable.
      // Three different things: every county has a boundary; some have a published data core; some have published scenario runs.
      const core = new Set(counties.map(l => l.id)); const sims = new Set(p.extraCovered ?? []);
      const withData = new Set([...core, ...sims]); const rank = (code: string) => (core.has(code) ? 0 : sims.has(code) ? 1 : 2);
      const name = (id: string) => counties.find(l => l.id === id)?.name ?? p.counties!.features.find(f => f.properties.code === id)?.properties.name ?? id;
      const all = p.counties.features.map(f => ({ code: String(f.properties.code), name: String(f.properties.name), fips: String(f.properties.code).slice(-5) }))
        .filter(c => norm(`${c.name} ${c.fips}`).includes(norm(countyFilter)))
        .sort((a, b) => rank(a.code) - rank(b.code) || byName(a.name, b.name));
      const sel = p.countyCode ? p.counties.features.find(f => f.properties.code === p.countyCode) : undefined;
      return <>
        {sel && <div className="card card--flat" data-testid="us-county-detail"><h3>{name(String(sel.properties.code))}</h3>
          <p className="meta-13">{t('location.code', { scheme: 'FIPS', code: String(sel.properties.code).slice(-5) })}</p>
          <ul className="plain meta-13"><li>{copy.geoLine}</li><li>{core.has(String(sel.properties.code)) ? copy.dataYes : copy.dataNo}</li><li>{sims.has(String(sel.properties.code)) ? copy.simYes : copy.simNo}</li></ul>
          {core.has(String(sel.properties.code))
            ? <a className="btn btn--primary btn--sm" href={`#/municipio?id=${encodeURIComponent(String(sel.properties.code))}`}>{copy.countyOpen}</a>
            : !sims.has(String(sel.properties.code)) && <Notice>{copy.countyNone}</Notice>}
          <p className="meta-13">{copy.notValidated}</p>
        </div>}
        <h3>{copy.countiesAll} ({p.counties.features.length})</h3>
        <label className="sr-only" htmlFor="us-county-filter">{copy.countySearch}</label>
        <input id="us-county-filter" className="input" value={countyFilter} onChange={e => setCountyFilter(e.target.value)} placeholder={copy.countySearch} aria-label={copy.countySearch} />
        <ul className="list list--long" aria-label={copy.countiesAll} data-testid="us-county-list">{all.map(c => <li key={c.code}>
          <button aria-current={p.countyCode === c.code} onClick={() => p.onPickCounty?.(c.code)}><span>{withData.has(c.code) ? <b>{name(c.code)}</b> : c.name} <span className="meta-13">{c.fips}</span></span>{core.has(c.code) || sims.has(c.code) ? <span className="row" style={{ gap: 4 }}>{core.has(c.code) && <Pill tone="water">{copy.pillData}</Pill>}{sims.has(c.code) && <Pill>{copy.pillScenarios}</Pill>}</span> : <ChevronRight size={18} aria-hidden />}</button>
        </li>)}</ul>
        <p className="meta-13" data-testid="us-county-source" title={US_COUNTIES_SOURCE}>{copy.countySource}</p>
      </>;
    })()}
    <p className="meta-13">{copy.scope}</p>
    {p.locationsError ? <Notice tone="warn">{copy.failed} <button className="btn btn--sm" onClick={p.retryLocations}>{t('common.retry')}</button></Notice>
      : p.locationsLoading ? <Loading label={copy.counties} rows={2} />
      : counties.length ? <div className="stack-2" data-testid="abroad-list"><h3>{copy.counties}</h3><ul className="list">{counties.map(l => <li key={l.id}>
        <a href={`#/municipio?id=${encodeURIComponent(l.id)}`}><span><b>{l.name}</b>, {l.admin1_name}<br /><span className="meta-13">{t('location.code', { scheme: l.scheme.toUpperCase(), code: l.code })}</span></span><ChevronRight size={18} aria-hidden /></a>
      </li>)}</ul></div> : <Notice>{copy.none}</Notice>}
    <p className="meta-13">{US_STATES_SOURCE}</p>
  </div>;
}

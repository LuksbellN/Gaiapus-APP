import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { FC } from '../adapters';
import type { LocationSummary } from '../adapters/locations';
import { countiesInState, US_STATES_SOURCE } from '../geo/usStates';
import { norm, byName } from '../format';
import { useI18n } from '../i18n';
import { usStatesCopy } from '../i18n/usStates';
import { ErrorState, Loading, Notice, Pill } from './index';

type Props = {
  states: FC | null; stateCode: string | null; items: LocationSummary[];
  loading: boolean; error: unknown; retry: () => void;
  locationsLoading: boolean; locationsError: unknown; retryLocations: () => void;
  onPick: (code: string) => void;
};
export function USStatesPanel(p: Props) {
  const { t, locale } = useI18n(); const copy = usStatesCopy[locale];
  const [filter, setFilter] = useState('');
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
    <p className="meta-13">{copy.scope}</p>
    {p.locationsError ? <Notice tone="warn">{copy.failed} <button className="btn btn--sm" onClick={p.retryLocations}>{t('common.retry')}</button></Notice>
      : p.locationsLoading ? <Loading label={copy.counties} rows={2} />
      : counties.length ? <div className="stack-2" data-testid="abroad-list"><h3>{copy.counties}</h3><ul className="list">{counties.map(l => <li key={l.id}>
        <a href={`#/municipio?id=${encodeURIComponent(l.id)}`}><span><b>{l.name}</b>, {l.admin1_name}<br /><span className="meta-13">{t('location.code', { scheme: l.scheme.toUpperCase(), code: l.code })}</span></span><ChevronRight size={18} aria-hidden /></a>
      </li>)}</ul></div> : <Notice>{copy.none}</Notice>}
    <p className="meta-13">{US_STATES_SOURCE}</p>
  </div>;
}

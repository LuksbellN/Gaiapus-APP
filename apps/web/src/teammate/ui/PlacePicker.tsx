// Place picker for many places in many countries: country → state → place, plus search by name or official code.
// Only places with published data are listed, with counts at each level.
import { useId, useMemo, useState } from 'react';
import { norm } from '../format';
import { useI18n, type MessageKey } from '../i18n';

export type PickItem = { id: string; country: string; admin1: string; name: string; code: string; scheme: string };

const group = <T,>(xs: T[], key: (x: T) => string) => { const m = new Map<string, T[]>(); for (const x of xs) m.set(key(x), [...(m.get(key(x)) ?? []), x]); return m; };
const byLabel = (a: string, b: string) => a.localeCompare(b);

export function PlacePicker({ items, value, onPick }: { items: PickItem[]; value: string | null; onPick: (id: string) => void }) {
  const { t } = useI18n(); const uid = useId();
  const current = items.find((i) => i.id === value) ?? null;
  const [country, setCountry] = useState(current?.country ?? items[0]?.country ?? '');
  const [q, setQ] = useState('');
  const countries = useMemo(() => group(items, (i) => i.country), [items]);
  const states = useMemo(() => group(countries.get(current?.country ?? country) ?? [], (i) => i.admin1), [countries, current, country]);
  const countryLabel = (c: string) => t(`location.country.${c}` as MessageKey);
  const firstOf = (list: PickItem[]) => [...list].sort((a, b) => byLabel(a.name, b.name))[0];
  const found = q.trim().length >= 2 ? items.filter((i) => norm(`${i.name} ${i.admin1} ${i.code}`).includes(norm(q.trim()))).slice(0, 8) : [];
  const shownCountry = current?.country ?? country;
  return <div className="place-picker" role="group" aria-label={t('place.picker')} data-tour="mun-picker">
    <span className="field-inline"><label htmlFor={`${uid}-c`}>{t('place.country')}</label><select id={`${uid}-c`} className="input" value={shownCountry} onChange={(e) => { setCountry(e.target.value); const s = group(countries.get(e.target.value) ?? [], (i) => i.admin1); const st = [...s.keys()].sort(byLabel)[0]; if (st) onPick(firstOf(s.get(st)!).id); }}>
      {[...countries.keys()].sort((a, b) => byLabel(countryLabel(a), countryLabel(b))).map((c) => <option key={c} value={c}>{countryLabel(c)} ({countries.get(c)!.length})</option>)}</select></span>
    <span className="field-inline"><label htmlFor={`${uid}-s`}>{t('place.state')}</label><select id={`${uid}-s`} className="input" value={current?.admin1 ?? ''} onChange={(e) => onPick(firstOf(states.get(e.target.value)!).id)}>
      {!current && <option value="" disabled>—</option>}
      {[...states.keys()].sort(byLabel).map((s) => <option key={s} value={s}>{s} ({states.get(s)!.length})</option>)}</select></span>
    <span className="field-inline"><label htmlFor={`${uid}-p`}>{t('place.place')}</label><select id={`${uid}-p`} className="input" value={current?.id ?? ''} onChange={(e) => onPick(e.target.value)}>
      {!current && <option value="" disabled>—</option>}
      {[...(states.get(current?.admin1 ?? '') ?? [])].sort((a, b) => byLabel(a.name, b.name)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></span>
    <div className="place-picker__search">
      <input className="input" type="search" aria-label={t('place.search')} placeholder={t('place.searchPh')} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck={false} />
      {found.length > 0 && <ul className="list place-picker__results" role="listbox" aria-label={t('place.search')}>{found.map((p) => <li key={p.id}><button type="button" role="option" aria-selected={p.id === value} onClick={() => { setQ(''); onPick(p.id); }}><span><b>{p.name}</b>, {p.admin1} · {countryLabel(p.country)}<br /><span className="meta-13">{p.scheme.toUpperCase()} {p.code}</span></span></button></li>)}</ul>}
      {q.trim().length >= 2 && found.length === 0 && <p className="meta-13" role="status">{t('place.noResult')}</p>}
    </div>
  </div>;
}

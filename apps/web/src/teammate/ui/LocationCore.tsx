// Sections of the location core (Docs/2026-11-14-nucleo-global-lugares-design.md), shared by the place screen.
// They show only what the publication has; every gap says why.
import { useMemo, useState } from 'react';
import { monthlyWeather, type LocationCore } from '../adapters/locations';
import { dDateTime, dFull, dShort, n0, n1, pct } from '../format';
import { useI18n, type MessageKey } from '../i18n';
import { DualChart } from './DualChart';
import { Notice, Pill, Stat } from './index';

type Layers = LocationCore['layers'];
type Unavailable = { status: 'unavailable'; reason_code: string; source?: string };
export const isOff = (l: { status: string }): l is Unavailable => l.status === 'unavailable';
const MONTHS_SHOWN = 36;

export function Scope({ core }: { core: LocationCore }) {
  const { t } = useI18n();
  const crops = core.crops.map((c) => t(`location.crop.${c.crop}` as MessageKey)).join(', ');
  return <section className="scope" data-testid="location-scope" aria-label={t('scope.label')}>
    <p className="scope__line"><span><b>{t('location.scopeData', { place: core.place.name })}</b> · {core.field ? t('location.field', { ha: n0(core.field.area_ha) }) : t('location.noField')} · {crops}</span></p>
    <p className="scope__line meta-13"><span>{t('location.hypotheses', { soil: n0(core.soil.capacity_mm) })} {core.crops[0]?.calendar_source ? t('location.calendar', { source: core.crops[0].calendar_source }) : t('location.reason.crop_calendar_unknown')}</span></p>
    {core.field && <p className="scope__line meta-13"><span>{t('location.fieldNote')} <span lang="en">({core.field.rationale})</span></span></p>}
  </section>;
}

export function Off({ layer }: { layer: Unavailable }) {
  const { t } = useI18n();
  return <Notice tone="warn" title={t('location.unavailable')}>{t(`location.reason.${layer.reason_code}` as MessageKey)}{layer.source ? ` (${layer.source})` : ''}</Notice>;
}

export function Weather({ layer }: { layer: Layers['weather'] }) {
  const { t } = useI18n();
  if (isOff(layer)) return <section className="card"><h2>{t('location.weather.title')}</h2><Off layer={layer} /></section>;
  const months = monthlyWeather(layer.rows).slice(-MONTHS_SHOWN);
  const total = (k: 'rain_mm' | 'et0_mm') => months.reduce((a, m) => a + m[k], 0) / Math.max(1, months.length / 12);
  return <section className="card" data-testid="location-weather"><div className="row-between"><h2>{t('location.weather.title')}</h2><Pill tone="soil">{t('kind.historical')}</Pill></div>
    <div className="grid-3"><Stat label={t('location.weather.rainYear')} value={n0(total('rain_mm'))} unit="mm" /><Stat label={t('location.weather.et0Year')} value={n0(total('et0_mm'))} unit="mm" /><Stat label={t('location.weather.period')} value={`${dFull(months[0]!.month + '-01')}`} unit={`→ ${dFull(layer.period.end)}`} /></div>
    <DualChart dates={months.map((m) => `${m.month}-15`)} bars={months.map((m) => m.rain_mm)} barsLabel={t('location.weather.rainMonth')} line={months.map((m) => m.et0_mm)} lineDomain={[0, Math.ceil(Math.max(...months.map((m) => m.et0_mm), 1) / 50) * 50]} lineLabel={t('location.weather.et0Month')} maxGapDays={40} ariaLabel={t('location.weather.chart')} />
    <p className="meta-13">{layer.source}</p></section>;
}

export function Water({ layers }: { layers: Layers }) {
  const { t } = useI18n();
  const layer = layers.water_balance;
  const seasons = isOff(layer) ? [] : layer.seasons;
  const [pick, setPick] = useState(Math.max(0, seasons.length - 1));
  const rain = useMemo(() => new Map(isOff(layers.weather) ? [] : layers.weather.rows.map((r) => [r.date, r.rain_mm])), [layers.weather]);
  if (isOff(layer)) return <section className="card"><h2>{t('location.water.title')}</h2><Off layer={layer} /></section>;
  const s = seasons[Math.min(pick, seasons.length - 1)]!;
  const stress = s.rows.filter((r) => r.ks < 1).length;
  return <section className="card" data-testid="location-water"><div className="row-between"><h2>{t('location.water.title')}</h2>
    <label className="row meta">{t('location.water.season')}<select className="input" style={{ width: 'auto' }} value={pick} onChange={(e) => setPick(Number(e.target.value))}>{seasons.map((x, i) => <option key={i} value={i}>{t(`location.crop.${x.crop}` as MessageKey)} {x.season}</option>)}</select></label></div>
    <div className="grid-3"><Stat label={t('location.water.sowing')} value={dShort(s.sowing_date)} unit={`→ ${dShort(s.harvest_date)}`} /><Stat label={t('location.water.stressDays')} value={n0(stress)} unit={t('common.days')} /><Stat label={t('location.water.deficit')} value={n1(s.rows.reduce((a, r) => a + r.deficit_mm, 0))} unit="mm" /></div>
    <DualChart dates={s.rows.map((r) => r.date)} bars={s.rows.map((r) => rain.get(r.date) ?? null)} barsLabel={t('chart.rainDaily')} line={s.rows.map((r) => r.available_fraction * 100)} lineDomain={[0, 100]} lineLabel={t('location.water.reserve')} ariaLabel={t('location.water.chart', { season: s.season })} />
    <p className="meta-13">{layer.method} · {t('location.water.parameters', { set: s.parameter_set, initial: pct(s.initial_fraction) })}</p></section>;
}

export function Ndvi({ layers }: { layers: Layers }) {
  const { t } = useI18n();
  const layer = layers.ndvi;
  if (isOff(layer)) return <section className="card"><h2>{t('location.ndvi.title')}</h2><Off layer={layer} /></section>;
  const rain = new Map(isOff(layers.weather) ? [] : layers.weather.rows.map((r) => [r.date, r.rain_mm]));
  const clear = layer.rows.filter((r) => r.ndvi !== null).length;
  // Daily axis from the season start to its end: the gap between passes is visible, as on the municipality chart.
  // Two sensors on the same day (Landsat and Sentinel): plot the observation with more clear pixels, preferring a value over a cloudy pass.
  const byDate = new Map<string, (typeof layer.rows)[number]>(); for (const r of layer.rows) { const prev = byDate.get(r.date); if (!prev || (prev.ndvi === null && r.ndvi !== null) || (r.ndvi !== null && r.valid_fraction > prev.valid_fraction)) byDate.set(r.date, r); }
  const days: string[] = [];
  for (let d = new Date(`${layer.period.start}T00:00:00Z`); d <= new Date(`${layer.period.end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
  return <section className="card" data-testid="location-ndvi"><div className="row-between"><h2>{t('location.ndvi.title')}</h2><Pill tone="ok">{t('kind.orbital')}</Pill></div>
    <p className="meta">{t('location.ndvi.summary', { clear, total: layer.rows.length, start: dFull(layer.period.start), end: dFull(layer.period.end) })}</p>
    <DualChart dates={days} line={days.map((d) => (byDate.has(d) ? byDate.get(d)!.ndvi : undefined))} lineDomain={[0, 1]} lineLabel="NDVI" rejected={days.map((d) => byDate.has(d) && byDate.get(d)!.ndvi === null)} bars={days.map((d) => rain.get(d) ?? null)} barsLabel={t('chart.rainDaily')} ariaLabel={t('location.ndvi.chart')} />
    <p className="meta-13">{layer.source}</p></section>;
}

export function Forecast({ layer }: { layer: Layers['forecast'] }) {
  const { t } = useI18n();
  if (isOff(layer)) return <section className="card" data-testid="location-forecast"><h2>{t('location.forecast.title')}</h2><Off layer={layer} /></section>;
  return <section className="card" data-testid="location-forecast"><div className="row-between"><h2>{t('location.forecast.title')}</h2><Pill tone="water">{t('kind.forecast')}</Pill></div>
    <p className="meta" data-testid="forecast-issued">{t('location.forecast.issued', { date: dDateTime(layer.issued_at), crop: t(`location.crop.${layer.crop}` as MessageKey), season: layer.season })}</p>
    <div className="table-wrap" tabIndex={0} role="group" aria-label={t('common.tableScroll')}><table><thead><tr><th>{t('overview.next.day')}</th><th className="num">{t('overview.next.rain')}</th><th className="num">{t('overview.next.et0')}</th><th className="num">{t('overview.next.reserveMm')}</th><th>{t('overview.next.plantWater')}</th></tr></thead>
      <tbody>{layer.rows.map((r) => <tr key={r.date}><td>{dShort(r.date)}</td><td className="num">{n1(r.rain_mm)}</td><td className="num">{n1(r.et0_mm)}</td><td className="num">{n1(r.storage_mm)}</td><td>{r.stress ? <Pill tone="warn">{t('water.belowIdeal')}</Pill> : <Pill tone="ok">{t('water.enough')}</Pill>}</td></tr>)}</tbody></table></div>
    <p className="meta-13">{layer.method} · {layer.source}</p></section>;
}

export function Provenance({ core }: { core: LocationCore }) {
  const { t } = useI18n();
  return <section className="card"><h2>{t('location.provenance')}</h2>
    <ul className="plain meta-13">{core.provenance.inputs.map((i, k) => <li key={k}><b>{i.source}</b> · {i.dataset}</li>)}</ul>
    <p className="meta-13">{t('location.generated', { date: dDateTime(core.provenance.generated_at), generator: core.provenance.generator })}</p></section>;
}

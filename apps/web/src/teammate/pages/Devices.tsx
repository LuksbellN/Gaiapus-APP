import { Fragment } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BatteryLow, Bell, Droplets } from 'lucide-react';
import { useActiveContext } from '../App';
import { plotElsewhere, resolvePlace, SORRISO } from '../context';
import { ScopeStrip } from '../ui/ScopeStrip';
import { devices, weather } from '../adapters';
import { dShort, dTime, n1, nMax, pct } from '../format';
import { useI18n, type MessageKey } from '../i18n';
import { Empty, ErrorState, LinkBtn, Loading, Notice, Pill, Source, useAsync } from '../ui';

export function Devices() {
  const { t } = useI18n(); const d = useAsync((s) => devices.list(s), []);
  return <div className="page"><div className="page-head"><div className="stack-2"><h1>{t('devices.title')}</h1><p>{t('devices.subtitle')}</p></div><Pill tone="warn">{t('kind.synthetic')}</Pill></div>
    <div data-tour="devices-synthetic"><Notice tone="warn" title={t('devices.syntheticTitle')}>{t('devices.synthetic')}</Notice></div>
    {d.status === 'error' ? <ErrorState error={d.error} onRetry={d.retry} /> : !d.data ? <Loading rows={4} /> : d.data.data.length === 0 ? <Empty title={t('devices.none')} /> : <div className="grid-auto">{d.data.data.map((x) => <section className="card" key={x.id} data-tour="device-card" style={x.fault ? { borderColor: 'var(--risk)' } : undefined}><div className="row-between"><h2><Droplets size={18} aria-hidden />{t('devices.name', { n: x.id.slice(-2) })}</h2>{x.fault ? <Pill tone="risk">{t('devices.fault')}</Pill> : <Pill tone="ok">{t('devices.ok')}</Pill>}</div>
      {x.fault && <Notice tone="risk"><BatteryLow size={0} aria-hidden />{t('devices.faultText', { hours: x.fault.hours })}</Notice>}
      <dl className="kv"><dt>{t('devices.plot')}</dt><dd>{t('devices.demoPlot')}</dd><dt>{t('devices.depth')}</dt><dd>{x.depth_cm} cm</dd><dt>{t('devices.vwc')}</dt><dd>{x.vwc_pct == null ? t('devices.noReading') : `${n1(x.vwc_pct)}%`}</dd><dt>{t('devices.temp')}</dt><dd>{x.soil_temp_c == null ? t('devices.noReading') : `${n1(x.soil_temp_c)} °C`}</dd><dt>{t('devices.last')}</dt><dd>{dTime(x.last_reading_at)}</dd><dt>{t('devices.battery')}</dt><dd>{x.battery_pct}%</dd><dt>{t('devices.signal')}</dt><dd>{t(`devices.signals.${x.signal}`)}</dd><dt>{t('devices.calibration')}</dt><dd>{x.calibrated ? t('devices.calibrated') : t('devices.noCalibration')}</dd></dl>
      <p className="meta-13">{t('devices.faultVsAlert')}</p></section>)}</div>}
    {d.data && <Source meta={d.data.meta} />}</div>;
}
export function Alerts() {
  const { t } = useI18n();
  const [params] = useSearchParams(); const ctx = useActiveContext(); const place = resolvePlace(params, ctx); const elsewhere = plotElsewhere(place, ctx); const covered = place.code === SORRISO;
  const w = useAsync((s) => (covered ? weather.waterProjection(place.code, s) : Promise.resolve(null)), [place.code]);
  const head = <div className="page-head"><div className="stack-2"><h1>{t('nav.item.alertas')}</h1><p>{t('alerts.subtitle')}</p></div><Pill>{covered ? t('alerts.placeCrop', { place: place.name, crop: t('crop.soy') }) : place.name}</Pill></div>;
  if (!covered) return <div className="page">{head}
    <ScopeStrip place={place} elsewhere={elsewhere} />
    <Empty title={t('alerts.noneFor', { place: place.name })} action={<div className="row"><LinkBtn to="/alertas?mun=5107925">{t('overview.noWater.seeDemo')}</LinkBtn><LinkBtn to="/explorar?pais=BR">{t('overview.noWater.withData')}</LinkBtn></div>}>{t('alerts.noneForText')}</Empty></div>;
  if (w.status === 'error') return <div className="page"><h1>{t('nav.item.alertas')}</h1><ErrorState error={w.error} onRetry={w.retry} /></div>; if (!w.data?.data) return <div className="page"><h1>{t('nav.item.alertas')}</h1><Loading /></div>;
  const p = w.data.data; const stress = p.days.filter((d) => d.stress); const l = p.evaluation.by_lead[0];
  const rows: [MessageKey, string][] = [
    ['overview.alert.reason', t('alerts.reasonText', { reserve: pct(stress[0]?.available_water_fraction), deficit: nMax(stress.reduce((a, d) => a + d.et_deficit_mm, 0), 2) })],
    ['overview.alert.period', stress.map((d) => dShort(d.date)).join(', ')],
    ['alerts.source', t('alerts.sourceText', { provider: `${p.forecast.provider} ${p.forecast.model}`, issued: dTime(p.forecast.issued_at) })],
    ['alerts.action', t('alerts.actionText')],
    ['overview.alert.uncertainty', t('alerts.uncertaintyText', { mae: n1(l.storage_mae_mm), acc: pct(l.stress_accuracy) })],
  ];
  return <div className="page">{head}
    <ScopeStrip place={place} elsewhere={elsewhere} />
    {stress.length === 0 ? <Empty title={t('alerts.noWater')}>{t('alerts.noWaterText', { count: p.days.length })}</Empty> : <section className="card" data-tour="alert-card" style={{ borderColor: 'var(--warn)' }}><div className="row-between"><h2><Bell size={18} aria-hidden />{t('alerts.waterTitle')}</h2><Pill tone="warn">{t('alerts.attention')}</Pill></div>
      <dl className="kv" style={{ gridTemplateColumns: 'auto 1fr' }}>{rows.map(([k, v]) => <Fragment key={k}><dt>{t(k)}</dt><dd style={{ textAlign: 'left', fontWeight: 400 }}>{v}</dd></Fragment>)}</dl>
      <div className="row"><LinkBtn primary to="/visao-geral">{t('alerts.fullForecast')}</LinkBtn></div><Source meta={w.data.meta} /></section>}
    <section className="stack-2"><h2>{t('alerts.otherTitle')}</h2><Empty title={t('alerts.otherNone')}>{t('alerts.otherText')}</Empty></section></div>;
}

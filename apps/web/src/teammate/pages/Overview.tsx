import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, CloudRain, Droplets, Globe, Sprout, Tractor } from 'lucide-react';
import { crops, modelLabel, modelScope, weather } from '../adapters';
import { useActiveContext } from '../App';
import { dFull, dShort, dTime, dWeek, n0, n1, n2, pct, STAGE } from '../format';
import { useStore, type FieldRecord } from '../store';
import { plotElsewhere, resolvePlace, SORRISO, upcomingActivity } from '../context';
import { useI18n } from '../i18n';
import { optionLabel } from '../options';
import { ScopeStrip } from '../ui/ScopeStrip';
import { Empty, ErrorState, LinkBtn, Loading, Notice, Pill, Source, Stat, useAsync } from '../ui';
import { PhaseTimeline } from '../ui/PhaseTimeline';
import { ModelTest } from '../ui/SealedTest';

export function Overview() {
  // Place: link → plot in use → Sorriso demonstration (context.ts). The water projection is published only for Sorriso.
  const { t, tn } = useI18n();
  const [params] = useSearchParams(); const ctx = useActiveContext(); const place = resolvePlace(params, ctx); const code = place.code; const elsewhere = plotElsewhere(place, ctx); const covered = code === SORRISO;
  const w = useAsync((s) => (covered ? weather.waterProjection(code, s) : Promise.resolve(null)), [code]); const daily = useAsync((s) => (covered ? weather.dailySeries(code, s) : Promise.resolve(null)), [code]); const y = useAsync((s) => (covered ? crops.yieldEstimate({ crop: 'soy', municipalityCode: code }, s) : Promise.resolve(null)), [code]);
  const records = useStore((s) => s.records); const upcoming = upcomingActivity(records, ctx.plot?.id ?? null);
  const phaseDeficit = useMemo(() => { const d = daily.data?.data.scenarios.reference_fallow; if (!d) return null; const out: Record<string, { mm: number; days: number; stress: number }> = {}; d.date.forEach((_, i) => { if (d.agricultural_year[i] !== '2020/2021' || d.land_cover[i] !== 'soy') return; const o = (out[d.stage[i]] ??= { mm: 0, days: 0, stress: 0 }); o.mm += d.et_deficit_mm[i]; o.days++; if (d.ks[i] < 1) o.stress++; }); return out; }, [daily.data]);
  if (!covered) return <div className="page"><div className="page-head"><div className="stack-2"><h1>{t('overview.titleOther', { place: place.name })}</h1><p>{t('overview.subtitleOther')}</p></div></div>
    <ScopeStrip place={place} elsewhere={elsewhere} />
    <div className="cols"><section className="card" aria-labelledby="h-sem" data-testid="no-analysis"><h2 id="h-sem">{t('overview.noWater.title', { place: place.name })}</h2>
      <p>{t('overview.noWater.text', { place: place.name })}</p>
      <div className="row"><LinkBtn primary to={`/explorar?mun=${code}`}>{t('overview.noWater.seeHere', { place: place.name })}</LinkBtn><LinkBtn to="/visao-geral?mun=5107925">{t('overview.noWater.seeDemo')}</LinkBtn><LinkBtn to="/explorar?pais=BR">{t('overview.noWater.withData')}</LinkBtn></div></section>
      <aside className="stack" aria-label={t('overview.aside')}><Actions /><Upcoming upcoming={upcoming} plot={ctx.plot?.name} /></aside></div></div>;
  if (w.status === 'error') return <div className="page"><h1>{t('nav.item.visaoGeral')}</h1><ErrorState error={w.error} onRetry={w.retry} /><p><LinkBtn to="/explorar?pais=BR">{t('overview.otherPlace')}</LinkBtn></p></div>;
  if (!w.data?.data) return <div className="page"><h1>{t('nav.item.visaoGeral')}</h1><Loading rows={6} /></div>;
  const p = w.data.data; const d0 = p.days[0]; const last = p.days[p.days.length - 1]; const rainTotal = p.days.reduce((a, d) => a + d.rain_mm, 0); const stressDays = p.days.filter((d) => d.stress);
  const series = { dates: p.days.map((d) => d.date), rain: p.days.map((d) => d.rain_mm), storage: p.days.map((d) => d.storage_end_mm), storageB: p.reference_days.map((d) => d.storage_end_mm), stage: p.days.map((d) => d.phase), land: p.days.map(() => p.crop), deficit: p.days.map((d) => d.et_deficit_mm), capacity: p.soil.capacity_mm };
  const lead1 = p.evaluation.by_lead[0];
  return (
    <div className="page">
      <div className="page-head">
        <div className="stack-2"><h1>{t('overview.title', { place: place.name })}</h1><p>{t('overview.subtitle', { crop: t('crop.soy'), day: p.crop_day_at_decision, stage: STAGE[d0.phase], sowing: dFull(p.sowing_date) })}</p></div>
        <div className="row"><Pill tone="water">{t('kind.forecast')}</Pill><Pill>{t('kind.municipalScale')}</Pill></div>
      </div>
      <ScopeStrip place={place} elsewhere={elsewhere} period={t('overview.period', { from: dShort(d0.date), to: dFull(last.date) })} />
      <div className="cols">
        <div className="stack">
          <section className="card" aria-labelledby="h-alerta" style={{ borderColor: stressDays.length ? 'var(--warn)' : undefined }}>
            <h2 id="h-alerta"><Droplets size={20} aria-hidden />{stressDays.length ? t('overview.alert.titleStress') : t('overview.alert.titleOk')}</h2>
            <p>{stressDays.length ? tn('overview.alert.textStress', { day: dShort(d0.date), deficit: <b>{n2(d0.et_deficit_mm)} mm</b>, rain: <b>{n0(rainTotal)} mm</b>, until: dShort(last.date), from: pct(p.initial_state.available_water_fraction), to: <b>{pct(last.available_water_fraction)}</b> }) : t('overview.alert.textOk')}</p>
            <dl className="kv kv--text">
              <dt>{t('overview.alert.reason')}</dt><dd>{t('overview.alert.reasonText', { reserve: pct(d0.available_water_fraction), rain: n1(d0.rain_mm), et0: n1(d0.et0_mm) })}</dd>
              <dt>{t('overview.alert.period')}</dt><dd>{stressDays.map((d) => dShort(d.date)).join(', ') || '—'}</dd>
              <dt>{t('overview.alert.todo')}</dt><dd>{t('overview.alert.todoText')}</dd>
              <dt>{t('overview.alert.uncertainty')}</dt><dd>{t('overview.alert.uncertaintyText', { mae: n1(lead1.storage_mae_mm), clim: n1(lead1.reference_storage_mae_mm) })}</dd>
            </dl>
          </section>
          <section className="card" aria-labelledby="h-prev">
            <div className="row-between"><h2 id="h-prev"><CloudRain size={20} aria-hidden />{t('overview.next.title', { count: p.days.length })}</h2><span className="meta-13">{t('overview.next.issued', { issued: dTime(p.forecast.issued_at), available: dTime(p.forecast.available_at) })}</span></div>
            <div className="table-wrap" tabIndex={0} role="group" aria-label={t('common.tableScroll')}><table>
              <thead><tr><th>{t('overview.next.day')}</th><th className="num">{t('overview.next.rain')}</th><th className="num">{t('overview.next.et0')}</th><th className="num">{t('overview.next.reserveMm')}</th><th className="num">{t('overview.next.reservePct')}</th><th>{t('overview.next.plantWater')}</th></tr></thead>
              <tbody>{p.days.map((d) => <tr key={d.date}><td><b>{dWeek(d.date)}</b> {dShort(d.date)}</td><td className="num">{n1(d.rain_mm)}</td><td className="num">{n1(d.et0_mm)}</td><td className="num">{n1(d.storage_end_mm)}</td><td className="num">{pct(d.available_water_fraction)}</td><td>{d.stress ? <Pill tone="warn">{t('water.belowIdeal')}</Pill> : <Pill tone="ok">{t('water.enough')}</Pill>}</td></tr>)}</tbody>
            </table></div>
            <PhaseTimeline series={series} labelA={t('overview.next.labelA')} labelB={t('overview.next.labelB')} ariaLabel={t('overview.next.chart')} height={200} />
            <Notice tone="warn" title={t('overview.gaps.title')}>{t('overview.gaps.text', { served: p.horizon_days_served, requested: p.horizon_days_requested, validated: p.max_validated_lead_days })}</Notice>
            <Source meta={w.data.meta} extra={t('overview.soil', { cls: p.soil.cad_class, mm: n0(p.soil.capacity_mm) })} />
          </section>
          <section className="card" aria-labelledby="h-fase">
            <div className="row-between"><h2 id="h-fase"><Sprout size={20} aria-hidden />{t('overview.phase.title')}</h2><Pill tone="soil">{t('overview.phase.pill')}</Pill></div>
            {daily.status === 'error' ? <ErrorState error={daily.error} onRetry={daily.retry} /> : !phaseDeficit ? <Loading /> :
              <div className="table-wrap" tabIndex={0} role="group" aria-label={t('common.tableScroll')}><table><thead><tr><th>{t('overview.phase.phase')}</th><th className="num">{t('overview.phase.days')}</th><th className="num">{t('overview.phase.stressDays')}</th><th className="num">{t('overview.phase.deficit')}</th></tr></thead><tbody>{Object.entries(phaseDeficit).map(([k, v]) => <tr key={k} data-highlight={k === d0.phase}><td>{STAGE[k]}{k === d0.phase && <span className="meta-13"> · {t('overview.phase.current')}</span>}</td><td className="num">{v.days}</td><td className="num">{v.stress}</td><td className="num">{n1(v.mm)}</td></tr>)}</tbody></table></div>}
            {daily.data && <Source meta={daily.data.meta} extra={t('overview.phase.source')} />}
          </section>
        </div>
        <aside className="stack" aria-label={t('overview.aside')}>
          <section className="card" aria-labelledby="h-res">
            <h2 id="h-res">{t('overview.reserve.title')}</h2>
            <Stat label={t('overview.reserve.on', { date: dFull(p.initial_state.date) })} value={pct(p.initial_state.available_water_fraction)} unit={t('overview.reserve.unit', { mm: n1(p.initial_state.storage_mm), cap: n0(p.soil.capacity_mm) })} />
            <div className="meter" role="img" aria-label={t('overview.reserve.meter', { pct: pct(p.initial_state.available_water_fraction) })}><i style={{ width: `${p.initial_state.available_water_fraction * 100}%` }} /></div>
            <p className="meta-13">{t('overview.reserve.basis', { days: p.initial_state.observed_days, source: p.initial_state.observed_source })}</p>
          </section>
          <Actions />
          <Upcoming upcoming={upcoming} plot={ctx.plot?.name} />
          <section className="card" aria-labelledby="h-rend">
            <div className="row-between"><h2 id="h-rend">{t('overview.yield.title')}</h2><Pill tone="soil">{t('kind.retrospective')}</Pill></div>
            {y.status === 'error' ? <ErrorState error={y.error} onRetry={y.retry} /> : !y.data ? <Loading rows={2} /> : <>
              <Stat label={t('overview.yield.label', { crop: t('crop.soy'), year: y.data.data.harvest_year })} value={n0(y.data.data.estimate_kg_ha)} unit="kg/ha" note={t('overview.yield.mae', { mae: n0(y.data.data.validation?.mae_kg_ha) })} />
              <p className="meta-13">{t('overview.yield.text', { days: y.data.data.cutoff_days_used ?? '—', model: modelLabel(y.data.data.model), version: y.data.data.model.version })}</p>
              <ModelTest cohort="soy" scope={modelScope(y.data.data.model)} />
              <Source meta={y.data.meta} /></>}
          </section>
        </aside>
      </div>
    </div>
  );
}
function Actions() {
  const { t } = useI18n();
  return <section className="card" aria-labelledby="h-acoes">
    <h2 id="h-acoes">{t('overview.actions.title')}</h2>
    <LinkBtn primary to="/planejar"><CalendarDays size={18} aria-hidden />{t('overview.actions.plan')}</LinkBtn>
    <LinkBtn to="/simulador"><Sprout size={18} aria-hidden />{t('overview.actions.follow')}</LinkBtn>
    <LinkBtn to="/registros?novo=evento"><Tractor size={18} aria-hidden />{t('overview.actions.record')}</LinkBtn>
    <LinkBtn to="/explorar"><Globe size={18} aria-hidden />{t('overview.actions.explore')}</LinkBtn>
  </section>;
}
function Upcoming({ upcoming, plot }: { upcoming?: FieldRecord; plot?: string }) {
  const { t } = useI18n();
  return <section className="card" aria-labelledby="h-prox">
    <h2 id="h-prox">{t('overview.upcoming.title')}{plot ? ` · ${plot}` : ''}</h2>
    {upcoming ? <p><b>{upcoming.data.tipo ? optionLabel('tipo', upcoming.data.tipo_code || upcoming.data.tipo) : t(`records.kind.${upcoming.kind}`)}</b> · {dFull(upcoming.event_at)}</p> : <Empty title={t('overview.upcoming.empty')}>{plot ? t('overview.upcoming.emptyPlot', { plot }) : t('overview.upcoming.emptyText')}</Empty>}
  </section>;
}

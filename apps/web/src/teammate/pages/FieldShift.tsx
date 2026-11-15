import { useState } from 'react';
import { simulations, weather } from '../adapters';
import { n0, n1, n2, nMax, signed } from '../format';
import { ErrorState, LinkBtn, Loading, Notice, Pill, Source, Stat, useAsync } from '../ui';
import { PhaseTimeline } from '../ui/PhaseTimeline';
import { useActiveContext } from '../App';
import { placeName, plotElsewhere, resolvePlace } from '../context';
import { ScopeStrip } from '../ui/ScopeStrip';
import { useI18n, type MessageKey } from '../i18n';

const METRICS: [string, 'days' | 'mm', number][] = [['covered_days', 'days', 0], ['storage_at_next_sowing_mm', 'mm', 1], ['off_season_water_use_mm', 'mm', 1], ['off_season_drainage_mm', 'mm', 1], ['soy_deficit_mm', 'mm', 2], ['next_soy_establishment_deficit_mm', 'mm', 2], ['maize_deficit_mm', 'mm', 1], ['maize_stress_days', 'days', 1]];
const PARAMS = ['cover_kc', 'straw_factor', 'cad_class', 'soy_shift_days']; const NOT = ['yield', 'soil carbon', 'infiltration', 'weeds', 'nitrogen'];
const EVIDENCE_EN = 'Simulation under stated hypotheses; no field measurement of these effects in Sorriso.';

export function FieldShiftPage() {
  const { t } = useI18n();
  const ctx = useActiveContext(); const place = resolvePlace(new URLSearchParams(), ctx, { followPlot: false }); const elsewhere = plotElsewhere(place, ctx);
  const f = useAsync((s) => simulations.fieldShift('5107925', s), []); const d = useAsync((s) => weather.dailySeries('5107925', s), []); const [year, setYear] = useState('2020/2021');
  if (f.status === 'error') return <div className="page"><h1>Field Shift</h1><ErrorState error={f.error} onRetry={f.retry} /></div>; if (!f.data) return <div className="page"><h1>Field Shift</h1><Loading rows={6} /></div>;
  const x = f.data.data; const ref = x.scenarios.reference_fallow.mean as Record<string, number>, bra = x.scenarios.brachiaria.mean as Record<string, number>, diff = x.difference_brachiaria_minus_reference as Record<string, number>;
  const A = d.data?.data.scenarios.reference_fallow, B = d.data?.data.scenarios.brachiaria; const a = A ? A.agricultural_year.indexOf(year) : 0, b = A ? A.agricultural_year.lastIndexOf(year) + 1 : 0;
  const noStraw = x.sensitivity.find((s) => s.parameter === 'straw_factor' && Number(s.value) === 1);
  const param = (p: string) => (PARAMS.includes(p) ? t(`fieldShift.param.${p}` as MessageKey) : p);
  return (
    <div className="page">
      <div className="page-head"><div className="stack-2"><h1>{t('fieldShift.title', { place: placeName('5107925') })}</h1><p data-tour="fs-question">{t('fieldShift.question')}</p></div><div className="row"><Pill tone="warn">{t('kind.historicalSim')}</Pill><Pill>{t('fieldShift.seasons')}</Pill></div></div>
      <ScopeStrip place={place} elsewhere={elsewhere} scale={t('fieldShift.scale')} period={t('fieldShift.period')} />
      <div className="grid-3">
        <div className="card"><Stat label={t('fieldShift.stat.covered')} value={signed(diff.covered_days, 0)} unit={t('fieldShift.stat.perYear')} note={t('fieldShift.stat.coveredNote', { a: n0(ref.covered_days), b: n0(bra.covered_days) })} /></div>
        <div className="card"><Stat label={t('fieldShift.stat.reserve')} value={signed(diff.storage_at_next_sowing_mm, 2)} unit="mm" note={t('fieldShift.stat.reserveNote', { a: n1(ref.storage_at_next_sowing_mm), b: n1(bra.storage_at_next_sowing_mm) })} /></div>
        <div className="card"><Stat label={t('fieldShift.stat.deficit')} value={signed(diff.next_soy_establishment_deficit_mm, 2)} unit="mm" note={t('fieldShift.stat.deficitNote')} /></div>
      </div>
      <div data-tour="fs-limits"><Notice tone="warn" title={t('fieldShift.hypothesis.title')}>{t('fieldShift.hypothesis.text', { factor: nMax(x.hypotheses.central.straw_factor, 2), noStraw: n2(noStraw?.difference_next_soy_establishment_deficit_mm) })} {x.evidence === EVIDENCE_EN ? t('fieldShift.hypothesis.noField') : x.evidence}</Notice></div>
      <section className="card" data-tour="fs-table"><div className="row-between"><h2>{t('fieldShift.table.title')}</h2><span className="meta-13">{t('fieldShift.table.legend')}</span></div>
        <div className="table-wrap" tabIndex={0} role="group" aria-label={t('common.tableScroll')}><table><thead><tr><th>{t('fieldShift.table.indicator')}</th><th className="num">A · {t('sim.names.fallow')}</th><th className="num">B · {t('sim.names.brachiaria')}</th><th className="num">B − A</th></tr></thead><tbody>{METRICS.map(([k, unit, dgt]) => <tr key={k}><td>{t(`fieldShift.metric.${k}` as MessageKey)} <span className="meta-13">({unit === 'mm' ? 'mm' : t('common.days')})</span></td><td className="num">{nMax(ref[k], 2)}</td><td className="num">{nMax(bra[k], 2)}</td><td className="num"><b>{signed(diff[k], Math.max(dgt, 1))}</b></td></tr>)}<tr><td>{t('fieldShift.table.yieldEffect')}</td><td className="num" colSpan={3}>{t('fieldShift.table.notEvaluated')}</td></tr></tbody></table></div>
        <p className="meta">{t('fieldShift.notSimulated', { list: x.not_simulated.map((k) => (NOT.includes(k) ? t(`fieldShift.not.${k.replace(' ', '_')}` as MessageKey) : k)).join(', '), water: signed(diff.off_season_water_use_mm), drainage: signed(diff.off_season_drainage_mm) })}</p>
        <Source meta={f.data.meta} extra={t('fieldShift.soil', { cls: x.soil.cad_class, mm: n0(x.soil.capacity_mm) })} /></section>
      <section className="card"><div className="row-between"><h2>{t('fieldShift.daily.title', { year })}</h2><label className="row meta" data-tour="fs-year">{t('municipality.clima.year')}<select className="input" style={{ width: 'auto' }} value={year} onChange={(e) => setYear(e.target.value)}>{x.weather.agricultural_years.map((y) => <option key={y}>{y}</option>)}</select></label></div>
        {d.status === 'error' ? <ErrorState error={d.error} onRetry={d.retry} /> : !A || !B ? <Loading /> : <PhaseTimeline series={{ dates: A.date.slice(a, b), rain: A.rain_mm.slice(a, b), storage: A.storage_end_mm.slice(a, b), storageB: B.storage_end_mm.slice(a, b), stage: A.stage.slice(a, b), land: A.land_cover.slice(a, b), landB: B.land_cover.slice(a, b), deficit: A.et_deficit_mm.slice(a, b), capacity: x.soil.capacity_mm }} labelA={t('fieldShift.daily.labelA')} labelB={t('fieldShift.daily.labelB')} ariaLabel={t('fieldShift.daily.chart', { year })} height={220} />}
        <div className="row"><LinkBtn primary to="/simulador">{t('fieldShift.openSim')}</LinkBtn></div></section>
      <section className="card"><h2>{t('fieldShift.sens.title')}</h2><p className="meta">{t('fieldShift.sens.intro')}</p>
        <div className="table-wrap" tabIndex={0} role="group" aria-label={t('common.tableScroll')}><table><thead><tr><th>{t('fieldShift.sens.hypothesis')}</th><th>{t('fieldShift.sens.value')}</th><th className="num">{t('fieldShift.sens.reserve')}</th><th className="num">{t('fieldShift.sens.soyDeficit')}</th><th className="num">{t('fieldShift.sens.establishment')}</th><th className="num">{t('fieldShift.sens.waterUse')}</th></tr></thead><tbody>{x.sensitivity.map((s, i) => <tr key={i} data-highlight={s.parameter === 'straw_factor' && Number(s.value) === 1}><td>{param(s.parameter)}</td><td>{typeof s.value === 'number' ? (s.parameter === 'soy_shift_days' ? signed(s.value, 0) : nMax(s.value, 2)) : s.value}</td><td className="num">{signed(s.difference_storage_at_next_sowing_mm, 2)}</td><td className="num">{signed(s.difference_soy_deficit_mm, 2)}</td><td className="num">{signed(s.difference_next_soy_establishment_deficit_mm, 2)}</td><td className="num">{signed(s.difference_off_season_water_use_mm, 2)}</td></tr>)}</tbody></table></div>
        <p className="meta-13">{t('fieldShift.sens.central', { kc: nMax(x.hypotheses.central.cover_kc, 2), source: x.hypotheses.sources.cover_kc, straw: nMax(x.hypotheses.central.straw_factor, 2) })}</p></section>
    </div>
  );
}

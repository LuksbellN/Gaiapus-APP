import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CloudRain, Droplets, Satellite, Sprout } from 'lucide-react';
import { crops, imagery, simulations, weather } from '../adapters';
import { dFull, n0, n1, nMax, pct } from '../format';
import { CROP_IDS, CROPS, isCropId, type CropId, isPlainCrop } from '../catalog';
import { CapabilityTable, ModelStatus, YieldCard } from '../ui/Crops';
import { Empty, ErrorState, Field, Loading, Notice, Pill, Seg, Source, Stat, TabPanel, Tabs, useAsync } from '../ui';
import { DualChart } from '../ui/DualChart';
import { PhaseTimeline } from '../ui/PhaseTimeline';
import { ModelTest } from '../ui/SealedTest';
import { useActiveContext } from '../App';
import { isKnownPlace, placeName, plotElsewhere, resolvePlace, SORRISO, type ResolvedPlace } from '../context';
import { ScopeStrip } from '../ui/ScopeStrip';
import { placesWithData, useCoverageIndex } from '../geo/coverageIndex';
import { useI18n } from '../i18n';

type Tab = 'clima' | 'agua' | 'safra' | 'imagem';

export function Municipality() {
  // Place: link → plot in use → Sorriso demonstration, restricted to the municipalities this screen has data for.
  const { t } = useI18n();
  const [params, setParams] = useSearchParams(); const ctx = useActiveContext(); const idx = useCoverageIndex();
  // Municipalities with data come from the catalogue; Sorriso and Uberlândia stay available while it loads.
  const placeList = useMemo(() => { const out: [string, string][] = [[SORRISO, placeName(SORRISO)], ['3170206', placeName('3170206')]]; for (const p of placesWithData(idx.index)) if (!out.some(([c]) => c === p.municipality.id)) out.push([p.municipality.id, placeName(p.municipality.id)]); return out; }, [idx.index]); const places = Object.fromEntries(placeList);
  const resolved = resolvePlace(params, ctx); const place: ResolvedPlace = places[resolved.code] || isKnownPlace(resolved.code) ? resolved : { code: SORRISO, name: placeName(SORRISO), origin: 'demo' }; const code = place.code; const elsewhere = plotElsewhere(place, ctx); const tab: Tab = (['clima', 'agua', 'safra', 'imagem'] as const).find((x) => x === params.get('aba')) ?? 'clima'; const keep: Record<string, string> = params.get('cultura') ? { cultura: params.get('cultura')! } : {}; const setTab = (x: Tab) => setParams({ mun: code, ...(x === 'clima' ? {} : { aba: x }), ...(x === 'safra' ? keep : {}) });
  return (
    <div className="page">
      <div className="page-head"><div className="stack-2"><h1>{placeName(code)}</h1><p>{t('municipality.subtitle', { code })}</p></div>
        <Seg legend={t('municipality.choose')} name="mun" value={code} onChange={(v) => setParams({ mun: v, ...(tab === 'clima' ? {} : { aba: tab }), ...(tab === 'safra' ? keep : {}) })} options={placeList.map(([value, label]) => ({ value, label }))} /></div>
      <ScopeStrip place={place} elsewhere={elsewhere} />
      <div data-tour="mun-tabs"><Tabs label={t('municipality.tabs')} value={tab} onChange={setTab} tabs={[{ id: 'clima', label: t('municipality.tab.clima'), icon: <CloudRain size={18} aria-hidden /> }, { id: 'agua', label: t('municipality.tab.agua'), icon: <Droplets size={18} aria-hidden /> }, { id: 'safra', label: t('municipality.tab.safra'), icon: <Sprout size={18} aria-hidden /> }, { id: 'imagem', label: t('municipality.tab.imagem'), icon: <Satellite size={18} aria-hidden /> }]} /></div>
      <TabPanel id={tab} key={code + tab}>{tab === 'clima' ? <Clima code={code} /> : tab === 'agua' ? <Agua code={code} /> : tab === 'safra' ? <Safra code={code} /> : <Imagem code={code} />}</TabPanel>
    </div>
  );
}
function Clima({ code }: { code: string }) {
  const { t } = useI18n();
  const d = useAsync((s) => (code === '5107925' ? weather.dailySeries(code, s) : Promise.resolve(null)), [code]);
  // Daily rain of the published field, where the municipality has one; no field is not an error.
  const im = useAsync((s) => (code === '5107925' ? Promise.resolve(null) : imagery.series(code, s).catch((e) => { if (e?.code === 'municipality_not_covered') return null; throw e; })), [code]);
  const years = useMemo(() => { const s = d.data?.data.scenarios.reference_fallow; if (!s) return []; const o: Record<string, { rain: number; et0: number; dry: number }> = {}; s.date.forEach((_, i) => { const y = (o[s.agricultural_year[i]] ??= { rain: 0, et0: 0, dry: 0 }); y.rain += s.rain_mm[i]; y.et0 += s.et0_mm[i]; if (s.rain_mm[i] < 1) y.dry++; }); return Object.entries(o); }, [d.data]);
  if (d.status === 'error' || im.status === 'error') return <ErrorState error={d.error ?? im.error} onRetry={() => { d.retry(); im.retry(); }} />;
  if (d.status === 'loading' || im.status === 'loading') return <Loading rows={5} />;
  return <>
    {d.data && <section className="card"><div className="row-between"><h2>{t('municipality.clima.yearsTitle')}</h2><Pill tone="soil">{t('municipality.clima.yearsPill')}</Pill></div>
      <div className="table-wrap" tabIndex={0} role="group" aria-label={t('common.tableScroll')}><table><thead><tr><th>{t('municipality.clima.year')}</th><th className="num">{t('overview.next.rain')}</th><th className="num">{t('overview.next.et0')}</th><th className="num">{t('municipality.clima.dry')}</th></tr></thead><tbody>{years.map(([y, v]) => <tr key={y}><td>{y}</td><td className="num">{n0(v.rain)}</td><td className="num">{n0(v.et0)}</td><td className="num">{v.dry}</td></tr>)}</tbody></table></div><Source meta={d.data.meta} extra={t('municipality.clima.yearsSource')} /></section>}
    {im.data && <section className="card"><div className="row-between"><h2>{t('municipality.clima.rainTitle')}</h2><Pill tone="soil">{t('municipality.clima.rainPill', { from: dFull(im.data.data.rainfall[0]?.date ?? im.data.data.image.date), to: dFull(im.data.data.rainfall.at(-1)?.date ?? im.data.data.image.date) })}</Pill></div>
      <DualChart dates={im.data.data.rainfall.map((r) => r.date)} bars={im.data.data.rainfall.map((r) => r.rain_mm)} barsLabel={t('chart.rainDaily')} ariaLabel={t('municipality.clima.rainChart', { place: placeName(code) })} />
      <Stat label={t('municipality.clima.total')} value={n0(im.data.data.rainfall.reduce((a, r) => a + (r.rain_mm ?? 0), 0))} unit="mm" note={im.data.data.rainfall.some((r) => r.rain_mm == null) ? t('municipality.clima.missingDays') : undefined} />
      <Source meta={{ kind: 'publicacao', source: im.data.data.sources.rain }} extra={[im.data.data.sources.weather_scope, im.data.data.sources.rain_validation].filter(Boolean).join(' ') || undefined} /></section>}
    <Notice tone="warn" title={t('municipality.clima.gapsTitle')}>{t('municipality.clima.gaps')}</Notice>
  </>;
}
function Agua({ code }: { code: string }) {
  const { t } = useI18n();
  const fsd = useAsync((s) => simulations.fieldShift(code, s), [code]); const d = useAsync((s) => weather.dailySeries(code, s), [code]); const [year, setYear] = useState('2020/2021');
  if ((fsd.error as any)?.code === 'municipality_not_covered') return <Empty title={t('municipality.agua.noneTitle')}>{t('municipality.agua.none')}</Empty>;
  if (fsd.status === 'error' || d.status === 'error') return <ErrorState error={fsd.error ?? d.error} onRetry={() => { fsd.retry(); d.retry(); }} />;
  if (!fsd.data || !d.data) return <Loading rows={5} />;
  const s = d.data.data.scenarios.reference_fallow; const a = s.agricultural_year.indexOf(year), b = s.agricultural_year.lastIndexOf(year) + 1;
  return <>
    <section className="card"><div className="row-between"><h2>{t('municipality.agua.title', { year })}</h2><label className="row meta">{t('municipality.clima.year')}<select className="input" style={{ width: 'auto' }} value={year} onChange={(e) => setYear(e.target.value)}>{fsd.data.data.weather.agricultural_years.map((y) => <option key={y}>{y}</option>)}</select></label></div>
      <PhaseTimeline series={{ dates: s.date.slice(a, b), rain: s.rain_mm.slice(a, b), storage: s.storage_end_mm.slice(a, b), stage: s.stage.slice(a, b), land: s.land_cover.slice(a, b), deficit: s.et_deficit_mm.slice(a, b), capacity: d.data.data.capacity_mm }} ariaLabel={t('municipality.agua.chart', { year })} />
      <Source meta={d.data.meta} extra={t('municipality.agua.source')} /></section>
    <section className="card"><div className="row-between"><h2>{t('municipality.agua.summary')}</h2><Pill tone="warn">{t('kind.historicalSim')}</Pill></div>
      <div className="table-wrap" tabIndex={0} role="group" aria-label={t('common.tableScroll')}><table><thead><tr><th>{t('municipality.agua.year')}</th><th className="num">{t('municipality.agua.soyDeficit')}</th><th className="num">{t('municipality.agua.maizeDeficit')}</th><th className="num">{t('municipality.agua.maizeStress')}</th><th className="num">{t('municipality.agua.nextSowing')}</th></tr></thead><tbody>{fsd.data.data.scenarios.reference_fallow.by_year.map((r) => <tr key={r.agricultural_year} data-highlight={r.agricultural_year === year}><td>{r.agricultural_year}</td><td className="num">{n1(r.soy_deficit_mm)}</td><td className="num">{n1(r.maize_deficit_mm)}</td><td className="num">{r.maize_stress_days}</td><td className="num">{n1(r.storage_at_next_sowing_mm)}</td></tr>)}</tbody></table></div></section>
  </>;
}
function Safra({ code }: { code: string }) {
  // Cultura na URL (?cultura=). O conteúdo é remontado a cada troca: nada da seleção anterior fica na tela enquanto a nova consulta carrega ou falha.
  const { t } = useI18n();
  const [params, setParams] = useSearchParams(); const crop: CropId = isCropId(params.get('cultura')) ? (params.get('cultura') as CropId) : 'soy';
  const setCrop = (c: string) => setParams((prev) => { const p = new URLSearchParams(prev); if (c === 'soy') p.delete('cultura'); else p.set('cultura', c); return p; });
  return <>
    <div className="row-between" data-tour="mun-crop"><Field label={t('crops.label')} hint={isPlainCrop(crop) ? undefined : CROPS[crop].role}>{(a) => <select className="input" {...a} name="cultura" value={crop} onChange={(e) => setCrop(e.target.value)}>{CROP_IDS.map((id) => <option key={id} value={id}>{CROPS[id].name}{CROPS[id].plantable ? '' : ` ${t('crops.cohortSuffix')}`}</option>)}</select>}</Field></div>
    <SafraCrop key={code + crop} code={code} crop={crop} />
  </>;
}
function SafraCrop({ code, crop }: { code: string; crop: CropId }) {
  const { t } = useI18n(); const name = CROPS[crop].name; const place = placeName(code);
  const here = useAsync((s) => crops.yieldExamples({ crop, municipalityCode: code }, s), [code, crop]); const all = useAsync((s) => crops.yieldExamples({ crop }, s), [crop]); const mlp = useAsync((s) => (crop === 'soy' ? crops.regionalMlp(code, s) : Promise.resolve(null)), [code, crop]);
  if (here.status === 'error') return <ErrorState error={here.error} onRetry={here.retry} />; if (!here.data || all.status === 'loading') return <Loading label={t('municipality.safra.loading', { crop: name, place })} rows={5} />;
  const elsewhere = (all.data ?? []).filter((r) => r.data.municipality_code !== code);
  return <div className="stack" data-testid="safra" data-crop={crop} data-mun={code}>
    <section className="stack" aria-labelledby="h-est"><div className="stack-2"><h2 id="h-est">{t('municipality.safra.title', { crop: name, place })}</h2><p className="meta">{t('municipality.safra.intro')}</p></div>
      {here.data.length ? <div className="grid-2" data-tour="yield-card">{here.data.map((r) => <YieldCard key={r.meta.source + r.data.generated_at} r={r} />)}</div>
        : <Empty title={t('municipality.safra.noneTitle', { crop: name, place })}>{t('municipality.safra.none')}{crop === 'coffee_total_mg' ? ` ${t('municipality.safra.cohort')}` : ''}</Empty>}
    </section>
    {crop === 'soy' && <section className="card"><div className="row-between"><h2>{t('municipality.safra.mlpTitle')}</h2><Pill tone="warn">{t('kind.research')}</Pill></div>
      {!mlp.data ? <Loading rows={2} /> : mlp.data.data.length ? <><div className="table-wrap" tabIndex={0} role="group" aria-label={t('common.tableScroll')}><table><thead><tr><th>{t('municipality.safra.daysAfter')}</th>{mlp.data.data.map((x) => <th className="num" key={x.horizon_days}>{x.horizon_days}</th>)}</tr></thead><tbody><tr><td>{t('municipality.safra.estimate')}</td>{mlp.data.data.map((x) => <td className="num" key={x.horizon_days}>{n0(x.expected_kg_ha)}</td>)}</tr></tbody></table></div><ModelTest cohort="soy" scope="MG+MT" /><Source meta={mlp.data.meta} /></> : <Empty title={t('municipality.safra.noMlp')} />}</section>}
    {elsewhere.length > 0 && <section className="stack" aria-labelledby="h-outros"><div className="stack-2"><h2 id="h-outros">{t('municipality.safra.elsewhereTitle')}</h2><p className="meta">{t('municipality.safra.elsewhere', { crop: name, place })}</p></div><div className="grid-2">{elsewhere.map((r) => <YieldCard key={r.meta.source} r={r} place={`IBGE ${r.data.municipality_code}`} />)}</div></section>}
    <div className="grid-2"><CapabilityTable crop={crop} mun={code} place={place} /><section className="card" aria-labelledby="h-sit"><h2 id="h-sit">{t('crops.statusTitle', { crop: name })}</h2><ModelStatus crop={crop} /></section></div>
    <Notice tone="warn" title={t('municipality.safra.pamTitle')}>{t('municipality.safra.pam')}</Notice>
  </div>;
}
function Imagem({ code }: { code: string }) {
  const { t } = useI18n();
  const im = useAsync((s) => imagery.series(code, s), [code]); const idx = useCoverageIndex(); const withField = placesWithData(idx.index).filter((p) => p.fields.length).map((p) => placeName(p.municipality.id));
  if ((im.error as any)?.code === 'municipality_not_covered') return <Empty title={t('municipality.imagem.noneTitle')}>{withField.length ? t('municipality.imagem.none', { list: withField.join('; ') }) : t('municipality.imagem.noCatalog')}</Empty>;
  if (im.status === 'error') return <ErrorState error={im.error} onRetry={im.retry} />; if (!im.data) return <Loading rows={5} />;
  const d = im.data.data; const byDate = new Map<string, (typeof d.observations)[number]>(); for (const o of d.observations) { const prev = byDate.get(o.date); if (!prev || (prev.ndvi == null && o.ndvi != null) || (o.ndvi != null && o.valid_fraction > prev.valid_fraction)) byDate.set(o.date, o); } const dates = d.rainfall.map((r) => r.date); const valid = d.observations.filter((o) => o.ndvi != null);
  const ndviAt = byDate.get(d.image.date)?.ndvi;
  return <div className="cols">
    <section className="card" data-tour="ndvi-chart"><div className="row-between"><h2>{t('municipality.imagem.title')}</h2><Pill tone="ok">{t('kind.orbital')}</Pill></div>
      <DualChart dates={dates} line={dates.map((x) => (byDate.has(x) ? byDate.get(x)!.ndvi ?? null : undefined))} rejected={dates.map((x) => byDate.has(x) && byDate.get(x)!.ndvi == null)} lineLabel={t('municipality.imagem.lineLabel')} lineDomain={[0, 1]} bars={d.rainfall.map((r) => r.rain_mm)} barsLabel={t('chart.rainDaily')} ariaLabel={t('municipality.imagem.chart', { from: dates[0] ? dFull(dates[0]) : '', to: dates.length ? dFull(dates[dates.length - 1]) : '' })} />
      <p className="meta">{t('municipality.imagem.method', { accepted: d.validation.accepted_scenes, total: d.validation.total_scenes, min: d.validation.min_valid_fraction != null ? t('municipality.imagem.minValid', { pct: pct(d.validation.min_valid_fraction) }) : '', dates: valid.length })}</p>
      <Source meta={im.data.meta} extra={d.observations[0]?.field_pixels ? t('municipality.imagem.pixels', { pixels: d.observations[0].field_pixels, label: d.field.label }) : t('municipality.imagem.polygon', { label: d.field.label })} /></section>
    <aside className="card"><h2>{t('municipality.imagem.imageOf', { date: dFull(d.image.date) })}</h2><img src={d.imageUrl} width={560} height={560} loading="lazy" decoding="async" alt={t('municipality.imagem.alt', { place: placeName(code) })} style={{ width: '100%', height: 'auto', borderRadius: 8, border: '1px solid var(--border)' }} />
      <dl className="kv"><dt>{t('municipality.imagem.product')}</dt><dd>HLS v2 · Sentinel-2 (S30)</dd><dt>{t('municipality.imagem.resolution')}</dt><dd>30 m</dd><dt>{t('municipality.imagem.validPixels')}</dt><dd>{pct(byDate.get(d.image.date)?.valid_fraction)}</dd><dt>{t('municipality.imagem.ndviOn')}</dt><dd>{nMax(ndviAt, 3)}</dd></dl><p className="meta-13" style={{ wordBreak: 'break-all' }}>{t('municipality.imagem.scene', { id: d.image.scene_id })}</p></aside>
  </div>;
}

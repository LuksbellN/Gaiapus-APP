import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsLeft, ChevronsRight, Pause, Play, SkipBack, SkipForward, SlidersHorizontal, StepBack, StepForward } from 'lucide-react';
import { crops, modelLabel, modelScope, weather, type Daily } from '../adapters';
import { dFull, dShort, LAND, n0, n1, n2, pct, signed, STAGE } from '../format';
import { useI18n } from '../i18n';
import { ErrorState, Field, Loading, Notice, Pill, Seg, Source, Stat, Tabs, useAsync, useMedia } from '../ui';
import { PhaseTimeline, type TimelineSeries } from '../ui/PhaseTimeline';
import { ModelTest } from '../ui/SealedTest';
import { CROPS, isCoffee, isCropId, PLANTABLE, type CropId, isPlainCrop } from '../catalog';
import { hasDailySeries, SORRISO } from '../capabilities';
import { CapabilityTable } from '../ui/Crops';
import { useSearchParams } from 'react-router-dom';
import { Field2D, webglAvailable, type FieldState } from '../sim/field-state';
import { LEGACY_SCENE_CAPS, rowsFromDailyScenario, rowsFromProjection, toSceneState, type SceneDailyRow } from '../sim/scene-adapter';
import { profileLayers } from '../sim/profile-model';
import { Profile2D } from '../sim/Profile2D';
import { useLazy } from '../lazyPage';
import { useStore } from '../store';
import { useActiveContext } from '../App';
import { isKnownPlace, placeName, plotElsewhere } from '../context';
const loadField3D = () => import('../sim/Field3D');
const loadProfile3D = () => import('../sim/SoilProfile3D');
import { PlanningSimulator } from './PlanningSimulator';

type Mode = 'historico' | 'cenario' | 'previsao' | 'climatologia';
const MODE: Record<Mode, { tone: 'soil' | 'warn' | 'water' | undefined }> = { historico: { tone: 'soil' }, cenario: { tone: 'warn' }, previsao: { tone: 'water' }, climatologia: { tone: undefined } };
const YEARS = ['2015/2016', '2016/2017', '2017/2018', '2018/2019', '2019/2020', '2020/2021'];
type Row = { etc: number | null; eta: number | null; et0: number; ks: number; drainage: number | null; awf: number };
function slice(d: Daily['scenarios']['brachiaria'], year: string, capacity: number) { const a = d.agricultural_year.indexOf(year), b = d.agricultural_year.lastIndexOf(year) + 1; const s = <T,>(x: T[]) => x.slice(a, b); return { scene: rowsFromDailyScenario({ date: s(d.date), land_cover: s(d.land_cover), stage: s(d.stage), rain_mm: s(d.rain_mm), et0_mm: s(d.et0_mm), etc_mm: s(d.etc_mm), eta_mm: s(d.eta_mm), drainage_mm: s(d.drainage_mm), storage_end_mm: s(d.storage_end_mm), available_water_fraction: s(d.available_water_fraction), ks: s(d.ks) }, capacity) as SceneDailyRow[], dates: s(d.date), rain: s(d.rain_mm), storage: s(d.storage_end_mm), stage: s(d.stage), land: s(d.land_cover), deficit: s(d.et_deficit_mm), covered: s(d.soil_covered), rows: s(d.date).map((_, i): Row => ({ etc: d.etc_mm[a + i], eta: d.eta_mm[a + i], et0: d.et0_mm[a + i], ks: d.ks[a + i], drainage: d.drainage_mm[a + i], awf: d.available_water_fraction[a + i] })) }; }

// A cultura e o município escolhidos decidem os dados. Só a rotação de soja em Sorriso tem série diária no pacote;
// para qualquer outra combinação mostramos o que existe e o que falta, sem curva, fase ou planta inventada.
export function Simulator() {
  const { t, tn } = useI18n();
  const [params, setParams] = useSearchParams(); const crop: CropId = isCropId(params.get('cultura')) ? (params.get('cultura') as CropId) : 'soy'; const mun = /^\d{7}$/.test(params.get('mun') ?? '') ? params.get('mun')! : SORRISO;
  const setCrop = (c: string) => setParams((prev) => { const p = new URLSearchParams(prev); if (c === 'soy') p.delete('cultura'); else p.set('cultura', c); return p; });
  // Season planning 2027/2028 comes from published calculated runs (any place/crop in the catalog), not from fixtures.
  if (params.get('modo') === 'planejamento') return <PlanningSimulator />;
  if (hasDailySeries(crop, mun)) return <SorrisoSimulator onCrop={setCrop} />;
  const place = placeName(mun); const coffee = isCoffee(crop); const stage = params.get('cafezal') === 'implantacao' ? 'implantacao' : 'producao';
  return (
    <div className="page" data-testid="sim-unavailable" data-crop={crop} data-mun={mun}>
      <FromPlan />
      <div className="page-head"><div className="stack-2"><h1>{t('sim.unavailable.title', { crop: CROPS[crop].name, place })}</h1><p>{t('sim.unavailable.subtitle')}</p></div><Pill>{t('sim.unavailable.pill')}</Pill></div>
      <div className="cols">
        <div className="stack">
          <section className="card"><h2>{t('sim.unavailable.choose')}</h2>
            <div className="form-grid"><Field label={t('crops.label')} hint={isPlainCrop(crop) ? undefined : CROPS[crop].role}>{(a) => <select className="input" {...a} name="cultura" value={crop} onChange={(e) => setCrop(e.target.value)}>{PLANTABLE.map((id) => <option key={id} value={id}>{CROPS[id].name}</option>)}</select>}</Field>
              <Field label={t('sim.place')} hint={t('sim.placeHint')}>{(a) => <select className="input" {...a} name="local" value={mun} onChange={(e) => setParams((prev) => { const p = new URLSearchParams(prev); if (e.target.value === SORRISO) p.delete('mun'); else p.set('mun', e.target.value); return p; })}>{[...new Set([SORRISO, '3170206', mun])].map((m) => <option key={m} value={m}>{placeName(m)}</option>)}</select>}</Field></div>
            <div className="row"><a className="btn" href="#/simulador">{t('sim.unavailable.openDemo')}</a><a className="btn btn--primary" href={`#/simulador?modo=planejamento&mun=${mun}&cultura=${crop}`}>{t('sim.planning.open')}</a></div>
          </section>
          {crop === 'maize2' && mun === SORRISO && <Notice title={t('sim.unavailable.maizeTitle')}>{t('sim.unavailable.maize')}</Notice>}
          {coffee && <section className="card" aria-labelledby="h-cafe"><h2 id="h-cafe">{t('sim.coffee.title')}</h2>
            <Seg legend={t('sim.coffee.situation')} name="cafezal" value={stage} onChange={(x) => setParams((prev) => { const p = new URLSearchParams(prev); p.set('cafezal', x); return p; })} options={[{ value: 'producao', label: t('sim.coffee.production') }, { value: 'implantacao', label: t('sim.coffee.planting') }]} />
            {stage === 'implantacao' ? <p>{tn('sim.coffee.plantingText', { notCycle: <b>{t('sim.coffee.notCycle')}</b> })}</p>
              : <p>{t('sim.coffee.productionText')}</p>}
            <div className="row"><a className="btn" href="#/registros?novo=plantio">{stage === 'implantacao' ? t('sim.coffee.recordPlanting') : t('sim.coffee.recordCoffee')}</a><a className="btn" href={`#/municipio?mun=3170206&aba=safra&cultura=${crop}`}>{t('sim.coffee.seeExample')}</a></div>
          </section>}
          <section className="card" data-tour="sim-missing"><h2>{t('sim.unavailable.existsTitle')}</h2><ul className="plain"><li><a href={`#/municipio?mun=${isKnownPlace(mun) ? mun : SORRISO}&aba=safra&cultura=${crop}`}>{t('sim.unavailable.examplesLink')}</a> {t('sim.unavailable.examplesText')}</li><li><a href="#/registros">{t('sim.unavailable.recordsLink')}</a> {t('sim.unavailable.recordsText')}</li><li><a href={`#/planejar?mun=${mun}`}>{t('sim.unavailable.planLink')}</a> {t('sim.unavailable.planText')}</li></ul>
            <h3>{t('sim.unavailable.missingTitle')}</h3><ul className="plain"><li>{t('sim.unavailable.missing1')}</li><li>{t('sim.unavailable.missing2')}</li><li>{t('sim.unavailable.missing3')}</li><li>{t('sim.unavailable.missing4')}</li></ul>
          </section>
        </div>
        <CapabilityTable crop={crop} mun={mun} place={place} />
      </div>
    </div>
  );
}
function SorrisoSimulator({ onCrop }: { onCrop: (c: string) => void }) {
  const { t, tn } = useI18n(); const ctx = useActiveContext(); const elsewhere = plotElsewhere({ code: SORRISO, name: placeName(SORRISO), origin: 'demo' }, ctx);
  const daily = useAsync((s) => weather.dailySeries('5107925', s), []); const proj = useAsync((s) => weather.waterProjection('5107925', s), []); const yld = useAsync((s) => crops.yieldEstimate({ crop: 'soy', municipalityCode: '5107925' }, s), []);
  // Configuração na URL (?modo=&ano=&ab=&secao=): o link reabre o mesmo cenário e voltar/avançar percorre as trocas.
  const [params, setParams] = useSearchParams(); const put = (kv: Record<string, string | null>) => setParams((prev) => { const p = new URLSearchParams(prev); for (const [k, v] of Object.entries(kv)) { if (v == null) p.delete(k); else p.set(k, v); } return p; });
  const mode: Mode = (Object.keys(MODE) as Mode[]).find((m) => m === params.get('modo')) ?? 'historico'; const setMode = (m: Mode) => put({ modo: m === 'historico' ? null : m });
  const year = YEARS.find((y) => y.replace('/', '-') === params.get('ano')) ?? '2020/2021'; const setYear = (y: string) => put({ ano: y === '2020/2021' ? null : y.replace('/', '-') });
  const compare = params.get('ab') === '1'; const setCompare = (v: boolean) => put({ ab: v ? '1' : null }); const [cursor, setCursor] = useState(() => Math.max(0, (Number(params.get('dia')) || 1) - 1)); const [playing, setPlaying] = useState(false); const [speed, setSpeed] = useState(14);
  const [collapsed, setCollapsed] = useState(false); const tab = (['campo', 'indicadores', 'configurar'] as const).find((t) => t === params.get('secao')) ?? 'campo'; const setTab = (t: 'campo' | 'indicadores' | 'configurar') => put({ secao: t === 'campo' ? null : t }); const mobile = useMedia('(max-width: 760px)'); const [gl] = useState(webglAvailable); const view = params.get('vista') === 'perfil' ? 'perfil' : 'talhao'; const setView = (v: 'talhao' | 'perfil') => put({ vista: v === 'talhao' ? null : v }); const stake = params.get('estaca') !== '0'; const setStake = (on: boolean) => put({ estaca: on ? null : '0' }); const showRoots = params.get('raizes') !== '0'; const cutaway = params.get('corte') !== '0'; const field3d = useLazy(loadField3D, gl && view === 'talhao'); const profile3d = useLazy(loadProfile3D, gl && view === 'perfil'); const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const seed = useMemo(() => Number(new URLSearchParams(location.hash.split('?')[1] ?? '').get('seed') ?? 7), []);

  const model = useMemo(() => {
    if (!daily.data || !proj.data) return null; const cap = daily.data.data.capacity_mm;
    if (mode === 'historico' || mode === 'cenario') {
      const A = slice(daily.data.data.scenarios[mode === 'historico' ? 'reference_fallow' : 'brachiaria'], year, cap), B = slice(daily.data.data.scenarios[mode === 'historico' ? 'brachiaria' : 'reference_fallow'], year, cap);
      const series: TimelineSeries = { dates: A.dates, rain: A.rain, storage: A.storage, stage: A.stage, land: A.land, deficit: A.deficit, capacity: cap, ...(compare ? { storageB: B.storage, landB: B.land } : {}) };
      return { series, A, B: compare ? B : null, names: mode === 'historico' ? [`A · ${t('sim.names.fallow')}`, `B · ${t('sim.names.brachiaria')}`] : [`A · ${t('sim.names.brachiaria')}`, `B · ${t('sim.names.fallow')}`] };
    }
    const p = proj.data.data; const mk = (days: typeof p.days) => ({ scene: rowsFromProjection(days, p.soil.capacity_mm), dates: days.map((d) => d.date), rain: days.map((d) => d.rain_mm), storage: days.map((d) => d.storage_end_mm), stage: days.map((d) => d.phase), land: days.map(() => 'soy'), deficit: days.map((d) => d.et_deficit_mm), covered: days.map(() => 1), rows: days.map((d): Row => ({ etc: null, eta: null, et0: d.et0_mm, ks: d.ks, drainage: null, awf: d.available_water_fraction })) });
    const A = mk(mode === 'previsao' ? p.days : p.reference_days), B = mk(mode === 'previsao' ? p.reference_days : p.days);
    return { series: { dates: A.dates, rain: A.rain, storage: A.storage, stage: A.stage, land: A.land, deficit: A.deficit, capacity: p.soil.capacity_mm, ...(compare ? { storageB: B.storage } : {}) } as TimelineSeries, A, B: compare ? B : null, names: mode === 'previsao' ? [`A · ${t('kind.forecast')}`, `B · ${t('sim.mode.climatologia')}`] : [`A · ${t('sim.mode.climatologia')}`, `B · ${t('kind.forecast')}`] };
  }, [daily.data, proj.data, mode, year, compare, t]); // eslint-disable-line
  const n = model?.series.dates.length ?? 1; const c = Math.min(cursor, n - 1);
  useEffect(() => { if (!model) return; setCursor((v) => Math.min(v, n - 1)); setPlaying(false); }, [n, mode, year, !!model]); // eslint-disable-line
  // The selected day goes into the link (1-based ?dia=), replacing history instead of stacking one entry per step (D-27).
  useEffect(() => { if (!model || playing) return; const want = c > 0 ? String(c + 1) : null; if (params.get('dia') !== want) setParams((prev) => { const p = new URLSearchParams(prev); if (want) p.set('dia', want); else p.delete('dia'); return p; }, { replace: true }); }, [c, playing, !!model]); // eslint-disable-line
  // Um único cursor temporal dirige gráfico, fase, cena e números.
  const last = useRef(0);
  useEffect(() => { if (!playing) return; let raf = 0; let acc = 0; last.current = performance.now(); const tick = (t: number) => { acc += ((t - last.current) / 1000) * speed; last.current = t; if (acc >= 1) { const step = Math.floor(acc); acc -= step; setCursor((v) => { if (v + step >= n - 1) { setPlaying(false); return n - 1; } return v + step; }); } raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [playing, speed, n]);

  const phaseStarts = useMemo(() => { if (!model) return []; const out: number[] = [0]; for (let i = 1; i < n; i++) if (model.A.stage[i] !== model.A.stage[i - 1] || model.A.land[i] !== model.A.land[i - 1]) out.push(i); return out; }, [model, n]);
  if (daily.status === 'error' || proj.status === 'error') return <div className="page"><h1>{t('nav.item.simulador')}</h1><ErrorState error={daily.error ?? proj.error} onRetry={() => { daily.retry(); proj.retry(); }} /></div>;
  if (!model) return <div className="page"><h1>{t('nav.item.simulador')}</h1><Loading rows={6} /></div>;
  const { A, B } = model; const row = A.rows[c]; const start = [...phaseStarts].reverse().find((i) => i <= c) ?? 0; const end = (phaseStarts.find((i) => i > c) ?? n) - 1;
  const fs: FieldState = { land: A.land[c], stage: A.stage[c], progress: end > start ? (c - start) / (end - start) : 1, awf: row.awf, rain: A.rain[c], covered: !!A.covered[c] };
  const cum = (arr: number[]) => arr.slice(0, c + 1).reduce((a, b) => a + b, 0); const stressDays = A.rows.slice(0, c + 1).filter((r) => r.ks < 1).length;
  // Same day, same row: the profile view reads the published row through the scene adapter, never recomputing.
  const scene = toSceneState(A.scene[c], LEGACY_SCENE_CAPS); const layers = profileLayers(scene, fs.progress, { device: stake, roots: showRoots }); const deviceText = { electrode: (depth: number) => t(layers.device?.readings === 'model_layers' ? 'sim.profile.electrodeModel' : 'sim.profile.electrodeNone', { depth }), led: t('sim.profile.led'), roots: { illustrative: t('sim.profile.rootsIllustrative'), depth: (cm: number, source: 'modelled' | 'observed') => t('sim.profile.rootDepth', { cm, source: t(source === 'observed' ? 'sim.profile.sourceObserved' : 'sim.profile.sourceModelled') }), continues: (cm: number) => t('sim.profile.rootContinues', { cm }) } }; const capacity = A.scene[c].capacity_mm;
  const profileLabel = `${t('sim.profile.label', { date: dFull(A.dates[c]), land: LAND[fs.land], stage: STAGE[fs.stage], reserve: scene.waterFraction == null ? t('sim.profile.unknownWater') : pct(scene.waterFraction) })}${gl && profile3d.mod ? ` ${t('sim.fieldKeys')}` : ''}`;
  const active = view === 'perfil' ? profile3d : field3d;
  const label = `${t('sim.fieldLabel', { date: dFull(A.dates[c]), land: LAND[fs.land], stage: STAGE[fs.stage], reserve: pct(fs.awf) })}${gl && field3d.mod ? ` ${t('sim.fieldKeys')}` : ''}`;
  const pd = proj.data?.data.days; const modeDesc = mode === 'previsao' && pd ? t('sim.modeDesc.previsao', { from: dShort(pd[0].date), to: dFull(pd[pd.length - 1].date) }) : t(`sim.modeDesc.${mode}`);
  const jump = (dir: 1 | -1) => setCursor(dir === 1 ? (phaseStarts.find((i) => i > c) ?? n - 1) : ([...phaseStarts].reverse().find((i) => i < c) ?? 0));
  const long = mode === 'historico' || mode === 'cenario';
  return (
    <div className="sim" data-tab={tab} data-mode={mode}>
      <h1 className="sr-only">{t('sim.title', { place: placeName(SORRISO) })}</h1>
      {mobile && <div className="sim__tabs"><Tabs label={t('sim.sections')} value={tab} onChange={setTab} tabs={[{ id: 'campo', label: t('sim.tab.campo') }, { id: 'indicadores', label: t('sim.tab.indicadores') }, { id: 'configurar', label: t('sim.tab.configurar') }]} /></div>}
      <aside className="sim__config" id="panel-configurar" data-collapsed={collapsed && !mobile} aria-label={t('sim.config')}>
        {!mobile && <button className={collapsed ? 'icon-btn' : 'btn btn--sm'} aria-expanded={!collapsed} aria-label={collapsed ? t('sim.openConfig') : undefined} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <SlidersHorizontal size={20} aria-hidden /> : <><ChevronsLeft size={16} aria-hidden />{t('sim.collapseConfig')}</>}</button>}
        {(!collapsed || mobile) && <>
          <FromPlan />
          {elsewhere && <div data-testid="scope-strip"><Notice tone="warn" title={t('sim.demoTitle')}>{t('sim.elsewhere', { plot: elsewhere.plot, place: elsewhere.place })}</Notice></div>}
          <Field label={t('crops.label')} hint={t('sim.cropHint')}>{(p) => <select className="input" {...p} name="cultura" value="soy" onChange={(e) => onCrop(e.target.value)}>{PLANTABLE.map((id) => <option key={id} value={id}>{CROPS[id].name}</option>)}</select>}</Field>
          <Field label={t('sim.place')}>{(p) => <select className="input" {...p} defaultValue="5107925"><option value="5107925">{placeName(SORRISO)} (IBGE 5107925)</option><option disabled>{t('sim.otherPlaces')}</option></select>}</Field>
          <div data-tour="sim-mode"><Seg legend={t('sim.dataType')} name="modo" value={mode} onChange={(m) => { setMode(m); setCursor(0); }} options={(Object.keys(MODE) as Mode[]).map((m) => ({ value: m, label: t(`sim.mode.${m}`) }))} /></div>
          <p className="meta">{modeDesc}</p>
          <a className="btn btn--primary btn--sm" data-testid="open-planning" href="#/simulador?modo=planejamento&mun=5107925&cultura=soy">{t('sim.planning.open')}</a>
          {long && <div data-tour="sim-year"><Field label={t('municipality.clima.year')} hint={t('sim.yearHint')}>{(p) => <select className="input" {...p} value={year} onChange={(e) => { setYear(e.target.value); setCursor(0); }}>{YEARS.map((y) => <option key={y}>{y}</option>)}</select>}</Field></div>}
          <label className="check" data-tour="sim-ab"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /><span><b>{t('sim.compare')}</b><br /><span className="meta-13">{t('sim.compareWith', { a: model.names[0], b: model.names[1] })}</span></span></label>
          <div className="card card--flat"><h3>{t('sim.hyp.title')}</h3><dl className="kv"><dt>{t('sim.hyp.rotation')}</dt><dd>{t('sim.hyp.rotationValue')}</dd><dt>{t('sim.hyp.soil')}</dt><dd>AD4 · 55 mm</dd><dt>{t('sim.hyp.reserve')}</dt><dd>{long ? t('sim.hyp.continuous') : t('sim.hyp.assumed')}</dd><dt>{t('sim.hyp.irrigation')}</dt><dd>{t('sim.hyp.noIrrigation')}</dd></dl><p className="meta-13">{t('sim.hyp.note')}</p></div>
          <Notice title={t('sim.coffeeNoteTitle')}>{t('sim.coffeeNote')}</Notice>
        </>}
      </aside>
      <div className="sim__stage" id="panel-campo">
        {view === 'talhao'
          ? (gl && field3d.mod ? <field3d.mod.default state={fs} seed={seed} label={label} /> : gl && !field3d.failed ? <div className="sim__loading" role="status"><span className="spinner" aria-hidden /><span>{t('sim.loading3d')}</span></div> : <Field2D state={fs} label={label} />)
          : (gl && profile3d.mod ? <profile3d.mod.default layers={layers} label={profileLabel} reducedMotion={reduced} deviceText={deviceText} cutaway={cutaway} /> : gl && !profile3d.failed ? <div className="sim__loading" role="status"><span className="spinner" aria-hidden /><span>{t('sim.profile.loading')}</span></div> : <Profile2D scene={scene} layers={layers} label={profileLabel} zoneLabel={t('sim.profile.zoneMean')} deviceText={deviceText} />)}
        {gl && active.failed && <div className="sim__retry"><span>{t('sim.no3d')}</span><button className="btn btn--sm" onClick={active.retry}>{t('common.retry')}</button></div>}
        <div className="sim__overlay"><div className="sim__views" data-testid="sim-views"><Seg legend={t('sim.view.legend')} name="vista" value={view} onChange={setView} options={[{ value: 'talhao', label: t('sim.view.field') }, { value: 'perfil', label: t('sim.view.profile') }]} />{view === 'perfil' && <label className="check sim__stake"><input type="checkbox" checked={stake} onChange={(e) => setStake(e.target.checked)} /><span>{t('sim.profile.deviceToggle')}</span></label>}{view === 'perfil' && <label className="check sim__stake"><input type="checkbox" checked={showRoots} onChange={(e) => put({ raizes: e.target.checked ? null : '0' })} /><span>{t('sim.profile.rootsToggle')}</span></label>}{view === 'perfil' && <label className="check sim__stake"><input type="checkbox" checked={cutaway} onChange={(e) => put({ corte: e.target.checked ? null : '0' })} /><span>{t('sim.profile.cutawayToggle')}</span></label>}</div><Pill tone={MODE[mode].tone}>{t(`sim.mode.${mode}`)}</Pill><Pill>{dFull(A.dates[c])}</Pill><Pill>{LAND[fs.land]} · {STAGE[fs.stage]}</Pill></div>
        <p className="sim__caption">{view === 'perfil' ? t('sim.profile.caption') : t('sim.caption')}</p>
      </div>
      <div className="sim__timeline">
        <div className="transport" role="group" aria-label={t('sim.transport.label')}>
          <button className="icon-btn" aria-label={t('sim.transport.prevPhase')} onClick={() => jump(-1)}><SkipBack size={18} aria-hidden /></button>
          <button className="icon-btn" aria-label={t('sim.transport.back')} onClick={() => setCursor(Math.max(0, c - 1))}><StepBack size={18} aria-hidden /></button>
          <button className="btn btn--primary" onClick={() => { if (c >= n - 1) setCursor(0); setPlaying(!playing); }} aria-pressed={playing}>{playing ? <><Pause size={18} aria-hidden />{t('sim.transport.pause')}</> : <><Play size={18} aria-hidden />{t('sim.transport.play')}</>}</button>
          <button className="icon-btn" aria-label={t('sim.transport.forward')} onClick={() => setCursor(Math.min(n - 1, c + 1))}><StepForward size={18} aria-hidden /></button>
          {long && <button className="btn btn--sm" onClick={() => setCursor(Math.min(n - 1, c + 7))}>{t('sim.transport.week')}</button>}
          <button className="icon-btn" aria-label={t('sim.transport.nextPhase')} onClick={() => jump(1)}><SkipForward size={18} aria-hidden /></button>
          {long && <label className="row meta" style={{ marginLeft: 'auto' }}>{t('sim.transport.speed')}<select className="input input--sm" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value={7}>{t('sim.transport.speed1w')}</option><option value={14}>{t('sim.transport.speed2w')}</option><option value={30}>{t('sim.transport.speed1m')}</option></select></label>}
        </div>
        <div data-tour="sim-timeline"><PhaseTimeline series={model.series} cursor={c} onCursor={(i) => { setPlaying(false); setCursor(i); }} labelA={compare ? t('sim.reserveOf', { name: model.names[0] }) : t('timeline.reserve')} labelB={compare ? t('sim.reserveOf', { name: model.names[1] }) : undefined} ariaLabel={t('sim.timelineLabel')} height={mobile ? 170 : 190} /></div>
      </div>
      <aside className="sim__results" id="panel-indicadores" aria-label={t('sim.results')} aria-live="off">
        <div className="stack-2"><h2>{dFull(A.dates[c])}</h2><p className="meta">{LAND[fs.land]} · {STAGE[fs.stage]} · {t('sim.dayOf', { day: c + 1, total: n })}</p></div>
        <div className="card"><h3>{t('sim.day.title')}</h3><dl className="kv">
          <dt>{t('sim.day.rain')}</dt><dd>{n1(A.rain[c])} mm</dd><dt>{t('sim.day.et0')}</dt><dd>{n1(row.et0)} mm</dd>
          <dt>{t('sim.day.etc')}</dt><dd>{row.etc == null ? t('common.notProvided') : `${n1(row.etc)} mm`}</dd><dt>{t('sim.day.eta')}</dt><dd>{row.eta == null ? t('common.notProvided') : `${n1(row.eta)} mm`}</dd>
          <dt>{t('sim.day.deficit')}</dt><dd>{n2(A.deficit[c])} mm</dd><dt>{t('timeline.reserve')}</dt><dd>{n1(A.storage[c])} mm · {pct(row.awf)}</dd>
          {row.drainage != null && <><dt>{t('sim.day.drainage')}</dt><dd>{n1(row.drainage)} mm</dd></>}
        </dl><div>{row.ks < 1 ? <Pill tone="warn">{t('water.belowIdealLong')}</Pill> : <Pill tone="ok">{t('water.enoughLong')}</Pill>}</div></div>
        {view === 'perfil' && <div className="card" data-testid="profile-notes"><h3>{t('sim.view.profile')}</h3><p className="meta-13">{t('sim.profile.noDepth', { capacity: n0(capacity ?? 0) })}</p><p className="meta-13">{t('sim.profile.stressLegend')}</p>{layers.rootSystem && <p className="meta-13" data-testid="roots-note">{layers.rootSystem.source === 'illustrative' ? t('sim.profile.rootsNote') : t('sim.profile.rootsCalculatedNote', { cm: Math.round((layers.rootSystem.depthLabelM ?? 0) * 100), source: t(layers.rootSystem.source === 'observed' ? 'sim.profile.sourceObserved' : 'sim.profile.sourceModelled') })}</p>}{stake && <p className="meta-13" data-testid="device-note">{t('sim.profile.deviceNote')}</p>}</div>}
        <div className="card"><h3>{t('sim.cum.title')}</h3><div className="grid-2"><Stat label={t('sim.day.rain')} value={n0(cum(A.rain))} unit="mm" /><Stat label={t('sim.day.deficit')} value={n1(cum(A.deficit))} unit="mm" /><Stat label={t('sim.cum.stressDays')} value={stressDays} /><Stat label={t('sim.cum.days')} value={c + 1} /></div></div>
        {B && <div className="card"><h3>{t('sim.diff.title', { b: model.names[1].slice(0, 1), a: model.names[0].slice(0, 1) })}</h3><dl className="kv"><dt>{t('timeline.reserve')}</dt><dd>{signed(B.storage[c] - A.storage[c])} mm</dd><dt>{t('sim.diff.deficit')}</dt><dd>{signed(cum(B.deficit) - cum(A.deficit))} mm</dd><dt>{t('sim.diff.coverB')}</dt><dd>{LAND[B.land[c]]}</dd></dl></div>}
        <div className="card" data-tour="sim-limits"><div className="row-between"><h3>{t('sim.yield.title')}</h3><Pill tone="soil">{t('kind.retrospective')}</Pill></div>
          {yld.data ? <><Stat label={t('overview.yield.label', { crop: t('crop.soy'), year: yld.data.data.harvest_year })} value={n0(yld.data.data.estimate_kg_ha)} unit="kg/ha" note={t('sim.yield.mae', { mae: n0(yld.data.data.validation?.mae_kg_ha) })} /><p className="meta-13">{t('sim.yield.text', { model: modelLabel(yld.data.data.model), version: yld.data.data.model.version })}</p><ModelTest cohort="soy" scope={modelScope(yld.data.data.model)} /></> : <Loading rows={2} />}</div>
        <div className="card"><h3>{t('sim.eco.title')}</h3><p className="meta">{tn('sim.eco.text', { link: <a href="#/planejar">{t('nav.item.planejar')}</a> })}</p></div>
        {daily.data && <Source meta={long ? daily.data.meta : proj.data!.meta} />}
      </aside>
    </div>
  );
}

/** When opened from "Salvar e abrir no simulador": say what came from the plan and what did not (D-14). */
function FromPlan() {
  const [params] = useSearchParams(); const id = params.get('plano'); const plan = useStore((s) => (id ? s.plans.find((p) => p.id === id) : undefined)); const { t } = useI18n();
  if (!plan) return null;
  return <div data-testid="from-plan"><Notice title={t('sim.fromPlan.title', { date: dFull(plan.createdAt.slice(0, 10)) })}>{t('sim.fromPlan.text')} <a href={`#/planejar?plano=${plan.id}${plan.data.municipio ? `&mun=${plan.data.municipio}` : ''}`}>{t('sim.fromPlan.back')}</a></Notice></div>;
}

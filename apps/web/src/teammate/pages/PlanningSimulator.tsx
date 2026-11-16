// Season planning (future harvest years): calculated, published runs from the API /v1/simulations.
// The person chooses place, crop, harvest year and climate trajectory on the screen; nothing depends on editing the address.
// One identity per displayed day: run_id + climate member + date drive the timeline, the panel and the scenes.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pause, Play, StepBack, StepForward } from 'lucide-react';
import type { SimulationCapability, SimulationPlaceCapabilities, SimulationYield } from '@gaiapus/contracts';
import { simulations } from '../adapters/simulations';
import { CROPS, isCropId } from '../catalog';
import { dFull, LAND, n0, n1, pct, STAGE } from '../format';
import { useI18n, type MessageKey } from '../i18n';
import { ErrorState, Field, Loading, Notice, Pill, Seg, Tabs, useAsync, useMedia } from '../ui';
import { PhaseTimeline, type TimelineSeries } from '../ui/PhaseTimeline';
import { PlacePicker, type PickItem } from '../ui/PlacePicker';
import { Field2D, fieldNotes, phaseProgress, SceneBoundary, webglAvailable, type FieldState } from '../sim/field-state';
import { phaseRunAt } from '../sim/visual-state';
import { comparableRuns, coverageOf, cycleDay, dayInfo, highestSatisfaction, memberOf, memberRows, planningHref, planningPlaceId, seasonIndex, seasonOf, selectPublication, waterSatisfaction, type MemberRole } from '../sim/planning-model';
import { profileLayers } from '../sim/profile-model';
import { Profile2D } from '../sim/Profile2D';
import { toSceneState, LEGACY_SCENE_CAPS } from '../sim/scene-adapter';
import { useLazy } from '../lazyPage';
import { isKnownPlace, placeName } from '../context';
import { useStore } from '../store';

const loadField3D = () => import('../sim/Field3D');
const loadProfile3D = () => import('../sim/SoilProfile3D');
const ROLES: MemberRole[] = ['central', 'dry', 'wet'];
type Tab = 'campo' | 'indicadores' | 'configurar';
type Put = (kv: Record<string, string | null>, replace?: boolean) => void;

const codeOf = (id: string) => id.split(':')[2] ?? id;
const shiftDate = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

function useCropName() {
  const { t } = useI18n();
  return (id: string) => (isCropId(id) ? CROPS[id].name : id === 'maize' || id === 'wheat_winter' ? t(`sim.planning.cropNames.${id}`) : id);
}
const placeLabelOf = (p: SimulationPlaceCapabilities) => { const code = codeOf(p.location_id); return p.location_id.startsWith('BR:') && isKnownPlace(code) ? placeName(code).split(', ')[0]! : p.name; };
const pickItem = (p: SimulationPlaceCapabilities): PickItem => {
  const [country, scheme, code] = p.location_id.split(':') as [string, string, string];
  const admin1 = country === 'BR' && isKnownPlace(code) ? placeName(code).split(', ')[1] ?? p.state_code : p.state_code;
  return { id: p.location_id, country, admin1, name: placeLabelOf(p), code, scheme };
};

/** Two entries of the same simulator: future seasons (calculated runs) and past seasons (the Sorriso example). */
export function SimulatorSwitch({ active, planningHref: href }: { active: 'planejamento' | 'historico'; planningHref?: string }) {
  const { t } = useI18n();
  return (
    <nav className="sim-switch" aria-label={t('sim.planning.switchLabel')}>
      <a href={href ?? '#/simulador?modo=planejamento'} aria-current={active === 'planejamento' ? 'page' : undefined} data-testid="open-planning">{t('sim.planning.switchFuture')}</a>
      <a href="#/simulador?modo=historico" aria-current={active === 'historico' ? 'page' : undefined} title={t('sim.planning.switchPastHint')}>{t('sim.planning.switchPast')}</a>
    </nav>
  );
}

export function PlanningSimulator() {
  const { t } = useI18n(); const cropName = useCropName();
  const [params, setParams] = useSearchParams();
  const put: Put = (kv, replace) => setParams((prev) => { const p = new URLSearchParams(prev); for (const [k, v] of Object.entries(kv)) { if (v == null) p.delete(k); else p.set(k, v); } return p; }, replace ? { replace: true } : undefined);
  const mobile = useMedia('(max-width: 760px)');
  const tab: Tab = (['campo', 'indicadores', 'configurar'] as const).find((x) => x === params.get('secao')) ?? 'campo';
  const locationId = planningPlaceId(params);
  const catalog = useAsync((s) => simulations.capabilities({}, s), []);
  const places = catalog.data?.places ?? [];
  const place = places.find((p) => p.location_id === locationId) ?? null;
  const cropIds = useMemo(() => [...new Set((place?.capabilities ?? []).map((c) => c.crop_id))], [place]);
  const hasResult = (c: SimulationCapability) => coverageOf(c).state === 'daily_series' || coverageOf(c).state === 'yield_only';
  const crop = params.get('cultura') ?? cropIds.find((id) => place!.capabilities.some((c) => c.crop_id === id && hasResult(c))) ?? cropIds[0] ?? 'soy';
  const years = useMemo(() => { const own = [...new Set((place?.capabilities ?? []).map((c) => c.harvest_year))].sort((a, b) => a - b); return own.length ? own : catalog.data?.harvest_years ?? []; }, [place, catalog.data]);
  const capOf = (y: number) => place?.capabilities.find((c) => c.crop_id === crop && c.harvest_year === y) ?? null;
  // Without a year in the address, open the first year that has the daily simulation for this crop.
  const year = Number(params.get('safra')) || years.find((y) => coverageOf(capOf(y)).dailySeries) || years.find((y) => coverageOf(capOf(y)).yieldResult) || years[0] || 2027;
  const cap = capOf(year); const cover = coverageOf(cap);
  const pubs = useAsync((s) => (place ? simulations.regional({ location_id: locationId }, s) : Promise.resolve(null)), [locationId, !!place]);
  // While a new place loads, the hook still holds the previous answer: only publications of this place are eligible.
  const own = useMemo(() => (pubs.data?.items ?? []).filter((p) => p.location_id === locationId), [pubs.data, locationId]);
  const chosen = cover.dailySeries ? selectPublication(own, crop, year) : null;
  const run = useAsync((s) => (chosen ? simulations.run(chosen.run_id, s) : Promise.resolve(null)), [chosen?.run_id]);
  const series = useAsync((s) => (chosen ? simulations.series(chosen.run_id, s) : Promise.resolve(null)), [chosen?.run_id]);
  const placeLabel = place ? placeLabelOf(place) : locationId.startsWith('BR:') ? placeName(codeOf(locationId)) : locationId;
  const cropLabel = cropName(crop);
  const title = t('sim.planning.title', { crop: cropLabel, place: placeLabel });
  const items = useMemo(() => places.map(pickItem), [places]);
  const pickPlace = (id: string) => put({ local: id, mun: null, cultura: null, safra: null, dia: null, membro: null, periodo: null });
  const missing = cropIds.filter((id) => !place!.capabilities.some((c) => c.crop_id === id && hasResult(c)));
  const reasonOf = (id: string) => place?.capabilities.find((c) => c.crop_id === id && c.reason_code)?.reason_code ?? 'unsupported';

  const where = (
    <div className="stack-2" data-tour="plan-where">
      {items.length > 0 && <PlacePicker items={items} value={place?.location_id ?? null} onPick={pickPlace} />}
      {place && <Field label={t('crops.label')}>{(a) => <select className="input" {...a} name="cultura" value={crop} onChange={(e) => put({ cultura: e.target.value, safra: null, dia: null, periodo: null })}>
        {!cropIds.includes(crop) && <option value={crop}>{cropLabel}</option>}
        {cropIds.map((id) => <option key={id} value={id} disabled={missing.includes(id)}>{missing.includes(id) ? t('sim.planning.cropNotCalculated', { crop: cropName(id) }) : cropName(id)}</option>)}</select>}</Field>}
      {missing.length > 0 && <details data-testid="planning-crops-missing"><summary className="meta">{t('sim.planning.cropsMissing', { count: missing.length })}</summary>
        <ul className="plain">{missing.map((id) => <li key={id}>{cropName(id)}: {t(`sim.planning.reasons.${reasonOf(id)}` as MessageKey)}.</li>)}</ul></details>}
      {years.length > 0 && <Seg legend={t('sim.planning.harvestYear')} name="safra" value={String(year)} onChange={(v) => put({ safra: v, dia: null, periodo: null })} options={years.map((yy) => ({ value: String(yy), label: String(yy) }))} />}
    </div>
  );
  const shell = (body: ReactNode, extra?: ReactNode) => (
    <div className="sim" data-mode="planejamento" data-tab={tab} data-state="message">
      {mobile ? <div className="sim__tabs"><h1 className="sim__title">{title}</h1><Tabs label={t('sim.sections')} value={tab === 'indicadores' ? 'campo' : tab} onChange={(x) => put({ secao: x === 'campo' ? null : x })} tabs={[{ id: 'campo', label: t('sim.tab.campo') }, { id: 'configurar', label: t('sim.tab.configurar') }]} /></div> : null}
      <aside className="sim__config" id="panel-configurar" aria-label={t('sim.config')}>
        <SimulatorSwitch active="planejamento" />
        {!mobile && <h1 className="sim__title">{title}</h1>}
        <FromPlanNote />
        {where}{extra}
      </aside>
      <div className="sim__stage sim__stage--message" id="panel-campo">{body}</div>
    </div>
  );

  if (catalog.status === 'error') return shell(<ErrorState error={catalog.error} onRetry={catalog.retry} />);
  if (!catalog.data) return shell(<Loading rows={4} label={t('sim.planning.loading')} />);
  if (!place) return shell(<div data-testid="planning-unavailable"><Notice tone="warn" title={t('sim.planning.unavailableTitle')}>{t('sim.planning.noPlace', { places: places.map(placeLabelOf).join(', ') })}</Notice></div>);
  if (cover.state === 'yield_only' && cover.yieldResult) {
    return shell(
      <div className="stack" data-testid="planning-yield-only">
        <Notice title={t('sim.planning.yieldOnlyTitle')}>{t('sim.planning.yieldOnlyText', { crop: cropLabel, place: placeLabel, year, reason: t(`sim.planning.reasons.${cover.reason ?? 'source_unavailable'}` as MessageKey) })}</Notice>
        <YieldCard y={cover.yieldResult as SimulationYield} />
      </div>,
    );
  }
  if (!cover.dailySeries) {
    return shell(
      <div className="stack" data-testid="planning-unavailable">
        <Notice tone="warn" title={t('sim.planning.unavailableTitle')}>{cropLabel}: {t(`sim.planning.reasons.${cover.reason ?? 'unsupported'}` as MessageKey)}.</Notice>
        <ul className="plain">{place.capabilities.filter((c) => c.harvest_year === year).map((c) => <li key={c.crop_id}><a href={`${planningHref(locationId, c.crop_id)}&safra=${year}`}>{cropName(c.crop_id)}</a> · {hasResult(c) ? t('sim.planning.mode') : t(`sim.planning.reasons.${c.reason_code ?? 'unsupported'}` as MessageKey)}</li>)}</ul>
      </div>,
    );
  }
  if (run.status === 'error' || series.status === 'error' || pubs.status === 'error') return shell(<ErrorState error={run.error ?? series.error ?? pubs.error} onRetry={() => { run.retry(); series.retry(); pubs.retry(); }} />);
  if (!chosen && pubs.status === 'ok') return shell(<div data-testid="planning-unavailable"><Notice tone="warn" title={t('sim.planning.unavailableTitle')}>{cropLabel}: {t('sim.planning.reasons.source_unavailable')}.</Notice></div>);
  // One identity on screen: the chosen publication, its run and its series, for this place, crop and harvest year. Anything else is a late answer.
  const current = chosen && run.data && series.data && run.data.run_id === chosen.run_id && series.data.run_id === chosen.run_id && run.data.location_id === locationId && seasonOf(run.data, crop, year) ? { run: run.data, series: series.data } : null;
  if (!current) return shell(<Loading rows={5} label={t('sim.planning.loading')} />);
  const siblings = place.capabilities.filter((c) => c.harvest_year === year && coverageOf(c).dailySeries).map((c) => c.crop_id);
  return <PlanningView key={`${current.run.run_id}:${crop}:${year}`} run={current.run} series={current.series} crop={crop} year={year} title={title} placeLabel={placeLabel} cropLabel={cropLabel}
    put={put} params={params} where={where} tab={tab} mobile={mobile} locationId={locationId} siblings={siblings} publications={own} />;
}

type Run = NonNullable<Awaited<ReturnType<typeof simulations.run>>>;
type Series = NonNullable<Awaited<ReturnType<typeof simulations.series>>>;
type Publications = NonNullable<Awaited<ReturnType<typeof simulations.regional>>>['items'];
type ViewProps = { run: Run; series: Series; crop: string; year: number; title: string; placeLabel: string; cropLabel: string; put: Put; params: URLSearchParams; where: ReactNode; tab: Tab; mobile: boolean;
  locationId: string; siblings: string[]; publications: Publications };

function PlanningView({ run, series, crop, year, title, placeLabel, cropLabel, put, params, where, tab, mobile, locationId, siblings, publications }: ViewProps) {
  const { t } = useI18n();
  const role = (ROLES.find((r) => r === params.get('membro')) ?? 'central') as MemberRole;
  const season = seasonOf(run, crop, year);
  const window = seasonIndex(series, run, crop, year);
  const n = series.dates.length;
  // Season window: one month before sowing (the water the crop starts with) to two weeks after harvest.
  const span = useMemo(() => { if (!window) return { from: 0, to: n - 1 }; return { from: Math.max(0, window.start - 30), to: Math.min(n - 1, window.end + 14) }; }, [window, n]);
  const linked = Number(params.get('dia')); const linkedOutside = linked > 0 && (linked - 1 < span.from || linked - 1 > span.to);
  // A link to a day outside the season opens the whole run: the day asked for is never silently moved.
  const [whole, setWhole] = useState(() => params.get('periodo') === 'tudo' || linkedOutside || !window);
  const from = whole ? 0 : span.from, to = whole ? n - 1 : span.to;
  const [cursor, setCursor] = useState(() => (linked > 0 ? Math.min(n - 1, linked - 1) : window?.start ?? 0));
  const [playing, setPlaying] = useState(false); const [copied, setCopied] = useState(false);
  const view = params.get('vista') === 'perfil' ? 'perfil' : 'talhao';
  const [gl] = useState(webglAvailable);
  const field3d = useLazy(loadField3D, gl && view === 'talhao'); const profile3d = useLazy(loadProfile3D, gl && view === 'perfil');
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const rows = useMemo(() => memberRows(series, role), [series, role]); const [lost, setLost] = useState(false);
  const lands = useMemo(() => rows.map((r) => r.land_cover), [rows]); const stages = useMemo(() => rows.map((r) => r.phase_code), [rows]);
  const c = Math.min(Math.max(cursor, from), to);
  useEffect(() => { if (!playing) return; const id = setInterval(() => setCursor((v) => { if (v >= to) { setPlaying(false); return v; } return v + 1; }), 1000 / 14); return () => clearInterval(id); }, [playing, to]);
  // The selected day goes into the link, replacing history instead of stacking one entry per step.
  useEffect(() => { if (playing) return; const want = String(c + 1); if (params.get('dia') !== want) put({ dia: want }, true); }, [c, playing]); // eslint-disable-line react-hooks/exhaustive-deps
  const setPeriod = (v: 'safra' | 'tudo') => { setPlaying(false); setWhole(v === 'tudo'); if (v === 'safra') setCursor((x) => (x < span.from || x > span.to ? window?.start ?? span.from : x)); put({ periodo: v === 'tudo' ? 'tudo' : null }, true); };

  const row = rows[c]; const info = dayInfo(series, c);
  // The run of this phase is looked up in the WHOLE published run (never in the season window on screen): the plant
  // follows the real stage and its real position, and a phase that touches the edge of the run keeps a fixed pose.
  const phase = phaseRunAt(lands, stages, series.dates, c); const progress = phaseProgress(row.phase_code, phase);
  const scene = toSceneState(row, LEGACY_SCENE_CAPS);
  const showStake = params.get('estaca') !== '0', showRoots = params.get('raizes') !== '0', cutaway = params.get('corte') !== '0';
  const layers = profileLayers(scene, progress, { device: showStake, roots: showRoots });
  const fs: FieldState = { land: row.land_cover, stage: row.phase_code, progress, awf: scene.waterFraction ?? 0, rain: row.precipitation_mm ?? 0, covered: false, phase }; const notes = fieldNotes(fs);
  const cd = row.land_cover !== 'bare' ? cycleDay(run, row.land_cover, run.seasons.find((s) => s.crop_id === row.land_cover && s.sowing_date <= row.date && row.date <= s.expected_harvest_date)?.harvest_year ?? year, row.date) : null;
  const deviceText = { electrode: (depth: number) => t('sim.profile.electrodeNone', { depth }), led: t('sim.profile.led'),
    roots: { illustrative: t('sim.profile.rootsIllustrative'), depth: (cm: number, source: 'modelled' | 'observed') => t('sim.profile.rootDepth', { cm, source: t(source === 'observed' ? 'sim.profile.sourceObserved' : 'sim.profile.sourceModelled') }), continues: (cm: number) => t('sim.profile.rootContinues', { cm }) } };
  const roleName = (r: MemberRole) => t(r === 'central' ? 'sim.planning.memberCentral' : r === 'dry' ? 'sim.planning.memberDry' : 'sim.planning.memberWet');
  const label = `${t('sim.profile.label', { date: dFull(row.date), land: LAND[row.land_cover] ?? row.land_cover, stage: STAGE[row.phase_code] ?? row.phase_code, reserve: pct(scene.waterFraction) })}`;
  const m = memberOf(series, role);
  const cut = <T,>(xs: T[]) => xs.slice(from, to + 1);
  const tl: TimelineSeries = { dates: cut(series.dates), rain: cut(m.precipitation_mm), storage: cut(m.storage_mm), storageB: cut(series.bands.storage_mm.p50), stage: cut(rows.map((r) => r.phase_code)), land: cut(rows.map((r) => r.land_cover)), deficit: cut(m.et_deficit_mm), capacity: series.capacity_mm };
  const sq = season?.quantiles; const q = (k: string, f = n1) => (sq?.[k] ? `${f(sq[k].p10)} · ${f(sq[k].p50)} · ${f(sq[k].p90)}` : '—');
  const analog = run.ensemble.analog_years;
  const rule = run.calendar_rules.find((r) => r.harvest_year === year);
  const evName: Record<string, string> = { reproductive_stress_days_ge_10: t('sim.planning.eventReproductive'), crop_deficit_mm_ge_100: t('sim.planning.eventDeficit'), dry_spell_ge_15_days_in_season: t('sim.planning.eventDrySpell'), reproductive_stress_ge_20d: t('sim.planning.eventReproductive20') };
  const observedUntil = run.weather_segments.filter((s) => s.kind === 'observed').at(-1)?.end ?? null;
  const copy = () => { void navigator.clipboard?.writeText(location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => {}); };
  const loading3d = (text: string) => <div className="sim__loading" role="status"><span className="spinner" aria-hidden /><span>{text}</span></div>;

  return (
    <div className="sim" data-mode="planejamento" data-tab={tab}>
      {mobile ? <div className="sim__tabs"><h1 className="sim__title">{title}</h1><Tabs label={t('sim.sections')} value={tab} onChange={(x) => put({ secao: x === 'campo' ? null : x }, true)} tabs={[{ id: 'campo', label: t('sim.tab.campo') }, { id: 'indicadores', label: t('sim.tab.indicadores') }, { id: 'configurar', label: t('sim.tab.configurar') }]} /></div> : null}
      <aside className="sim__config" id="panel-configurar" aria-label={t('sim.config')}>
        <SimulatorSwitch active="planejamento" />
        {!mobile && <h1 className="sim__title">{title}</h1>}
        <FromPlanNote />
        {where}
        <div data-tour="plan-member" className="stack-2">
          <Seg legend={t('sim.planning.member')} name="membro" value={role} onChange={(v) => put({ membro: v === 'central' ? null : v })} options={ROLES.map((r) => ({ value: r, label: roleName(r) }))} />
          <details className="help" data-testid="planning-member-help" open><summary>{t('sim.planning.memberHelpTitle')}</summary>
            <p>{t('sim.planning.memberHelpBody', { year, members: run.ensemble.members, first: analog[0], last: analog[analog.length - 1] })}</p>
            <ul className="plain"><li>{t('sim.planning.memberHelpCentral')}</li><li>{t('sim.planning.memberHelpDry')}</li><li>{t('sim.planning.memberHelpWet')}</li></ul>
            {m.analog_year != null && <p><b>{t('sim.planning.memberHelpSource', { name: roleName(role), analog: m.analog_year })}</b></p>}
            {observedUntil && <p>{t('sim.planning.memberHelpObserved', { date: dFull(observedUntil) })}</p>}
            <p>{t('sim.planning.notForecast', { year })}</p>
          </details>
        </div>
        <Seg legend={t('sim.planning.period')} name="periodo" value={whole ? 'tudo' : 'safra'} onChange={setPeriod} options={[{ value: 'safra', label: t('sim.planning.periodSeason'), disabled: !window }, { value: 'tudo', label: t('sim.planning.periodAll') }]} />
        {whole && <p className="meta-13" data-testid="planning-warmup">{t('sim.planning.warmup', { start: dFull(run.simulation_start) })}</p>}
        {rule && <p className="meta-13" data-testid="planning-calendar-rule">{t('sim.planning.calendarRule', { used: rule.used, original: rule.state_calendar })}</p>}
        <div className="card card--flat" data-testid="planning-run"><h2 className="h3">{t('sim.planning.runInfo')}</h2>
          <p className="meta-13">{t('sim.planning.issued', { issued: dFull(run.issued_at.slice(0, 10)), asOf: dFull(run.as_of.slice(0, 10)) })}</p>
          <p className="meta-13">{t('sim.planning.members', { members: run.ensemble.members, years: run.ensemble.effective_source_years, first: analog[0], last: analog[analog.length - 1], coverage: t(run.ensemble.coverage_class === 'standard' ? 'sim.planning.coverageStandard' : 'sim.planning.coverageLimited') })}</p>
          <p className="meta-13" translate="no"><code>{run.run_id}</code> · {run.plan_id} · {run.engine.version} · {run.engine.parameter_set_id}</p>
          <p className="meta-13">{t('sim.planning.limitations')}</p>
          <button className="btn btn--sm" onClick={copy}>{t('sim.planning.share')}</button>
          <span className="meta-13" role="status" aria-live="polite">{copied ? t('sim.planning.copied') : ''}</span>
        </div>
      </aside>
      <div className="sim__stage" id="panel-campo">
        {view === 'talhao'
          ? (gl && !lost && field3d.mod ? <SceneBoundary fallback={<Field2D state={fs} label={label} />}><field3d.mod.default state={fs} seed={7} label={label} onLost={() => setLost(true)} /></SceneBoundary> : gl && !lost && !field3d.failed ? loading3d(t('sim.loading3d')) : <Field2D state={fs} label={label} />)
          : (gl && profile3d.mod ? <profile3d.mod.default layers={layers} label={label} reducedMotion={reduced} deviceText={deviceText} cutaway={cutaway} /> : gl && !profile3d.failed ? loading3d(t('sim.profile.loading')) : <Profile2D scene={scene} layers={layers} label={label} zoneLabel={t('sim.profile.zoneMean')} deviceText={deviceText} />)}
        <div className="sim__overlay"><div className="sim__views"><Seg legend={t('sim.view.legend')} name="vista" value={view} onChange={(v) => put({ vista: v === 'talhao' ? null : v })} options={[{ value: 'talhao', label: t('sim.view.field') }, { value: 'perfil', label: t('sim.view.profile') }]} />
          {view === 'perfil' && <details className="sim__layers"><summary>{t('sim.planning.layers')}</summary>
            <label className="check"><input type="checkbox" checked={showStake} onChange={(e) => put({ estaca: e.target.checked ? null : '0' })} /><span>{t('sim.profile.deviceToggle')}</span></label>
            <label className="check"><input type="checkbox" checked={showRoots} onChange={(e) => put({ raizes: e.target.checked ? null : '0' })} /><span>{t('sim.profile.rootsToggle')}</span></label>
            <label className="check"><input type="checkbox" checked={cutaway} onChange={(e) => put({ corte: e.target.checked ? null : '0' })} /><span>{t('sim.profile.cutawayToggle')}</span></label></details>}</div>
          <Pill tone={info.kind === 'observed' ? 'soil' : 'warn'}>{t(`sim.planning.origin.${info.kind}`)}</Pill><Pill>{dFull(row.date)}</Pill></div>
        <p className="sim__caption" data-testid="sim-caption">{view === 'perfil' ? t('sim.profile.caption') : [t('sim.caption'), notes.fixedPose ? t('sim.captionFixedPose') : '', notes.noPlant ? t('sim.noPlant') : '', !gl || lost || field3d.failed ? t('sim.caption2d', { reserve: pct(scene.waterFraction) }) : ''].filter(Boolean).join(' ')}</p>
      </div>
      <div className="sim__timeline">
        <div className="transport" role="group" aria-label={t('sim.transport.label')}>
          <button className="icon-btn" aria-label={t('sim.transport.back')} onClick={() => setCursor(Math.max(from, c - 1))}><StepBack size={18} aria-hidden /></button>
          <button className="btn btn--primary" aria-pressed={playing} onClick={() => { if (c >= to) setCursor(from); setPlaying(!playing); }}>{playing ? <><Pause size={18} aria-hidden />{t('sim.transport.pause')}</> : <><Play size={18} aria-hidden />{t('sim.transport.play')}</>}</button>
          <button className="icon-btn" aria-label={t('sim.transport.forward')} onClick={() => setCursor(Math.min(to, c + 1))}><StepForward size={18} aria-hidden /></button>
          <button className="btn btn--sm" onClick={() => setCursor(Math.min(to, c + 7))}>{t('sim.transport.week')}</button>
        </div>
        <div data-tour="plan-timeline" data-testid="planning-period" data-from={series.dates[from]} data-to={series.dates[to]}>
          <PhaseTimeline series={tl} cursor={c - from} onCursor={(i) => { setPlaying(false); setCursor(i + from); }} labelA={t('sim.planning.memberReserve', { name: roleName(role) })} labelB={t('sim.planning.bandLabel')} ariaLabel={t('sim.timelineLabel')} height={mobile ? 170 : 190} />
        </div>
      </div>
      <aside className="sim__results" id="panel-indicadores" aria-label={t('sim.results')}>
        <div className="card" data-testid="planning-day"><h2 className="h3">{dFull(row.date)}</h2>
          <p className="meta-13">{t('sim.planning.simDay', { day: info.simDay, total: info.simDays })} · {t(`sim.planning.origin.${info.kind}`)}</p>
          <p className="meta-13">{cd ? t('sim.planning.cycleDay', { crop: isCropId(row.land_cover) ? CROPS[row.land_cover].name : row.land_cover, stage: STAGE[row.phase_code] ?? row.phase_code, day: cd.day, of: cd.of }) : t('sim.planning.fallowDay')}</p>
          <dl className="kv"><dt>{t('sim.day.rain')}</dt><dd>{n1(row.precipitation_mm)} mm</dd><dt>{t('sim.day.et0')}</dt><dd>{n1(row.et0_mm)} mm</dd><dt>{t('sim.day.etc')}</dt><dd>{n1(row.etc_mm)} mm</dd><dt>{t('sim.day.eta')}</dt><dd>{n1(row.eta_mm)} mm</dd>
            <dt>{t('timeline.reserve')}</dt><dd>{n1(row.storage_mm)} mm · {pct(scene.waterFraction)}</dd><dt>{t('sim.day.drainage')}</dt><dd>{n1(row.drainage_mm)} mm</dd></dl>
          {(row.stress_coefficient ?? 1) < 1 && row.land_cover !== 'bare' ? <Pill tone="warn">{t('water.belowIdealLong')}</Pill> : null}
        </div>
        {season && <div className="card" data-testid="planning-season"><h2 className="h3">{t('sim.planning.seasonTitle', { season: season.season_label })} · {cropLabel}</h2>
          <p className="meta-13">{dFull(season.sowing_date)} → {dFull(season.expected_harvest_date)} · P10 · P50 · P90</p>
          <dl className="kv"><dt>{t('sim.planning.metricDeficit')}</dt><dd>{q('crop_deficit_mm')}</dd><dt>{t(sq?.stress_days ? 'sim.planning.metricStress' : 'sim.planning.metricStressRepro')}</dt><dd>{q(sq?.stress_days ? 'stress_days' : 'reproductive_stress_days', n0)}</dd><dt>{t('sim.planning.metricRain')}</dt><dd>{q(sq?.precipitation_mm ? 'precipitation_mm' : 'rain_mm', n0)}</dd></dl>
          <h3 className="h4">{t('sim.planning.events')}</h3>
          <ul className="plain">{season.events.map((e) => <li key={e.event_id}>{evName[e.event_id] ?? e.event_id}: <b>{pct(e.share_of_members)}</b> ({Math.round(e.share_of_members * e.members)}/{e.members})</li>)}</ul>
        </div>}
        <CropComparison run={run} crop={crop} year={year} placeLabel={placeLabel} locationId={locationId} siblings={siblings} publications={publications} />
        {season?.yield && <YieldCard y={season.yield} />}
      </aside>
    </div>
  );
}

/** Yield of a season or of a yield-only capability, in the terms each result declares (never a field forecast). */
function YieldCard({ y }: { y: SimulationYield }) {
  const { t } = useI18n();
  return (
    <div className="card" data-testid="planning-yield"><h2 className="h3">{t('sim.planning.yieldTitle')}</h2>
      {y.status === 'unavailable' ? <p className="meta-13">{t('sim.planning.yieldUnavailable', { reason: t(`sim.planning.reasons.${y.reason_code}` as MessageKey) })}</p>
        : 'years_used' in y ? <p className="meta-13">{t('sim.planning.yieldReference', { value: n0(y.value_kg_ha), first: y.years_used[0], last: y.last_label_year, age: y.history_horizon_years })}</p>
        : <>
          <p><b className="stat__value">{n0(y.value_kg_ha)}</b> kg/ha</p>
          <p className="meta-13">{t(`sim.planning.yieldPosition.${y.position_vs_season}` as MessageKey)} · {t('sim.planning.yieldStatus', { status: t(`sim.planning.research.${y.research_status}` as MessageKey) })}</p>
          {y.scenario_range && <p className="meta-13">{t('sim.planning.yieldScenario', { p10: n0(y.scenario_range.p10), p90: n0(y.scenario_range.p90) })}</p>}
          {y.predictive_range && <p className="meta-13">{t('sim.planning.yieldPredictive', { p10: n0(y.predictive_range.p10), p90: n0(y.predictive_range.p90) })}</p>}
          <p className="meta-13">{t('sim.planning.yieldCounty')}</p>
        </>}
    </div>
  );
}

/** Calculated crops of the same place and harvest year, side by side, by water supply. An indicator, not a recommendation. */
function CropComparison({ run, crop, year, placeLabel, locationId, siblings, publications }: { run: Run; crop: string; year: number; placeLabel: string; locationId: string; siblings: string[]; publications: Publications }) {
  const { t } = useI18n(); const cropName = useCropName();
  const others = siblings.filter((id) => id !== crop).map((id) => ({ id, pub: selectPublication(publications, id, year) })).filter((x) => x.pub);
  const loaded = useAsync((s) => Promise.all(others.map(async (o) => ({ id: o.id, run: o.pub!.run_id === run.run_id ? run : await simulations.run(o.pub!.run_id, s) }))), [run.run_id, year, others.map((o) => o.pub!.run_id).join(',')]);
  // Late answers of another set of runs are dropped: each sibling must be the run its publication names.
  const fresh = (loaded.data ?? []).filter((x) => others.some((o) => o.id === x.id && o.pub!.run_id === x.run.run_id));
  const rows = [{ id: crop, run }, ...fresh].map(({ id, run: r }) => {
    const s = seasonOf(r, id, year); const qs = s?.quantiles ?? {}; const y = s?.yield;
    const comparable = comparableRuns(run, r);
    return { id, comparable, supply: comparable ? waterSatisfaction(s)?.value ?? null : null, stress: qs.stress_days?.p50 ?? null, stressRepro: qs.reproductive_stress_days?.p50 ?? null, deficit: qs.crop_deficit_mm?.p50 ?? null,
      yieldValue: y && y.status !== 'unavailable' ? y.value_kg_ha : null, season: s };
  });
  const best = loaded.status === 'ok' ? highestSatisfaction(rows) : null;
  const none = <span className="meta-13">{t('sim.planning.compareNotCalculated')}</span>;
  return (
    <div className="card" data-testid="planning-compare" data-tour="plan-compare"><h2 className="h3">{t('sim.planning.compareTitle', { place: placeLabel, year })}</h2>
      {siblings.length < 2 ? <p className="meta-13">{t('sim.planning.compareOne', { crop: cropName(crop) })}</p>
        : loaded.status === 'error' ? <ErrorState error={loaded.error} onRetry={loaded.retry} />
        : <>
          {/* One block per crop: the panel is narrow, and a wide table would hide the numbers behind a sideways scroll. */}
          <ul className="compare-list">{rows.map((r) => <li key={r.id} data-current={r.id === crop} data-crop={r.id}>
            <div className="compare-list__head">{r.id === crop ? <span><b>{cropName(r.id)}</b> <span className="meta-13">{t('sim.planning.compareCurrent')}</span></span> : <a href={`${planningHref(locationId, r.id)}&safra=${year}`}><b>{cropName(r.id)}</b></a>}{r.id === best && <Pill tone="ok">{t('sim.planning.compareBest')}</Pill>}</div>
            {r.season && <p className="meta-13" data-testid="compare-calendar">{t('sim.planning.compareCalendar', { sowing: dFull(r.season.sowing_date), harvest: dFull(r.season.expected_harvest_date), days: r.season.cycle_days })}</p>}
            {!r.comparable && <p className="meta-13" data-testid="compare-incompatible">{t('sim.planning.compareIncompatible')}</p>}
            <dl className="kv"><dt>{t('sim.planning.compareSupply')}</dt><dd data-metric="supply">{r.supply == null ? none : pct(r.supply)}</dd>
              <dt>{t('sim.planning.compareStress')}</dt><dd data-metric="stress">{r.stress == null ? none : n0(r.stress)}</dd>
              <dt>{t('sim.planning.compareStressRepro')}</dt><dd data-metric="stress-repro">{r.stressRepro == null ? none : n0(r.stressRepro)}</dd>
              <dt>{t('sim.planning.compareDeficit')}</dt><dd data-metric="deficit">{r.deficit == null ? none : n0(r.deficit)}</dd><dt>{t('sim.planning.compareYield')}</dt><dd data-metric="yield">{r.yieldValue == null ? none : n0(r.yieldValue)}</dd></dl></li>)}</ul>
          {loaded.status === 'loading' && <p className="meta-13" role="status">{t('sim.planning.compareLoading')}</p>}
          <p className="meta-13">{t('sim.planning.compareRule')}</p>
          <p className="meta-13"><b>{t('sim.planning.compareNot')}</b></p>
        </>}
    </div>
  );
}

/** When opened from "Salvar e abrir no simulador": say what came from the plan and what did not. */
function FromPlanNote() {
  const [params] = useSearchParams(); const id = params.get('plano'); const plan = useStore((s) => (id ? s.plans.find((p) => p.id === id) : undefined)); const { t } = useI18n();
  if (!plan) return null;
  return <div data-testid="from-plan"><Notice title={t('sim.fromPlan.title', { date: dFull(plan.createdAt.slice(0, 10)) })}>{t('sim.fromPlan.text')} <a href={`#/planejar?plano=${plan.id}${plan.data.municipio ? `&mun=${plan.data.municipio}` : ''}`}>{t('sim.fromPlan.back')}</a></Notice></div>;
}

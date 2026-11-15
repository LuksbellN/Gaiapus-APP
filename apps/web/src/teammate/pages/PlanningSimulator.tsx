// Season planning 2027/2028: a calculated, published run (API /v1/simulations) — no city or year constant in this screen.
// One identity per displayed day: run_id + climate member + date drive the timeline, the panel and the scenes.
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pause, Play, StepBack, StepForward } from 'lucide-react';
import { simulations } from '../adapters/simulations';
import { CROPS, isCropId } from '../catalog';
import { dFull, LAND, n0, n1, pct, STAGE } from '../format';
import { useI18n } from '../i18n';
import { ErrorState, Loading, Notice, Pill, Seg, useAsync, useMedia } from '../ui';
import { PhaseTimeline, type TimelineSeries } from '../ui/PhaseTimeline';
import { Field2D, webglAvailable, type FieldState } from '../sim/field-state';
import { cycleDay, dayInfo, memberOf, memberRows, seasonIndex, seasonOf, type MemberRole } from '../sim/planning-model';
import { profileLayers } from '../sim/profile-model';
import { Profile2D } from '../sim/Profile2D';
import { toSceneState, LEGACY_SCENE_CAPS } from '../sim/scene-adapter';
import { useLazy } from '../lazyPage';
import { placeName } from '../context';

const loadField3D = () => import('../sim/Field3D');
const loadProfile3D = () => import('../sim/SoilProfile3D');
const ROLES: MemberRole[] = ['central', 'dry', 'wet'];

export function PlanningSimulator() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const put = (kv: Record<string, string | null>) => setParams((prev) => { const p = new URLSearchParams(prev); for (const [k, v] of Object.entries(kv)) { if (v == null) p.delete(k); else p.set(k, v); } return p; });
  const mun = /^\d{7}$/.test(params.get('mun') ?? '') ? params.get('mun')! : '5107925';
  const locationId = `BR:ibge:${mun}`;
  const crop = params.get('cultura') ?? 'soy';
  const catalog = useAsync((s) => simulations.capabilities({}, s), []);
  const place = catalog.data?.places.find((p) => p.location_id === locationId) ?? null;
  const years = catalog.data?.harvest_years ?? [];
  const year = Number(params.get('safra')) || years[0] || 2027;
  const cap = place?.capabilities.find((c) => c.crop_id === crop && c.harvest_year === year) ?? null;
  const runId = cap?.status === 'ready' ? cap.run_ids.find((id) => id) ?? null : null;
  // Prefer the run whose plan ends with this crop (soy alone for soy, soy>maize2 for maize2).
  const pubs = useAsync((s) => (runId ? simulations.regional({ location_id: locationId, crop_id: crop }, s) : Promise.resolve(null)), [locationId, crop, runId]);
  const chosen = pubs.data?.items.find((p) => p.crops[p.crops.length - 1] === crop) ?? pubs.data?.items[0] ?? null;
  const run = useAsync((s) => (chosen ? simulations.run(chosen.run_id, s) : Promise.resolve(null)), [chosen?.run_id]);
  const series = useAsync((s) => (chosen ? simulations.series(chosen.run_id, s) : Promise.resolve(null)), [chosen?.run_id]);
  const placeLabel = place?.name ?? placeName(mun);
  const cropLabel = isCropId(crop) ? CROPS[crop].name : crop;

  if (catalog.status === 'error') return <div className="page"><h1>{t('sim.planning.mode')}</h1><ErrorState error={catalog.error} onRetry={catalog.retry} /></div>;
  if (!catalog.data) return <div className="page"><h1>{t('sim.planning.mode')}</h1><Loading rows={4} /></div>;
  if (!place || !cap || cap.status !== 'ready') {
    const reason = cap?.reason_code ?? null;
    return (
      <div className="page" data-testid="planning-unavailable">
        <h1>{t('sim.planning.title', { crop: cropLabel, place: placeLabel })}</h1>
        <Notice tone="warn" title={t('sim.planning.unavailableTitle')}>
          {place ? t('sim.planning.yieldUnavailable', { reason: t(`sim.planning.reasons.${reason ?? 'unsupported'}`) }).replace(/^[^:]+:\s*/, '')
            : t('sim.planning.noPlace', { places: catalog.data.places.map((p) => p.name).join(', ') })}
        </Notice>
        {place && <ul className="plain">{place.capabilities.filter((c) => c.harvest_year === year).map((c) => <li key={c.crop_id}><a href={`#/simulador?modo=planejamento&mun=${mun}&cultura=${c.crop_id}&safra=${year}`}>{isCropId(c.crop_id) ? CROPS[c.crop_id].name : c.crop_id}</a> · {c.status === 'ready' ? t('sim.planning.mode') : t(`sim.planning.reasons.${c.reason_code ?? 'unsupported'}`)}</li>)}</ul>}
      </div>
    );
  }
  if (run.status === 'error' || series.status === 'error' || pubs.status === 'error') return <div className="page"><h1>{t('sim.planning.mode')}</h1><ErrorState error={run.error ?? series.error ?? pubs.error} onRetry={() => { run.retry(); series.retry(); pubs.retry(); }} /></div>;
  if (!run.data || !series.data) return <div className="page"><h1>{t('sim.planning.title', { crop: cropLabel, place: placeLabel })}</h1><p className="meta">{t('sim.planning.loading')}</p><Loading rows={5} /></div>;
  return <PlanningView key={`${run.data.run_id}:${crop}:${year}`} run={run.data} series={series.data} crop={crop} year={year} years={years} placeLabel={placeLabel} cropLabel={cropLabel} put={put} params={params} />;
}

type ViewProps = { run: NonNullable<Awaited<ReturnType<typeof simulations.run>>>; series: NonNullable<Awaited<ReturnType<typeof simulations.series>>>; crop: string; year: number; years: number[];
  placeLabel: string; cropLabel: string; put: (kv: Record<string, string | null>) => void; params: URLSearchParams };

function PlanningView({ run, series, crop, year, years, placeLabel, cropLabel, put, params }: ViewProps) {
  const { t } = useI18n();
  const role = (ROLES.find((r) => r === params.get('membro')) ?? 'central') as MemberRole;
  const season = seasonOf(run, crop, year);
  const window = seasonIndex(series, run, crop, year);
  const n = series.dates.length;
  const [cursor, setCursor] = useState(() => { const d = Number(params.get('dia')); return d > 0 ? Math.min(n - 1, d - 1) : window?.start ?? 0; });
  const [playing, setPlaying] = useState(false);
  const view = params.get('vista') === 'perfil' ? 'perfil' : 'talhao';
  const [gl] = useState(webglAvailable);
  const field3d = useLazy(loadField3D, gl && view === 'talhao'); const profile3d = useLazy(loadProfile3D, gl && view === 'perfil');
  const reduced = useMedia('(prefers-reduced-motion: reduce)'); const mobile = useMedia('(max-width: 760px)');
  const rows = useMemo(() => memberRows(series, role), [series, role]);
  const c = Math.min(cursor, n - 1);
  useEffect(() => { if (!playing) return; const id = setInterval(() => setCursor((v) => { if (v >= n - 1) { setPlaying(false); return v; } return v + 1; }), 1000 / 14); return () => clearInterval(id); }, [playing, n]);
  useEffect(() => { if (playing) return; const want = String(c + 1); if (params.get('dia') !== want) put({ dia: want }); }, [c, playing]); // eslint-disable-line react-hooks/exhaustive-deps

  const row = rows[c]; const info = dayInfo(series, c);
  const phaseStart = (() => { let i = c; while (i > 0 && rows[i - 1].phase_code === row.phase_code && rows[i - 1].land_cover === row.land_cover) i--; return i; })();
  const phaseEnd = (() => { let i = c; while (i < n - 1 && rows[i + 1].phase_code === row.phase_code && rows[i + 1].land_cover === row.land_cover) i++; return i; })();
  const progress = phaseEnd > phaseStart ? (c - phaseStart) / (phaseEnd - phaseStart) : 1;
  const scene = toSceneState(row, LEGACY_SCENE_CAPS);
  const showStake = params.get('estaca') !== '0', showRoots = params.get('raizes') !== '0', cutaway = params.get('corte') !== '0';
  const layers = profileLayers(scene, progress, { device: showStake, roots: showRoots });
  const fs: FieldState = { land: row.land_cover, stage: row.phase_code, progress, awf: scene.waterFraction ?? 0, rain: row.precipitation_mm ?? 0, covered: false };
  const cd = row.land_cover !== 'bare' ? cycleDay(run, row.land_cover, run.seasons.find((s) => s.crop_id === row.land_cover && s.sowing_date <= row.date && row.date <= s.expected_harvest_date)?.harvest_year ?? year, row.date) : null;
  const deviceText = { electrode: (depth: number) => t('sim.profile.electrodeNone', { depth }), led: t('sim.profile.led'),
    roots: { illustrative: t('sim.profile.rootsIllustrative'), depth: (cm: number, source: 'modelled' | 'observed') => t('sim.profile.rootDepth', { cm, source: t(source === 'observed' ? 'sim.profile.sourceObserved' : 'sim.profile.sourceModelled') }), continues: (cm: number) => t('sim.profile.rootContinues', { cm }) } };
  const roleName = (r: MemberRole) => t(r === 'central' ? 'sim.planning.memberCentral' : r === 'dry' ? 'sim.planning.memberDry' : 'sim.planning.memberWet');
  const label = `${t('sim.profile.label', { date: dFull(row.date), land: LAND[row.land_cover] ?? row.land_cover, stage: STAGE[row.phase_code] ?? row.phase_code, reserve: pct(scene.waterFraction) })}`;
  const m = memberOf(series, role);
  const tl: TimelineSeries = { dates: series.dates, rain: m.precipitation_mm, storage: m.storage_mm, storageB: series.bands.storage_mm.p50, stage: rows.map((r) => r.phase_code), land: rows.map((r) => r.land_cover), deficit: m.et_deficit_mm, capacity: series.capacity_mm };
  const sq = season?.quantiles; const q = (k: string, f = n1) => (sq?.[k] ? `${f(sq[k].p10)} · ${f(sq[k].p50)} · ${f(sq[k].p90)}` : '—');
  const y = season?.yield;
  const years_ = run.ensemble.analog_years;
  const rule = run.calendar_rules.find((r) => r.harvest_year === year);
  const evName: Record<string, string> = { reproductive_stress_days_ge_10: t('sim.planning.eventReproductive'), crop_deficit_mm_ge_100: t('sim.planning.eventDeficit'), dry_spell_ge_15_days_in_season: t('sim.planning.eventDrySpell') };

  return (
    <div className="sim" data-mode="planejamento" data-tab="campo">
      <aside className="sim__config" aria-label={t('sim.config')}>
        <h1 style={{ fontSize: 20 }}>{t('sim.planning.title', { crop: cropLabel, place: placeLabel })}</h1>
        <Seg legend={t('sim.planning.harvestYear')} name="safra" value={String(year)} onChange={(v) => put({ safra: v, dia: null })} options={years.map((yy) => ({ value: String(yy), label: String(yy) }))} />
        <Seg legend={t('sim.planning.member')} name="membro" value={role} onChange={(v) => put({ membro: v === 'central' ? null : v })} options={ROLES.map((r) => ({ value: r, label: roleName(r) }))} />
        <p className="meta-13">{t('sim.planning.memberHint')}</p>
        <Notice title={t('sim.planning.mode')}>{t('sim.planning.notForecast', { year })}</Notice>
        {rule && <p className="meta-13" data-testid="planning-calendar-rule">{t('sim.planning.calendarRule', { used: rule.used, original: rule.state_calendar })}</p>}
        <div className="card card--flat" data-testid="planning-run"><h3>{t('sim.planning.runInfo')}</h3>
          <p className="meta-13">{t('sim.planning.issued', { issued: dFull(run.issued_at.slice(0, 10)), asOf: dFull(run.as_of.slice(0, 10)) })}</p>
          <p className="meta-13">{t('sim.planning.members', { members: run.ensemble.members, years: run.ensemble.effective_source_years, first: years_[0], last: years_[years_.length - 1], coverage: t(run.ensemble.coverage_class === 'standard' ? 'sim.planning.coverageStandard' : 'sim.planning.coverageLimited') })}</p>
          <p className="meta-13"><code>{run.run_id}</code> · {run.plan_id} · {run.engine.version} · {run.engine.parameter_set_id}</p>
          <p className="meta-13">{t('sim.planning.limitations')}</p>
          <button className="btn btn--sm" onClick={() => { void navigator.clipboard?.writeText(location.href); }}>{t('sim.planning.share')}</button>
        </div>
      </aside>
      <div className="sim__stage">
        {view === 'talhao'
          ? (gl && field3d.mod ? <field3d.mod.default state={fs} seed={7} label={label} /> : gl && !field3d.failed ? <div className="sim__loading" role="status"><span className="spinner" aria-hidden /></div> : <Field2D state={fs} label={label} />)
          : (gl && profile3d.mod ? <profile3d.mod.default layers={layers} label={label} reducedMotion={reduced} deviceText={deviceText} cutaway={cutaway} /> : gl && !profile3d.failed ? <div className="sim__loading" role="status"><span className="spinner" aria-hidden /></div> : <Profile2D scene={scene} layers={layers} label={label} zoneLabel={t('sim.profile.zoneMean')} deviceText={deviceText} />)}
        <div className="sim__overlay"><div className="sim__views"><Seg legend={t('sim.view.legend')} name="vista" value={view} onChange={(v) => put({ vista: v === 'talhao' ? null : v })} options={[{ value: 'talhao', label: t('sim.view.field') }, { value: 'perfil', label: t('sim.view.profile') }]} />
          {view === 'perfil' && <><label className="check sim__stake"><input type="checkbox" checked={showStake} onChange={(e) => put({ estaca: e.target.checked ? null : '0' })} /><span>{t('sim.profile.deviceToggle')}</span></label>
            <label className="check sim__stake"><input type="checkbox" checked={showRoots} onChange={(e) => put({ raizes: e.target.checked ? null : '0' })} /><span>{t('sim.profile.rootsToggle')}</span></label>
            <label className="check sim__stake"><input type="checkbox" checked={cutaway} onChange={(e) => put({ corte: e.target.checked ? null : '0' })} /><span>{t('sim.profile.cutawayToggle')}</span></label></>}</div>
          <Pill tone="warn">{t(`sim.planning.origin.${info.kind}`)}</Pill><Pill>{dFull(row.date)}</Pill></div>
        <p className="sim__caption">{view === 'perfil' ? t('sim.profile.caption') : t('sim.caption')}</p>
      </div>
      <div className="sim__timeline">
        <div className="transport" role="group" aria-label={t('sim.transport.label')}>
          <button className="icon-btn" aria-label={t('sim.transport.back')} onClick={() => setCursor(Math.max(0, c - 1))}><StepBack size={18} aria-hidden /></button>
          <button className="btn btn--primary" aria-pressed={playing} onClick={() => setPlaying(!playing)}>{playing ? <><Pause size={18} aria-hidden />{t('sim.transport.pause')}</> : <><Play size={18} aria-hidden />{t('sim.transport.play')}</>}</button>
          <button className="icon-btn" aria-label={t('sim.transport.forward')} onClick={() => setCursor(Math.min(n - 1, c + 1))}><StepForward size={18} aria-hidden /></button>
          <button className="btn btn--sm" onClick={() => setCursor(Math.min(n - 1, c + 7))}>{t('sim.transport.week')}</button>
        </div>
        <PhaseTimeline series={tl} cursor={c} onCursor={(i) => { setPlaying(false); setCursor(i); }} labelA={t('sim.planning.memberReserve', { name: roleName(role) })} labelB={t('sim.planning.bandLabel')} ariaLabel={t('sim.timelineLabel')} height={mobile ? 170 : 190} />
      </div>
      <aside className="sim__results" aria-label={t('sim.results')}>
        <div className="card" data-testid="planning-day"><h3>{dFull(row.date)}</h3>
          <p className="meta-13">{t('sim.planning.simDay', { day: info.simDay, total: info.simDays })} · {t(`sim.planning.origin.${info.kind}`)}</p>
          <p className="meta-13">{cd ? t('sim.planning.cycleDay', { crop: isCropId(row.land_cover) ? CROPS[row.land_cover].name : row.land_cover, stage: STAGE[row.phase_code] ?? row.phase_code, day: cd.day, of: cd.of }) : t('sim.planning.fallowDay')}</p>
          <dl className="kv"><dt>{t('sim.day.rain')}</dt><dd>{n1(row.precipitation_mm)} mm</dd><dt>{t('sim.day.et0')}</dt><dd>{n1(row.et0_mm)} mm</dd><dt>{t('sim.day.etc')}</dt><dd>{n1(row.etc_mm)} mm</dd><dt>{t('sim.day.eta')}</dt><dd>{n1(row.eta_mm)} mm</dd>
            <dt>{t('timeline.reserve')}</dt><dd>{n1(row.storage_mm)} mm · {pct(scene.waterFraction)}</dd><dt>{t('sim.day.drainage')}</dt><dd>{n1(row.drainage_mm)} mm</dd></dl>
          {(row.stress_coefficient ?? 1) < 1 && row.land_cover !== 'bare' ? <Pill tone="warn">{t('water.belowIdealLong')}</Pill> : null}
        </div>
        {season && <div className="card" data-testid="planning-season"><h3>{t('sim.planning.seasonTitle', { season: season.season_label })} · {cropLabel}</h3>
          <p className="meta-13">{dFull(season.sowing_date)} → {dFull(season.expected_harvest_date)} · P10 · P50 · P90</p>
          <dl className="kv"><dt>{t('sim.planning.metricDeficit')}</dt><dd>{q('crop_deficit_mm')}</dd><dt>{t('sim.planning.metricStress')}</dt><dd>{q('stress_days', n0)}</dd><dt>{t('sim.planning.metricRain')}</dt><dd>{q('precipitation_mm', n0)}</dd></dl>
          <h4>{t('sim.planning.events')}</h4>
          <ul className="plain">{season.events.map((e) => <li key={e.event_id}>{evName[e.event_id] ?? e.event_id}: <b>{pct(e.share_of_members)}</b> ({Math.round(e.share_of_members * e.members)}/{e.members})</li>)}</ul>
        </div>}
        {y && <div className="card" data-testid="planning-yield"><h3>{t('sim.planning.yieldTitle')}</h3>
          {y.status === 'unavailable' ? <p className="meta-13">{t('sim.planning.yieldUnavailable', { reason: t(`sim.planning.reasons.${y.reason_code}`) })}</p>
            : 'years_used' in y ? <p className="meta-13">{t('sim.planning.yieldReference', { value: n0(y.value_kg_ha), first: y.years_used[0], last: y.last_label_year, age: y.history_horizon_years })}</p>
            : <p className="meta-13">{n0(y.value_kg_ha)} kg/ha · {y.research_status}</p>}
        </div>}
      </aside>
    </div>
  );
}

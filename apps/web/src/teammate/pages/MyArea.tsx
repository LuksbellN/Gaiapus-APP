// "Minha área — sensores e talhões": properties, plot outlines, stakes and their installations.
// Identity is the real Supabase session, checked on the server through GET /v1/me (area/access.ts). Plots, stakes,
// readings and commands have no server route yet: they are kept by the demonstration adapter (area/adapter.ts) and
// the screen says so permanently. Nothing here reaches a device or a broker.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LocateFixed, MapPin, Pencil, Plus, Radio, RadioTower, Undo2 } from 'lucide-react';
import { useLazy } from '../lazyPage';
import { dDateTime, n2 } from '../format';
import { useI18n, type MessageKey } from '../i18n';
import { codeOf, codesOf, legacyLabel, optionLabel } from '../options';
import { setDraft, useStore, type Plot, type State } from '../store';
import { Dialog, Empty, Field, LinkBtn, Notice, Pill, Seg, TabPanel, Tabs, useMedia } from '../ui';
import { useAccess, type Access } from '../area/access';
import { AreaError, PENDING, sensors, sensorsOutside } from '../area/adapter';
import type { MapSelection } from '../area/AreaMap';
import { activeInstallation } from '../area/device';
import { closeRing, formatCoordinateText, geodesicAreaHa, openVertices, parseCoordinateText, polygonsOverlap, validatePolygon, type PolygonGeometry, type Position } from '../area/geometry';
import { ContactPill, contactOf, deviceLabel, fmtPoint, SensorDetail } from '../area/SensorDetail';
import { PlaceForm, SensorWizard } from '../area/SensorWizard';

const loadMap = () => import('../area/AreaMap');
type TabId = 'mapa' | 'sensores' | 'gateways';
type PlotDraft = { id?: string; propertyId: string; name: string; soil: string; irrigation: string; vertices: Position[]; text: string; dirty: boolean };
const DRAFT_KEY = 'area.plot';

function DemoBanner({ access }: { access: Access }) {
  const { t } = useI18n();
  return <div className="stack-2" data-testid="area-demo-banner">
    <Notice tone="warn" title={t('area.demo.title')}>{t('area.demo.text')}
      <details className="area-pending"><summary>{t('area.pending.title')}</summary><ul>{PENDING.map((k) => <li key={k}>{t(`area.pending.${k}` as MessageKey)}</li>)}</ul></details></Notice>
    {access.kind === 'guest_demo' && <Notice tone="warn" title={t('area.access.guestTitle')}>{t('area.access.guest')} <Link to="/conta?voltar=/minha-area">{t('area.access.signIn')}</Link></Notice>}
    {access.kind === 'account' && access.server === 'unreachable' && <Notice tone="warn" title={t('area.access.unreachableTitle')}>{t('area.access.unreachable')}</Notice>}
  </div>;
}

function Gate() {
  const { t } = useI18n();
  return <div className="page" style={{ maxWidth: 720 }}><h1>{t('area.title')}</h1>
    <section className="card" data-testid="area-gate"><h2>{t('area.access.requiredTitle')}</h2><p>{t('area.access.required')}</p>
      <div className="row"><LinkBtn primary to="/conta?voltar=/minha-area">{t('area.access.signIn')}</LinkBtn><LinkBtn to="/minha-area?demo=1">{t('area.access.openDemo')}</LinkBtn></div>
      <p className="meta-13">{t('area.access.demoNote')}</p></section></div>;
}

const plotErrorKey = (code: string) => `area.geometry.${code}` as MessageKey;
const newDraft = (propertyId: string): PlotDraft => ({ propertyId, name: '', soil: 'Não sei', irrigation: 'Sequeiro', vertices: [], text: '', dirty: false });
const draftOf = (p: Plot): PlotDraft => { const v = p.geometry ? openVertices(p.geometry) : []; return { id: p.id, propertyId: p.propertyId, name: p.name, soil: p.soil, irrigation: p.irrigation, vertices: v, text: formatCoordinateText(v), dirty: false }; };

function PlotEditor({ draft, state, onChange, onSave, onCancel, busy, error, mapOk }: { draft: PlotDraft; state: State; onChange: (d: PlotDraft) => void; onSave: (g: PolygonGeometry | null, keepOutside: boolean) => void; onCancel: () => void; busy: boolean; error: string; mapOk: boolean }) {
  const { t } = useI18n(); const [textError, setTextError] = useState<number | null>(null); const [keepOutside, setKeepOutside] = useState(false); const [localError, setLocalError] = useState('');
  const set = (patch: Partial<PlotDraft>) => onChange({ ...draft, ...patch, dirty: true });
  const geometry: PolygonGeometry | null = draft.vertices.length ? { type: 'Polygon', coordinates: [closeRing(draft.vertices)] } : null;
  const check = geometry ? validatePolygon(geometry) : null; const valid = check?.ok ? check.geometry : null;
  const overlaps = valid ? state.plots.filter((p) => p.id !== draft.id && !p.archivedAt && p.geometry && polygonsOverlap(valid, p.geometry)) : [];
  const outside = valid && draft.id ? sensorsOutside(state, draft.id, valid) : [];
  const select = (field: 'soil' | 'irrigation', a: object) => <select className="input" {...a} value={codeOf(field, draft[field]) ?? ''} onChange={(e) => set({ [field]: legacyLabel(field, e.target.value) })}>{codesOf(field).map((c) => <option key={c} value={c}>{optionLabel(field, c)}</option>)}</select>;
  const applyText = () => { const r = parseCoordinateText(draft.text); if (!r.ok) { setTextError(r.line); return; } setTextError(null); onChange({ ...draft, vertices: r.vertices, dirty: true }); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setLocalError('');
    if (!draft.name.trim()) { setLocalError(t('area.error.name_required')); return; }
    // Coordinates typed but not applied yet are applied on save, so the text and the outline never disagree.
    if (draft.text.trim() !== formatCoordinateText(draft.vertices)) { applyText(); setLocalError(t('area.plot.coordsApplied')); return; }
    if (geometry && !check?.ok) { setLocalError(t(plotErrorKey(check!.code))); return; }
    if (outside.length && !keepOutside) { setLocalError(t('area.plot.outsideRequired')); return; }
    onSave(valid, keepOutside);
  };
  return <form className="card area-detail" onSubmit={submit} noValidate aria-labelledby="h-plot-edit" data-testid="plot-editor">
    <h2 id="h-plot-edit"><Pencil size={18} aria-hidden />{draft.id ? t('area.plot.editTitle') : t('area.plot.newTitle')}</h2>
    <Field label={t('properties.plotName')}>{(a) => <input className="input" maxLength={80} {...a} value={draft.name} onChange={(e) => set({ name: e.target.value })} />}</Field>
    <Field label={t('area.place.property')}>{(a) => <select className="input" {...a} value={draft.propertyId} onChange={(e) => set({ propertyId: e.target.value })}>{state.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</Field>
    <div className="form-grid"><Field label={t('plan.form.soil')}>{(a) => select('soil', a)}</Field><Field label={t('plan.form.irrigation')}>{(a) => select('irrigation', a)}</Field></div>
    <fieldset className="area-fieldset"><legend>{t('area.plot.outline')}</legend>
      <p className="meta-13">{t(mapOk ? 'area.plot.drawHelp' : 'area.plot.drawHelpNoMap')}</p>
      <div className="row"><button type="button" className="btn btn--sm" disabled={draft.vertices.length === 0} onClick={() => { const v = draft.vertices.slice(0, -1); onChange({ ...draft, vertices: v, text: formatCoordinateText(v), dirty: true }); }}><Undo2 size={16} aria-hidden />{t('area.plot.undo')}</button>
        <button type="button" className="btn btn--sm" disabled={draft.vertices.length === 0} onClick={() => onChange({ ...draft, vertices: [], text: '', dirty: true })}>{t('area.plot.clear')}</button></div>
      <Field label={t('area.plot.coords')} hint={t('area.plot.coordsHint')} error={textError != null ? t('area.plot.coordsError', { line: textError }) : undefined}>{(a) => <textarea className="input" rows={5} spellCheck={false} {...a} value={draft.text} onChange={(e) => onChange({ ...draft, text: e.target.value, dirty: true })} data-testid="plot-coords" />}</Field>
      <div><button type="button" className="btn btn--sm" onClick={applyText}>{t('area.plot.applyCoords')}</button></div>
      <p role="status" data-testid="plot-geometry-status" className={check && !check.ok ? 'area-status area-status--bad' : 'area-status'}>
        {!geometry ? t('area.plot.noOutline') : check!.ok ? t('area.plot.areaLive', { vertices: draft.vertices.length, area: n2(geodesicAreaHa(check!.geometry)) }) : t(plotErrorKey(check!.code))}</p>
    </fieldset>
    {overlaps.length > 0 && <Notice tone="warn" title={t('area.plot.overlapTitle')}>{t('area.plot.overlap', { names: overlaps.map((p) => p.name).join(', ') })}</Notice>}
    {outside.length > 0 && <Notice tone="warn" title={t('area.plot.outsideTitle')}>{t('area.plot.outside', { names: outside.map((i) => deviceLabel(state.devices.find((d) => d.id === i.deviceId) ?? { id: i.deviceId, nickname: '' })).join(', ') })}
      <label className="check"><input type="checkbox" checked={keepOutside} onChange={(e) => setKeepOutside(e.target.checked)} /><span>{t('area.plot.outsideKeep')}</span></label></Notice>}
    {(localError || error) && <p role="alert" className="notice notice--risk" data-testid="plot-error"><span />{localError || error}</p>}
    <div className="row"><button type="submit" className="btn btn--primary" disabled={busy}>{t('area.plot.save')}</button><button type="button" className="btn" onClick={onCancel}>{t('common.cancel')}</button></div>
  </form>;
}

function PlotDetail({ plot, state, onEdit, onArchive, onOpenSensor }: { plot: Plot; state: State; onEdit: () => void; onArchive: () => void; onOpenSensor: (id: string) => void }) {
  const { t } = useI18n(); const property = state.properties.find((p) => p.id === plot.propertyId); const here = state.installations.filter((i) => i.plotId === plot.id && i.endedAt == null);
  return <section className="card area-detail" aria-labelledby="h-plot" data-testid="plot-detail">
    <h2 id="h-plot"><MapPin size={18} aria-hidden />{plot.name}</h2>
    <dl className="kv"><dt>{t('area.place.property')}</dt><dd>{property?.name ?? '—'}</dd>
      <dt>{t('area.plot.areaCalc')}</dt><dd data-testid="plot-area">{plot.areaCalcHa != null ? `${n2(plot.areaCalcHa)} ha` : <span className="meta-13">{t('area.plot.noOutlineShort')}</span>}</dd>
      <dt>{t('area.plot.areaDeclared')}</dt><dd>{plot.areaHa != null ? `${n2(plot.areaHa)} ha` : <span className="meta-13">{t('area.plot.notDeclared')}</span>}</dd>
      <dt>{t('plan.form.soil')}</dt><dd>{optionLabel('soil', plot.soil)}</dd><dt>{t('plan.form.irrigation')}</dt><dd>{optionLabel('irrigation', plot.irrigation)}</dd></dl>
    {plot.polygon === 'demo_uberlandia' && <Notice tone="warn">{t('area.plot.demoPolygon')}</Notice>}
    <h3>{t('area.plot.sensorsHere')}</h3>
    {here.length === 0 ? <p className="meta">{t('area.plot.noSensorsHere')}</p> : <ul className="list">{here.map((i) => { const d = state.devices.find((x) => x.id === i.deviceId); return <li key={i.id}><button type="button" onClick={() => onOpenSensor(i.deviceId)}><span>{d ? deviceLabel(d) : i.deviceId}</span><span className="meta-13">{fmtPoint(i.point)}</span></button></li>; })}</ul>}
    <p className="meta-13">{t('area.plot.pointNote')}</p>
    <div className="row"><button type="button" className="btn btn--primary" onClick={onEdit}><Pencil size={16} aria-hidden />{t(plot.geometry ? 'area.plot.editOutline' : 'area.plot.drawOutline')}</button><button type="button" className="btn" onClick={onArchive}>{t('area.plot.archive')}</button></div>
  </section>;
}

function Workspace({ access, prefill, clearPrefill }: { access: Access; prefill: { deviceId: string; claimCode: string } | null; clearPrefill: () => void }) {
  const { t } = useI18n(); const state = useStore((s) => s); const [params, setParams] = useSearchParams(); const narrow = useMedia('(max-width: 760px)');
  const tab = (['mapa', 'sensores', 'gateways'] as const).find((x) => x === params.get('aba')) ?? 'mapa';
  const [propertyId, setPropertyId] = useState(''); const [query, setQuery] = useState(''); const [selected, setSelected] = useState<MapSelection>(null);
  const [draft, setDraftState] = useState<PlotDraft | null>(null); const [restored, setRestored] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [wizard, setWizard] = useState(!!prefill); const [moving, setMoving] = useState<string | null>(null); const [picking, setPicking] = useState(false); const [picked, setPicked] = useState<Position | null>(null);
  const [mapFailed, setMapFailed] = useState(false); const [view, setView] = useState<'lista' | 'mapa'>('mapa'); const [pending, setPending] = useState<(() => void) | null>(null);
  const [home, setHome] = useState<Position | null>(null); const [frame, setFrame] = useState(0); const [geo, setGeo] = useState(''); const [now, setNow] = useState(() => new Date().toISOString());
  const map = useLazy(loadMap, tab === 'mapa' && !mapFailed); const addBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (prefill) setWizard(true); }, [prefill]);
  useEffect(() => { const id = setInterval(() => setNow(new Date().toISOString()), 60_000); return () => clearInterval(id); }, []);

  // A plot being edited survives leaving the screen: it is kept as a draft in this account's bucket and offered back.
  useEffect(() => { const saved = state.drafts[DRAFT_KEY]?.json; if (saved) { try { setDraftState(JSON.parse(saved) as PlotDraft); setRestored(true); } catch { setDraft(DRAFT_KEY, null); } } }, []); // eslint-disable-line react-hooks/exhaustive-deps -- once, on entry
  const setEdit = (d: PlotDraft | null) => { setDraftState(d); setDraft(DRAFT_KEY, d?.dirty ? { json: JSON.stringify(d) } : null); };
  useEffect(() => { if (!draft?.dirty) return; const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [draft?.dirty]);
  /** Runs `action` now, or asks first when a plot has unsaved changes. */
  const guard = (action: () => void) => { if (draft?.dirty) setPending(() => action); else { if (draft) setEdit(null); action(); } };

  const properties = state.properties; const activeProps = propertyId ? properties.filter((p) => p.id === propertyId) : properties;
  const plots = useMemo(() => state.plots.filter((p) => !p.archivedAt && (!propertyId || p.propertyId === propertyId)), [state.plots, propertyId]);
  const devices = useMemo(() => state.devices.filter((d) => { if (d.removedAt) return false; if (!propertyId) return true; const i = activeInstallation(state.installations, d.id); const plot = i?.plotId ? state.plots.find((p) => p.id === i.plotId) : null; return !i || !plot || plot.propertyId === propertyId; }), [state.devices, state.installations, state.plots, propertyId]);
  const q = query.trim().toLowerCase(); const match = (text: string) => !q || text.toLowerCase().includes(q);
  const listPlots = plots.filter((p) => match(p.name)); const listDevices = devices.filter((d) => match(`${d.nickname} ${d.id}`));
  const mapPlots = useMemo(() => plots.filter((p) => p.geometry && p.id !== draft?.id).map((p) => ({ id: p.id, name: p.name, geometry: p.geometry! })), [plots, draft?.id]);
  const mapSensors = useMemo(() => devices.flatMap((d) => { const i = activeInstallation(state.installations, d.id); return i ? [{ id: d.id, label: deviceLabel(d), point: i.point }] : []; }), [devices, state.installations]);
  const selectedPlot = selected?.kind === 'plot' ? state.plots.find((p) => p.id === selected.id && !p.archivedAt) : undefined;
  const selectedDevice = selected?.kind === 'sensor' ? state.devices.find((d) => d.id === selected.id) : undefined;
  const setTab = (id: TabId) => guard(() => { const next = new URLSearchParams(params); if (id === 'mapa') next.delete('aba'); else next.set('aba', id); setParams(next, { replace: true }); });
  const select = (s: MapSelection) => guard(() => { setSelected(s); setMoving(null); setPicking(false); setPicked(null); setMessage(''); setError(''); if (narrow && s) setView('lista'); });
  const openSensor = (id: string) => { const next = new URLSearchParams(params); next.delete('aba'); setParams(next, { replace: true }); setSelected({ kind: 'sensor', id }); setMoving(null); setFrame((f) => f + 1); if (narrow) setView('lista'); };
  const fail = (e: unknown) => setError(e instanceof AreaError ? t((e.code === 'invalid_geometry' && e.geometry ? `area.geometry.${e.geometry}` : `area.error.${e.code}`) as MessageKey) : t('area.error.generic'));

  const startPlot = (plot?: Plot) => guard(() => { setError(''); setMessage(''); setSelected(plot ? { kind: 'plot', id: plot.id } : null); setEdit(plot ? draftOf(plot) : newDraft(propertyId || properties[0]?.id || '')); setRestored(false); if (narrow) setView('mapa'); });
  const savePlot = async (geometry: PolygonGeometry | null) => {
    if (!draft) return; setBusy(true); setError('');
    try { const saved = await sensors.savePlot({ id: draft.id, propertyId: draft.propertyId, name: draft.name, soil: draft.soil, irrigation: draft.irrigation, geometry }); setEdit(null); setSelected({ kind: 'plot', id: saved.id }); setMessage(t('area.plot.saved', { name: saved.name })); setFrame((f) => f + 1); }
    catch (e) { fail(e); } finally { setBusy(false); }
  };
  const archive = async (id: string) => { setError(''); try { await sensors.archivePlot(id); setSelected(null); setMessage(t('area.plot.archived')); } catch (e) { fail(e); } };
  const locate = () => { if (!navigator.geolocation) { setGeo(t('area.place.gpsUnsupported')); return; } setGeo(t('area.place.gpsLocating')); navigator.geolocation.getCurrentPosition((pos) => { setHome([pos.coords.longitude, pos.coords.latitude]); setFrame((f) => f + 1); setGeo(''); }, () => setGeo(t('area.place.gpsDenied')), { timeout: 15000 }); };

  const head = <div className="page-head"><div className="stack-2"><h1>{t('area.title')}</h1><p>{t('area.subtitle')}</p></div>
    <div className="row">{access.kind === 'account' ? <Pill tone={access.server === 'confirmed' ? 'ok' : 'warn'}>{t(access.server === 'confirmed' ? 'area.access.confirmed' : access.server === 'checking' ? 'area.access.checking' : 'area.access.notConfirmed')}</Pill> : <Pill tone="warn">{t('area.access.guestPill')}</Pill>}<Pill tone="warn">{t('area.demo.pill')}</Pill></div></div>;
  if (properties.length === 0) return <div className="page">{head}<DemoBanner access={access} /><Empty title={t('area.empty.propertyTitle')} action={<LinkBtn primary to="/propriedades">{t('area.empty.propertyAction')}</LinkBtn>}>{t('area.empty.property')}</Empty></div>;

  const list = <aside className="area__list stack" aria-label={t('area.list.label')} data-testid="area-list">
    <Field label={t('area.list.search')}>{(a) => <input className="input" type="search" {...a} value={query} onChange={(e) => setQuery(e.target.value)} />}</Field>
    <section className="stack-2" aria-labelledby="h-list-plots"><h2 id="h-list-plots" className="area__h">{t('area.list.plots')}</h2>
      {listPlots.length === 0 ? <p className="meta">{plots.length === 0 ? t('area.empty.plots') : t('area.list.noMatch')}</p> : <ul className="list">{listPlots.map((p) => <li key={p.id}><button type="button" aria-current={selected?.kind === 'plot' && selected.id === p.id} onClick={() => select({ kind: 'plot', id: p.id })}><span>{p.name}</span><span className="meta-13">{p.areaCalcHa != null ? `${n2(p.areaCalcHa)} ha` : t('area.plot.noOutlineShort')}</span></button></li>)}</ul>}</section>
    <section className="stack-2" aria-labelledby="h-list-sensors"><h2 id="h-list-sensors" className="area__h">{t('area.list.sensors')}</h2>
      {listDevices.length === 0 ? <p className="meta">{devices.length === 0 ? t('area.empty.sensors') : t('area.list.noMatch')}</p> : <ul className="list">{listDevices.map((d) => { const st = contactOf(state, d.id, now); const i = activeInstallation(state.installations, d.id); return <li key={d.id}><button type="button" aria-current={selected?.kind === 'sensor' && selected.id === d.id} onClick={() => select({ kind: 'sensor', id: d.id })}><span>{deviceLabel(d)}</span><span className="meta-13">{!i ? t('area.sensor.notInstalled') : t(st.contact === 'never' ? 'area.contact.never' : st.contact === 'late' ? 'area.contact.late' : st.data === 'old' ? 'area.contact.recentOld' : 'area.contact.recent')}</span></button></li>; })}</ul>}</section>
  </aside>;

  const mapPane = <div className="area__map" data-testid="area-map-pane">
    {mapFailed || map.failed ? <div className="stack" style={{ padding: 16 }}><Notice tone="warn" title={t('area.map.failedTitle')}>{t('area.map.failed')}</Notice><div><button type="button" className="btn btn--sm" onClick={() => { setMapFailed(false); map.retry(); }}>{t('common.retry')}</button></div></div>
      : map.mod ? <map.mod.default plots={mapPlots} sensors={mapSensors} selected={selected} onSelect={select} mode={draft ? 'draw' : picking ? 'pick' : 'view'} draft={draft ? draft.vertices : null}
        onDraft={(v) => { if (draft) setEdit({ ...draft, vertices: v, text: formatCoordinateText(v), dirty: true }); }} picked={picked} onPick={(pt) => { setPicked(pt); setPicking(false); if (narrow) setView('lista'); }} home={home} frameKey={`${frame}:${propertyId}`} onUnavailable={() => setMapFailed(true)} />
        : <div className="sim__loading" role="status"><span className="spinner" aria-hidden /><span>{t('area.map.loading')}</span></div>}
    {!mapFailed && map.mod && <div className="area__map-tools"><button type="button" className="btn btn--sm" onClick={locate}><LocateFixed size={16} aria-hidden />{t('area.map.locate')}</button>{geo && <span role="status" className="area__map-note">{geo}</span>}
      {draft && <span className="area__map-note">{t('area.map.drawing')}</span>}{picking && <span className="area__map-note">{t('area.map.picking')}</span>}</div>}
  </div>;

  const detail = <div className="area__detail stack" data-testid="area-detail">
    {restored && draft && <Notice tone="water">{t('area.plot.restored')}</Notice>}
    {message && <p role="status" className="notice" data-testid="area-message"><span />{message}</p>}
    {error && !draft && <p role="alert" className="notice notice--risk"><span />{error}</p>}
    {draft ? <PlotEditor draft={draft} state={state} onChange={setEdit} onSave={(g) => void savePlot(g)} onCancel={() => guard(() => undefined)} busy={busy} error={error} mapOk={!mapFailed && !map.failed} />
      : moving && selectedDevice ? <section className="card area-detail" aria-labelledby="h-move"><h2 id="h-move">{t('area.install.moveTitle', { name: deviceLabel(selectedDevice) })}</h2><p className="meta-13">{t('area.install.moveText')}</p>
        <PlaceForm initial={{ plotId: activeInstallation(state.installations, moving)?.plotId ?? undefined }} picked={picked} onPickOnMap={mapFailed ? undefined : () => { setPicking(true); if (narrow) setView('mapa'); }} submitLabel={t('area.install.moveSave')} busy={busy}
          onSubmit={(p) => { setBusy(true); setError(''); sensors.install({ deviceId: moving, plotId: p.plotId, point: p.point, positionSource: p.source, accuracyM: p.accuracyM, positionAt: p.at }).then(() => { setMoving(null); setPicked(null); setMessage(t('area.install.moved')); setFrame((f) => f + 1); }).catch(fail).finally(() => setBusy(false)); }} />
        <div><button type="button" className="btn" onClick={() => { setMoving(null); setPicking(false); setPicked(null); }}>{t('common.cancel')}</button></div></section>
      : selectedDevice ? <SensorDetail deviceId={selectedDevice.id} now={now} onMove={() => { setMoving(selectedDevice.id); setPicked(null); setMessage(''); }} onClosed={() => setFrame((f) => f + 1)} />
      : selectedPlot ? <PlotDetail plot={selectedPlot} state={state} onEdit={() => startPlot(selectedPlot)} onArchive={() => void archive(selectedPlot.id)} onOpenSensor={(id) => select({ kind: 'sensor', id })} />
      : <Empty title={t('area.detail.noneTitle')}>{t('area.detail.none')}</Empty>}
  </div>;

  const gateways = [...new Map(state.measurements.filter((m) => m.gatewayId && devices.some((d) => d.id === m.deviceId)).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt)).map((m) => [m.gatewayId!, m])).values()];
  return <div className="page area" data-testid="area-page">{head}
    <DemoBanner access={access} />
    <div className="row-between area__bar">
      <Field label={t('area.place.property')}>{(a) => <select className="input" {...a} value={propertyId} onChange={(e) => guard(() => { setPropertyId(e.target.value); setSelected(null); })}><option value="">{t('area.allProperties')}</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</Field>
      <div className="row"><button type="button" className="btn" onClick={() => startPlot()}><Plus size={16} aria-hidden />{t('area.plot.new')}</button>
        <button type="button" className="btn btn--primary" ref={addBtn} onClick={() => guard(() => setWizard(true))}><Radio size={16} aria-hidden />{t('area.sensor.add')}</button></div>
    </div>
    <Tabs label={t('area.tabs.label')} value={tab} onChange={setTab} tabs={[{ id: 'mapa', label: t('area.tabs.map'), icon: <MapPin size={18} aria-hidden /> }, { id: 'sensores', label: t('area.tabs.sensors'), icon: <Radio size={18} aria-hidden /> }, { id: 'gateways', label: t('area.tabs.gateways'), icon: <RadioTower size={18} aria-hidden /> }]} />
    {tab === 'mapa' && <TabPanel id="mapa">
      {narrow && <Seg legend={t('area.view.legend')} name="area-vista" value={view} onChange={setView} options={[{ value: 'mapa', label: t('area.view.map') }, { value: 'lista', label: t('area.view.list') }]} />}
      <div className="area__grid" data-view={view}>{list}{mapPane}{detail}</div>
      <p className="meta-13">{t('area.map.note', { count: activeProps.length })}</p></TabPanel>}
    {tab === 'sensores' && <TabPanel id="sensores">
      {devices.length === 0 ? <Empty title={t('area.empty.sensorsTitle')} action={<button type="button" className="btn btn--primary" onClick={() => setWizard(true)}>{t('area.sensor.add')}</button>}>{t('area.empty.sensors')}</Empty>
        : <div className="grid-auto">{devices.map((d) => { const i = activeInstallation(state.installations, d.id); const m = state.measurements.filter((x) => x.deviceId === d.id).sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0]; return <section className="card" key={d.id} data-testid="sensor-card"><div className="row-between"><h2><Radio size={18} aria-hidden />{deviceLabel(d)}</h2><ContactPill status={contactOf(state, d.id, now)} /></div>
          <dl className="kv"><dt>{t('area.sensor.id')}</dt><dd translate="no"><code>{d.id}</code></dd><dt>{t('area.sensor.plot')}</dt><dd>{i ? (i.plotId ? state.plots.find((p) => p.id === i.plotId)?.name ?? '—' : t('area.sensor.noPlot')) : t('area.sensor.notInstalled')}</dd><dt>{t('area.sensor.observedAt')}</dt><dd>{m ? dDateTime(m.observedAt) : <span className="meta-13">{t('area.sensor.noReading')}</span>}</dd></dl>
          <div><button type="button" className="btn btn--sm" onClick={() => openSensor(d.id)}>{t('area.sensor.open')}</button></div></section>; })}</div>}</TabPanel>}
    {tab === 'gateways' && <TabPanel id="gateways">
      <Notice title={t('area.gateway.title')}>{t('area.gateway.text')}</Notice>
      {gateways.length === 0 ? <Empty title={t('area.gateway.noneTitle')}>{t('area.gateway.none')}</Empty>
        : <div className="grid-auto">{gateways.map((m) => <section className="card" key={m.gatewayId} data-testid="gateway-card"><div className="row-between"><h2><RadioTower size={18} aria-hidden /><span translate="no">{m.gatewayId}</span></h2>{m.origin === 'synthetic' && <Pill tone="warn">{t('kind.synthetic')}</Pill>}</div>
          <dl className="kv"><dt>{t('area.gateway.lastHeard')}</dt><dd>{dDateTime(m.receivedAt)}</dd><dt>{t('area.gateway.heardFrom')}</dt><dd>{deviceLabel(state.devices.find((d) => d.id === m.deviceId) ?? { id: m.deviceId, nickname: '' })}</dd><dt>{t('area.gateway.expected')}</dt><dd><span className="meta-13">{t('area.gateway.notDefined')}</span></dd><dt>{t('area.gateway.health')}</dt><dd><span className="meta-13">{t('area.gateway.healthPending')}</span></dd></dl></section>)}</div>}</TabPanel>}
    <SensorWizard open={wizard} onClose={() => { setWizard(false); clearPrefill(); addBtn.current?.focus(); }} prefill={prefill} onOpenSensor={openSensor} />
    <Dialog open={!!pending} onClose={() => setPending(null)} title={t('area.unsaved.title')}>
      <p>{t('area.unsaved.text')}</p>
      <div className="row"><button type="button" className="btn btn--primary" onClick={() => setPending(null)}>{t('area.unsaved.keep')}</button><button type="button" className="btn" data-testid="discard-draft" onClick={() => { const action = pending; setPending(null); setEdit(null); setError(''); action?.(); }}>{t('area.unsaved.discard')}</button></div>
    </Dialog>
  </div>;
}

export function MyArea() {
  const { t } = useI18n(); const [params, setParams] = useSearchParams(); const access = useAccess(params.get('demo') === '1');
  // A QR opened by the phone camera lands here as ?d=<id>&c=<code>. Both are taken into memory and removed from the
  // address at once, so the ownership code does not stay in the URL, the history entry or a shared link.
  const [prefill, setPrefill] = useState<{ deviceId: string; claimCode: string } | null>(null);
  useEffect(() => {
    const d = params.get('d'), c = params.get('c'); if (d == null && c == null) return;
    const next = new URLSearchParams(params); next.delete('d'); next.delete('c'); setParams(next, { replace: true });
    if (d && c) setPrefill({ deviceId: d, claimCode: c });
  }, [params, setParams]);
  if (access.kind === 'signed_out') return <Gate />;
  if (access.kind === 'account' && access.server === 'rejected') return <div className="page" style={{ maxWidth: 720 }}><h1>{t('area.title')}</h1><Notice tone="risk" title={t('area.access.rejectedTitle')}>{t('area.access.rejected')}</Notice><div><LinkBtn primary to="/conta">{t('area.access.signIn')}</LinkBtn></div></div>;
  return <Workspace access={access} prefill={prefill} clearPrefill={() => setPrefill(null)} />;
}

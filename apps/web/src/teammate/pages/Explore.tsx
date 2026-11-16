import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, ChevronUp, Layers, LocateFixed, MapPin, Minus, Plus, RotateCcw, Search } from 'lucide-react';
import { countryName, coverage, geography, imagery, type BBox, type Coverage, type FC, type Place, type SearchResult } from '../adapters';
import { latestOnly, type Meta } from '../adapters/core';
import type { MapHandle, MapLayers, Selection } from '../map/types';
import { MOTION, PRESETS } from '../config';
const MOTION_FLY = MOTION.fly;
import { byName, dFull, dNumeric, norm } from '../format';
import { translate, useI18n, type MessageKey } from '../i18n';
import { Empty, ErrorState, LinkBtn, Loading, Notice, Pill, Source, useAsync, useMedia } from '../ui';
import { useLazy } from '../lazyPage';
import { fillCss, mapPalette } from '../map/palette';
import { usePrefs } from '../prefs';
import { locations, type LocationSummary } from '../adapters/locations';
import { parseSelection } from '../geo/ids';
import { countriesWithData, orderCountries } from '../geo/countriesWithData';
import { loadUSCounties, loadUSStates, stateSelection } from '../geo/usStates';
import { stateOfCounty } from '../geo/usFips';
import { simulations } from '../adapters/simulations';
import { USStatesPanel } from '../ui/USStatesPanel';
import { usStatesCopy } from '../i18n/usStates';
import { centerOf, coveredMunicipalities, fieldOf, placesWithData, statesWithData, useCoverageIndex, type PlaceWithData } from '../geo/coverageIndex';

const loadMap = () => import('../map/ExplorerMap');
const KIND: Record<string, { key: MessageKey; tone: 'water' | 'warn' | 'ok' | 'soil' }> = { previsao: { key: 'kind.forecast', tone: 'water' }, simulacao: { key: 'kind.historicalSim', tone: 'warn' }, historico: { key: 'kind.historical', tone: 'soil' }, observacao: { key: 'kind.orbital', tone: 'ok' } };
/** Product label from its id (coverage.product.*); crops in the current language. */
export const productLabel = (id: string, crops: string[]) => translate(`coverage.product.${id}`, { crops: crops.map((c) => translate(`land.${c}`)).join(', ') });
const periodsLabel = (ps: { start: string; end: string }[]) => ps.map((p) => (p.start === p.end ? dFull(p.start) : `${dFull(p.start)} – ${dFull(p.end)}`)).join(' · ') || translate('coverage.noPeriod');
import { stepSheet, useBottomSheet, type SheetPos } from '../ui/bottom-sheet';

function pointIn(geom: any, lon: number, lat: number) {
  const ring = (r: number[][]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > lat) !== (r[j][1] > lat) && lon < ((r[j][0] - r[i][0]) * (lat - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates; return polys.some((p: number[][][]) => ring(p[0]));
}

export function Explore() {
  const [params, setParams] = useSearchParams(); const nav = useNavigate(); const { t, locale } = useI18n();
  // The legend reads the same palette object as the map layers, so swatches and map cannot drift apart.
  const palette = mapPalette(usePrefs((p) => p.theme));
  const sel: Selection = useMemo(() => parseSelection(params), [params]);
  const select = (s: Selection) => { const p = new URLSearchParams(params); ['pais', 'uf', 'mun'].forEach((k) => p.delete(k)); if (s.pais) p.set('pais', s.pais); if (s.uf) p.set('uf', s.uf); if (s.mun) p.set('mun', s.mun); setParams(p); };
  const wide = useMedia('(min-width: 1100px)'); const mobile = useMedia('(max-width: 760px)');
  // Places outside Brazil come from the location core (/v1/locations); Brazilian ones stay in the coverage index.
  const located = useAsync((sg) => locations.list(sg), []); const abroad = (located.data ?? []).filter((l) => !l.legacy_area_id);
  const states = useAsync((sg) => geography.states(sg), []); const world = useAsync((sg) => geography.countries(sg), []); const [worldFilter, setWorldFilter] = useState('');
  const us = sel.pais === 'USA';
  const usStates = useAsync(() => us ? loadUSStates() : Promise.resolve(null), [us]);
  // County boundaries of the selected US state (all counties, Census), and places with published planning runs.
  const usCounties = useAsync(() => (us && sel.uf ? loadUSCounties(sel.uf) : Promise.resolve(null)), [us, sel.uf]);
  const simCatalog = useAsync((sg) => simulations.capabilities({}, sg).catch(() => null), []);
  const simIds = useMemo(() => (simCatalog.data?.places ?? []).filter((p) => p.capabilities.some((c) => c.status === 'ready')).map((p) => p.location_id), [simCatalog.data]);
  const mapStates = us ? usStates.data ?? null : states.data?.data ?? null;
  const br = sel.pais === 'BR'; const country = sel.pais && !br ? world.data?.data.find((c) => c.code === sel.pais) ?? null : null; const unknownCountry = !!sel.pais && !br && !!world.data && !country;
  // Malha municipal e cobertura: só a resposta do pedido mais recente é aplicada.
  const [mun, setMun] = useState<{ uf: string | null; status: 'idle' | 'loading' | 'ok' | 'error'; fc: FC | null; meta?: Meta; error?: unknown }>({ uf: null, status: 'idle', fc: null });
  const runMun = useRef(latestOnly()).current; const runCov = useRef(latestOnly()).current; const [munTick, setMunTick] = useState(0);
  useEffect(() => { if (sel.pais !== 'BR' || !sel.uf) { setMun({ uf: null, status: 'idle', fc: null }); return; } setMun((m) => ({ uf: sel.uf, status: 'loading', fc: m.uf === sel.uf ? m.fc : null })); const uf = sel.uf; runMun((sg) => geography.municipalities(uf, sg)).then((r) => { if (!r.stale) setMun({ uf, status: 'ok', fc: r.value.data, meta: r.value.meta }); }).catch((error) => setMun({ uf, status: 'error', fc: null, error })); }, [sel.pais, sel.uf, munTick]); // eslint-disable-line
  const [cov, setCov] = useState<{ code: string | null; status: 'idle' | 'loading' | 'ok' | 'error'; data?: Coverage; meta?: Meta; error?: unknown }>({ code: null, status: 'idle' }); const [covTick, setCovTick] = useState(0);
  useEffect(() => { if (!sel.mun || sel.pais !== 'BR') { setCov({ code: null, status: 'idle' }); return; } const code = sel.mun; setCov({ code, status: 'loading' }); runCov((sg) => coverage.get(code, sg)).then((r) => { if (!r.stale) setCov({ code, status: 'ok', data: r.value.data, meta: r.value.meta }); }).catch((error) => setCov({ code, status: 'error', error })); }, [sel.mun, covTick]); // eslint-disable-line
  const [layers, setLayers] = useState<MapLayers>({ municipios: true, cobertura: true, imagem: false }); const [layersOpen, setLayersOpen] = useState(false);
  // Places with data come from the API catalogue (D-09); a failed catalogue is shown as such, never as "no data".
  const cidx = useCoverageIndex(); const withData = useMemo(() => placesWithData(cidx.index), [cidx.index]); const covered = useMemo(() => coveredMunicipalities(cidx.index), [cidx.index]); const ufWithData = useMemo(() => statesWithData(cidx.index), [cidx.index]);
  const imgMun = sel.mun && fieldOf(cidx.index, sel.mun) ? sel.mun : '3170206';
  const img = useAsync((sg) => (layers.imagem ? imagery.series(imgMun, sg) : Promise.resolve(null)), [layers.imagem, imgMun, cidx.index]);
  const showWithData = params.get('dados') === '1';
  const seeWithData = () => {
    const p = new URLSearchParams(params);
    ['pais', 'uf', 'mun'].forEach((key) => p.delete(key));
    p.set('dados', '1'); setWorldFilter(''); setParams(p);
  };
  const toggleWithData = () => {
    if (!showWithData) { seeWithData(); return; }
    const p = new URLSearchParams(params); p.delete('dados'); setParams(p);
  };
  const [mapDown, setMapDown] = useState<string | null>(null); const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'base-offline'>('loading'); const [geo, setGeo] = useState<string | null>(null); const [sheet, setSheet] = useState<SheetPos>('media'); const [filter, setFilter] = useState('');
  const map = useRef<MapHandle>(null); const mapMod = useLazy(loadMap); const ExplorerMap = mapMod.mod?.default;
  const [munLimit, setMunLimit] = useState(80);
  useEffect(() => { setFilter(''); setMunLimit(80); }, [sel.uf]);
  useEffect(() => { if (mobile && sel.mun) setSheet('media'); }, [sel.mun, mobile]);
  useEffect(() => { if (mobile && showWithData && !sel.pais) setSheet('expandida'); }, [mobile, showWithData, sel.pais]);

  const ufFeature = sel.uf ? mapStates?.features.find((f) => f.properties.code === sel.uf) : undefined;
  const ufCode = (sigla: string | undefined | null) => states.data?.data.features.find((f) => f.properties.sigla === sigla)?.properties.code ?? '';
  const markers = useMemo(() => withData.flatMap((p) => { const c = centerOf(p.municipality); return c ? [{ code: p.municipality.id, uf: ufCode(p.municipality.stateId?.replace(/^BR-/, '')), name: p.municipality.name, lon: c[0], lat: c[1] }] : []; }).concat(abroad.filter(l => !us || !sel.uf || l.admin1_code === sel.uf).map((l) => ({ code: l.id, uf: l.admin1_code, name: l.name, lon: l.centroid[0]!, lat: l.centroid[1]!, href: `#/municipio?id=${encodeURIComponent(l.id)}` }))), [withData, states.data, located.data, us, sel.uf]); // eslint-disable-line
  const catalogArea = sel.mun && cidx.index?.status === 'ok' ? cidx.index.areas.find((a) => a.id === sel.mun) : undefined; const catalogName = catalogArea?.name;
  const catalogBox: BBox | null = catalogArea?.bbox ? [[catalogArea.bbox[0], catalogArea.bbox[1]], [catalogArea.bbox[2], catalogArea.bbox[3]]] : null;
  const munFeature = sel.mun && mun.uf === sel.uf ? mun.fc?.features.find((f) => f.properties.code === sel.mun) : undefined;
  const munList = useMemo(() => { const all = mun.fc?.features ?? []; const f = norm(filter); const hit = f ? all.filter((x) => norm(x.properties.name).includes(f) || x.properties.code.startsWith(f)) : all; return [...hit].sort((a, b) => Number(covered.includes(b.properties.code)) - Number(covered.includes(a.properties.code)) || byName(a.properties.name, b.properties.name)); }, [mun.fc, filter, covered, locale]); // eslint-disable-line
  // Phone: the panel is a bottom sheet (three positions, dragged by its grip). The map keeps the room of the middle position at most.
  const rootRef = useRef<HTMLDivElement>(null); const sheetUi = useBottomSheet({ enabled: mobile, pos: sheet, onPos: setSheet, container: rootRef });
  const sheetPx = mobile ? sheetUi.heights[sheet === 'expandida' ? 'media' : sheet] : 0;
  const padding = mobile ? { top: 132, left: 0, right: 0, bottom: sheetPx } : { top: 0, left: 344 + 16, right: wide && sel.mun && !us ? 312 + 16 : 0, bottom: 0 };
  const locate = () => {
    if (!navigator.geolocation) { setGeo(t('explore.geo.unsupported')); return; } setGeo(t('explore.geo.locating'));
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { longitude: lon, latitude: lat } = pos.coords; map.current?.flyTo(lon, lat);
      const st = states.data?.data.features.find((f) => pointIn(f.geometry, lon, lat));
      if (!st) {
        // Outside Brazil: select the country under the position once the camera arrives (D-26). Regions below country level are not loaded.
        setTimeout(() => { const c = map.current?.countryAt(lon, lat); if (c) { select({ pais: c === 'BRA' ? 'BR' : c, uf: null, mun: null }); setGeo(t('explore.geo.country')); } else setGeo(t('explore.geo.noCountry')); }, MOTION_FLY + 300);
        return;
      }
      const fc = (await geography.municipalities(st.properties.code)).data; const m = fc?.features.find((f) => pointIn(f.geometry, lon, lat));
      select({ pais: 'BR', uf: st.properties.code, mun: m?.properties.code ?? null }); setGeo(m ? t('explore.geo.here', { place: `${m.properties.name}, ${st.properties.sigla}` }) : t('explore.geo.here', { place: st.properties.name }));
    }, (err) => setGeo(err.code === 1 ? t('explore.geo.denied') : t('explore.geo.failed')), { timeout: 8000 });
  };

  const brName = world.data?.data.find((c) => c.code === 'BR'); const brLabel = brName ? countryName(brName, locale) : 'Brasil';
  // US counties are named from the Census boundary (or the published core); the IBGE municipality card does not apply.
  const usCountyName = us && sel.mun ? (abroad.find((l) => l.id === sel.mun)?.name ?? usCounties.data?.features.find((f) => f.properties.code === sel.mun)?.properties.name ?? null) : null;
  const title = usCountyName ? usCountyName : munFeature ? munFeature.properties.name : sel.mun ? catalogName ?? t('explore.municipality') : ufFeature ? ufFeature.properties.name : br ? brLabel : country ? countryName(country, locale) : sel.pais ? (unknownCountry ? t('explore.countryNotFound') : t('explore.country')) : t(showWithData ? 'explore.withData.show' : 'explore.title');
  const next = us ? usStatesCopy[locale][sel.uf ? 'counties' : 'choose'] : sel.mun ? t('explore.next.mun') : sel.uf ? t('explore.next.uf') : br ? t('explore.next.br') : sel.pais ? (country ? t(abroad.some((l) => l.country === country.a2) ? 'location.nextWithData' : 'explore.next.country', { continent: t(`continent.${country.continent}` as MessageKey) }) : '') : t('explore.next.world');
  const searchBox = <PlaceSearch onPick={(p) => select(p.type === 'pais' ? { pais: p.code, uf: null, mun: null } : { pais: p.country ?? 'BR', uf: p.uf, mun: p.type === 'municipio' ? p.code : null })} />;
  // Countries with data come from the catalogues (Brazilian coverage + published location cores abroad), not from a fixed code.
  const dataByCountry = useMemo(() => countriesWithData({ brStates: withData.length ? ufWithData : [], abroad: [...abroad, ...simIds.flatMap((id) => { const st = stateOfCounty(id); return st ? [{ country: 'US', admin1_code: st }] : []; })] }), [withData.length, ufWithData, abroad, simIds]);
  const dataLoading = !cidx.index || located.status === 'loading' || simCatalog.status === 'loading';
  const dataReady = cidx.index?.status === 'ok' && located.status === 'ok' && simCatalog.status === 'ok';
  const worldList = useMemo(() => { const f = norm(worldFilter); const all = (world.data?.data ?? []).filter((c) => !showWithData || !!c.a2 && dataByCountry.has(c.a2)); const hit = f ? all.filter((c) => c.aliases.some((a) => norm(a).includes(f)) || norm(translate(`continent.${c.continent}`)).includes(f)) : all; return orderCountries(hit, dataByCountry, (c) => countryName(c, locale), byName); }, [world.data, worldFilter, locale, dataByCountry, showWithData]);
  const detail = sel.mun && !us ? <div data-tour="explore-coverage"><MunDetail code={sel.mun} name={munFeature?.properties.name ?? catalogName} uf={ufFeature?.properties.sigla} cov={cov} munStatus={mun.status} meshLoaded={!!mun.fc} found={!!munFeature || !!catalogName} outline={!!munFeature} retry={() => setCovTick((t) => t + 1)} onSeeCovered={seeWithData} go={nav} /></div> : null;
  const withDataBox = showWithData && <WithData state={cidx.index} places={withData} onRetry={cidx.retry} onPick={(p) => select({ pais: 'BR', uf: ufCode(p.municipality.stateId?.replace(/^BR-/, '')), mun: p.municipality.id })} />;

  return (
    <div className="explore" ref={rootRef}>
      {mapDown ? <div className="explore__map" style={{ display: 'grid', placeItems: 'center', padding: 24, paddingLeft: mobile ? 24 : 384 }}><Notice tone="warn" title={t('explore.map.unavailableTitle')}>{t('explore.map.unavailable')}</Notice></div>
        : mapMod.failed ? <div className="explore__map" style={{ display: 'grid', placeItems: 'center', padding: 24, paddingLeft: mobile ? 24 : 384 }}><div className="stack-2"><Notice tone="warn" title={t('explore.map.downloadTitle')}>{t('explore.map.download')}</Notice><div><button className="btn btn--sm" onClick={mapMod.retry}>{t('common.retry')}</button></div></div></div>
        : ExplorerMap && <ExplorerMap ref={map} onStatus={(s) => setMapStatus((prev) => (s === 'ready' && prev === 'base-offline' ? prev : s))} selection={sel} states={mapStates} municipalities={us ? usCounties.data ?? null : mun.uf === sel.uf ? mun.fc : null} covered={us ? [...abroad.map((l) => l.id), ...simIds] : covered} layers={layers} countryBox={country?.bbox ?? null} placeBox={!munFeature && catalogBox ? catalogBox : null} padding={padding} image={img.data ? { url: img.data.data.imageUrl, corners: img.data.data.image.corners, field: img.data.data.field.geojson } : null} onPick={select} onUnavailable={setMapDown} markers={markers} />}
      {!mapDown && !mapMod.failed && mapStatus === 'loading' && <div className="explore__loading" role="status" style={{ paddingLeft: mobile ? 0 : 360 }}><span className="spinner" aria-hidden /><span>{t('explore.map.loading')}</span></div>}
      {!mapDown && mapStatus === 'base-offline' && <div className="explore__toast" role="status">{t('explore.map.baseOffline')}</div>}
      {mobile && <div className="explore__search-top" onFocusCapture={() => setSheet('recolhida')}>{searchBox}</div>}
      <section className="explore__panel" data-testid="explore-sheet" data-pos={mobile ? sheet : undefined} data-dragging={sheetUi.dragging || undefined} aria-label={t('explore.panel')} style={mobile ? ({ '--sheet-h': `${sheetUi.height}px` } as any) : undefined}>
        {mobile && <div className="sheet-grip" data-testid="explore-sheet-grip" {...sheetUi.grip}>
          <span className="sheet-grip__bar" aria-hidden />
          <div className="row sheet-grip__actions" role="group" aria-label={t('explore.sheet.expand', { pos: t(`explore.sheet.${sheet}` as MessageKey) })}>
            <button type="button" className="btn btn--sm btn--quiet" disabled={sheet === 'expandida'} onClick={() => setSheet(stepSheet(sheet, 1))}><ChevronUp size={16} aria-hidden />{t('explore.sheet.expandBtn')}</button>
            <button type="button" className="btn btn--sm btn--quiet" disabled={sheet === 'recolhida'} onClick={() => setSheet(stepSheet(sheet, -1))}><ChevronDown size={16} aria-hidden />{t('explore.sheet.collapseBtn')}</button>
          </div>
        </div>}
        <div className="explore__sheet-scroll" data-testid="explore-sheet-scroll" {...(mobile ? sheetUi.content : {})}>
        <div className="explore__panel-head">
          {!mobile && searchBox}
          <nav className="crumbs" aria-label={t('explore.crumbs')}>
            {[{ label: t('explore.world'), s: { pais: null, uf: null, mun: null }, on: true }, { label: br ? brLabel : country ? countryName(country, locale) : sel.pais ?? '', s: { pais: sel.pais, uf: null, mun: null }, on: !!sel.pais }, { label: ufFeature?.properties.sigla ?? sel.uf ?? '', s: { pais: sel.pais, uf: sel.uf, mun: null }, on: !!sel.uf }, { label: usCountyName ?? munFeature?.properties.name ?? catalogName ?? sel.mun ?? '', s: sel, on: !!sel.mun }].filter((c) => c.on).map((c, i, a) => <span key={c.label} className="row" style={{ gap: 2 }}>{i > 0 && <ChevronRight size={14} aria-hidden />}{i === a.length - 1 ? <span aria-current="location">{c.label}</span> : <button onClick={() => select(c.s as Selection)}>{c.label}</button>}</span>)}
          </nav>
          <div><h1 style={{ fontSize: 24 }}>{title}</h1><p className="meta">{next}</p></div>
        </div>
        <div className="explore__panel-body" data-tour="explore-lists">
          <div className="stack-2" data-tour="explore-with-data">
            <button className="btn btn--sm" aria-pressed={showWithData} onClick={toggleWithData}>{t(showWithData ? 'explore.withData.hide' : 'explore.withData.show')}</button>
          </div>
          {!sel.pais && (world.status === 'error' ? <ErrorState error={world.error} onRetry={world.retry} /> : !world.data ? <Loading label={t('explore.loadingCountries')} rows={5} /> : <div className="stack-2">
            {showWithData && dataLoading && <Loading label={t('explore.withData.loading')} rows={2} />}
            {showWithData && cidx.index?.status === 'failed' && <Notice tone="warn" title={t('explore.withData.failedTitle')}>{t('explore.withData.failed')} <button className="btn btn--sm" onClick={cidx.retry}>{t('common.retry')}</button></Notice>}
            {showWithData && located.status === 'error' && <ErrorState error={located.error} onRetry={located.retry} />}
            <label className="sr-only" htmlFor="filtro-pais">{t('explore.filterCountries')}</label>
            <input id="filtro-pais" className="input" name="filtro-pais" autoComplete="off" spellCheck={false} placeholder={t('explore.filterCountriesPh', { count: showWithData ? world.data.data.filter((c) => c.a2 && dataByCountry.has(c.a2)).length : world.data.data.length })} value={worldFilter} onChange={(e) => setWorldFilter(e.target.value)} />
            {worldList.length === 0 ? ((!showWithData || dataReady) && <Empty title={t('explore.noCountry')}>{t('explore.noCountryText')}</Empty>) : <ul className="list list--long" data-tour="explore-country-list" aria-label={t('explore.countries')}>{worldList.map((c) => {
              const dataStates = c.a2 ? dataByCountry.get(c.a2) : undefined;
              const summary = c.a2 === 'BR' ? t('explore.brStates') : c.a2 === 'US' ? usStatesCopy[locale].countryLine : t(`continent.${c.continent}` as MessageKey);
              return <li key={c.code}><button onClick={() => select({ pais: c.code, uf: null, mun: null })}>
                <span className="stack-2" style={{ gap: 2 }}>{dataStates ? <b>{countryName(c, locale)}</b> : <span>{countryName(c, locale)}</span>}<span className="meta-13">{summary}{dataStates?.length ? ` · ${t('explore.dataIn', { states: dataStates.join(', ') })}` : ''}</span></span>
                {dataStates ? <Pill tone="water">{t('explore.withDataPill')}</Pill> : <ChevronRight size={18} aria-hidden />}
              </button></li>;
            })}</ul>}
            <Source meta={world.data.meta} />
          </div>)}
          {sel.pais && !br && (world.status === 'error' ? <ErrorState error={world.error} onRetry={world.retry} /> : !world.data ? <Loading label={t('explore.loadingCountry')} rows={3} /> : unknownCountry ? <Notice tone="risk" title={t('explore.countryNotFoundTitle')}>{t('explore.countryNotFoundText', { code: sel.pais })}</Notice> : <div className="stack" data-testid="country-detail" data-code={sel.pais}>
            {us ? <USStatesPanel states={usStates.data ?? null} stateCode={sel.uf} counties={usCounties.data ?? null} countyCode={sel.mun} onPickCounty={(code) => select({ pais: 'USA', uf: sel.uf, mun: code })} extraCovered={simIds} items={abroad} loading={usStates.status === 'loading'} error={usStates.error} retry={usStates.retry} locationsLoading={located.status === 'loading'} locationsError={located.error} retryLocations={located.retry} onPick={code => select(stateSelection(code))} /> : abroad.some((l) => l.country === country?.a2) ? <AbroadList items={abroad.filter((l) => l.country === country?.a2)} /> : <><div><Pill>{t('explore.noAnalysis')}</Pill></div>
            <p>{t('explore.countryText', { country: countryName(country!, locale) })}</p>
            <Notice>{t('explore.countryNotice', { states: ufWithData.length ? ` (${ufWithData.join(', ')})` : '' })}</Notice></>}
            <div className="row"><button className="btn btn--primary" onClick={() => select({ pais: null, uf: null, mun: null })}>{t('explore.keepExploring')}</button><button className="btn" onClick={seeWithData}>{t('explore.seeWithData')}</button></div>
          </div>)}
          {br && !sel.uf && withDataBox}
          {br && !sel.uf && (states.status === 'error' ? <ErrorState error={states.error} onRetry={states.retry} /> : !states.data ? <Loading label={t('explore.loadingStates')} rows={5} /> :
            <ul className="list" aria-label={t('explore.states')}>{[...states.data.data.features].sort((a, b) => Number(ufWithData.includes(b.properties.sigla!)) - Number(ufWithData.includes(a.properties.sigla!)) || byName(a.properties.name, b.properties.name)).map((f) => <li key={f.properties.code}><button onClick={() => select({ pais: 'BR', uf: f.properties.code, mun: null })}><span>{f.properties.name} <span className="meta-13">{f.properties.sigla}</span></span>{ufWithData.includes(f.properties.sigla!) ? <Pill tone="water">{t('explore.withDataPill')}</Pill> : <ChevronRight size={18} aria-hidden />}</button></li>)}</ul>)}
          {sel.uf && !wide && detail}
          {br && sel.uf && (mun.status === 'error' ? <ErrorState error={mun.error} onRetry={() => setMunTick((t) => t + 1)} /> : mun.status === 'loading' && !mun.fc ? <Loading label={t('explore.loadingMun')} rows={6} /> : mun.status === 'ok' && !mun.fc ?
            <Empty title={t('explore.munNotLoaded')}>{t('explore.munNotLoadedText')}</Empty> : mun.fc && <div className="stack-2">
              <label className="sr-only" htmlFor="filtro-mun">{t('explore.filterMun', { uf: ufFeature?.properties.name ?? '' })}</label>
              <input id="filtro-mun" className="input" name="filtro-municipio" autoComplete="off" spellCheck={false} placeholder={t('explore.filterMunPh', { count: mun.fc.features.length })} value={filter} onChange={(e) => setFilter(e.target.value)} />
              {munList.length === 0 ? <Empty title={t('explore.noMun')}>{t('explore.noMunText')}</Empty> : <ul className="list" aria-label={t('explore.municipalities')}>{munList.slice(0, munLimit).map((f) => <li key={f.properties.code}><button aria-current={sel.mun === f.properties.code} onClick={() => select({ pais: 'BR', uf: sel.uf, mun: f.properties.code })}><span>{f.properties.name}</span>{covered.includes(f.properties.code) && <Pill tone="water">{t('explore.withDataPill')}</Pill>}</button></li>)}</ul>}
              {munList.length > munLimit && <div className="row"><span className="meta-13">{t('explore.showing', { shown: munLimit, total: munList.length })}</span><button className="btn btn--sm" onClick={() => setMunLimit((n) => n + 200)}>{t('explore.showMore')}</button></div>}
              {mun.meta && <Source meta={mun.meta} />}
            </div>)}
          <div className="stack-2"><span className="meta-13">{t('common.shortcuts')}</span><div className="row">
            <button className="btn btn--sm" onClick={() => select({ pais: 'BR', uf: null, mun: null })}>{brLabel}</button>
            <button className="btn btn--sm" onClick={() => select({ pais: 'BR', uf: PRESETS.sorriso.uf, mun: PRESETS.sorriso.mun })}>Sorriso, MT</button>
            <button className="btn btn--sm" onClick={() => select({ pais: 'BR', uf: PRESETS.uberlandia.uf, mun: PRESETS.uberlandia.mun })}>Uberlândia, MG</button>
          </div></div>
          {geo && <p className="meta" role="status">{geo}</p>}
        </div>
        </div>
      </section>
      {wide && detail && <aside className="explore__detail" aria-label={t('explore.selectedMun')} key={sel.mun}>{detail}</aside>}
      <div className="explore__controls">
        {layersOpen && <fieldset className="explore__legend" style={{ display: 'grid' }}><legend className="sr-only">{t('explore.layers.legend')}</legend>
          <label className="check" style={{ minHeight: 36, padding: 0 }}><input type="checkbox" checked={layers.municipios} onChange={(e) => setLayers({ ...layers, municipios: e.target.checked })} />{t('explore.layers.boundaries')}</label>
          <label className="check" style={{ minHeight: 36, padding: 0 }}><input type="checkbox" checked={layers.cobertura} onChange={(e) => setLayers({ ...layers, cobertura: e.target.checked })} />{t('explore.layers.withData')}</label>
          <label className="check" style={{ minHeight: 36, padding: 0 }}><input type="checkbox" checked={layers.imagem} onChange={(e) => { setLayers({ ...layers, imagem: e.target.checked }); if (e.target.checked && imgMun === '3170206' && sel.mun !== '3170206') select({ pais: 'BR', uf: '31', mun: '3170206' }); }} /><span>{t('explore.layers.image')}<br /><span className="meta-13">{t('explore.layers.imageField')}{img.data ? ` · ${dNumeric(img.data.data.image.date)}` : ''}</span></span></label>
        </fieldset>}
        <div className="explore__legend explore__legend--key" aria-label={t('explore.legend.label')}>
          <span className="legend-item"><i className="swatch" style={{ background: fillCss(palette.munSelectedFill), border: `2px solid ${palette.selection}` }} />{t('explore.legend.selected')}</span>
          <span className="legend-item"><i className="swatch" style={{ background: fillCss(palette.covered), border: `1px solid ${palette.munLine}` }} />{t('explore.legend.withData')}</span>
          <span className="legend-item"><i className="swatch" style={{ background: palette.brazil, border: `1px solid ${palette.stateLine}` }} />{t('explore.legend.boundary')}</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="icon-btn" aria-label={t('explore.controls.layers')} aria-pressed={layersOpen} onClick={() => setLayersOpen(!layersOpen)}><Layers size={20} aria-hidden /></button>
          <button className="icon-btn" aria-label={t('explore.controls.locate')} onClick={locate}><LocateFixed size={20} aria-hidden /></button>
          <button className="icon-btn" aria-label={t('explore.controls.brazil')} onClick={() => select({ pais: 'BR', uf: null, mun: null })}><RotateCcw size={20} aria-hidden /></button>
          <button className="icon-btn" aria-label={t('explore.controls.zoomOut')} disabled={!!mapDown} onClick={() => map.current?.zoom(-1)}><Minus size={20} aria-hidden /></button>
          <button className="icon-btn" aria-label={t('explore.controls.zoomIn')} disabled={!!mapDown} onClick={() => map.current?.zoom(1)}><Plus size={20} aria-hidden /></button>
        </div>
      </div>
    </div>
  );
}

function MunDetail({ code, name, uf, cov, munStatus, meshLoaded, found, outline, retry, onSeeCovered, go }: { code: string; name?: string; uf?: string; cov: { code: string | null; status: string; data?: Coverage; meta?: Meta; error?: unknown }; munStatus: string; meshLoaded: boolean; found: boolean; outline: boolean; retry: () => void; onSeeCovered: () => void; go: (to: string) => void }) {
  // "Not found" only when the municipal mesh is loaded, the code is absent from it and the catalogue does not know it.
  const { t } = useI18n();
  if (munStatus === 'ok' && meshLoaded && !found) return <Notice tone="risk" title={t('explore.mun.notFoundTitle')}>{t('explore.mun.notFound', { code })}</Notice>;
  if (cov.status === 'error') return <ErrorState error={cov.error} onRetry={retry} />;
  if (cov.code !== code || cov.status !== 'ok' || !cov.data) return <Loading label={t('explore.mun.loading')} rows={4} />;
  const c = cov.data; const has = c.level === 'analise' || c.level === 'parcial'; const label = name ?? t('explore.mun.fallbackName', { code });
  const pill = { analise: { t: t('coverage.level.analise'), tone: 'water' as const }, parcial: { t: t('coverage.level.parcial'), tone: 'water' as const }, sem_analise: { t: t('coverage.level.sem_analise'), tone: undefined }, nao_consultavel: { t: t('coverage.level.nao_consultavel'), tone: 'warn' as const } }[c.level];
  const labels = c.products.map((p) => productLabel(p.id, p.crops)); const missingLabels = c.missing.map((m) => productLabel(m.id, m.crops));
  const summary = c.level === 'nao_consultavel' ? t('coverage.summary.unconsultable') : c.level === 'sem_analise' ? t('coverage.summary.none') : `${t('coverage.summary.has', { list: labels.join('; ') })}${missingLabels.length ? ` ${t('coverage.summary.missing', { list: missingLabels.join('; ') })}` : ''}`;
  return (
    <div className="stack" data-testid="mun-detail" data-code={code} data-level={c.level}>
      <div className="stack-2">
        <h2 className="row" style={{ gap: 8 }}><MapPin size={20} aria-hidden />{label}{uf ? `, ${uf}` : ''}</h2>
        <p className="meta-13">{t('explore.mun.code', { code })} · {outline ? t('explore.mun.outline') : t('explore.mun.noOutline')}</p>
        <div><Pill tone={pill.tone}>{pill.t}</Pill></div>
        <p>{summary}</p>
      </div>
      {has ? <ul className="list" aria-label={t('explore.mun.analysable')}>{c.products.map((p, i) => <li key={p.id}><button onClick={() => go(p.to.includes('?') ? p.to : `${p.to}?mun=${code}`)}><span className="stack-2" style={{ gap: 4 }}><b>{labels[i]}</b><span className="meta-13">{periodsLabel(p.periods)}</span><span><Pill tone={KIND[p.kind].tone}>{t(KIND[p.kind].key)}</Pill></span></span><ChevronRight size={18} aria-hidden /></button></li>)}</ul>
        : c.level === 'nao_consultavel' ? <Notice tone="warn">{summary}</Notice>
        : <Notice>{t('explore.mun.noneNotice')}</Notice>}
      {c.missing.length > 0 && <details><summary className="meta">{t('explore.mun.missing', { count: c.missing.length })}</summary><ul className="plain">{c.missing.map((m, i) => <li key={m.id}>{missingLabels[i]}: {t(`coverage.reason.${m.reason ?? 'unknown'}` as MessageKey)}.</li>)}</ul></details>}
      <div className="row">
        {has ? <LinkBtn primary to={c.products.some((p) => p.id === 'water_risk_projection') ? `/visao-geral?mun=${code}` : `/municipio?mun=${code}`}>{c.products.some((p) => p.id === 'water_risk_projection') ? t('explore.mun.seeWater') : t('explore.mun.seeData')}</LinkBtn> : /^\d{7}$/.test(code) && <LinkBtn primary to={`/propriedades?mun=${code}&nome=${encodeURIComponent(label)}&uf=${uf ?? ''}`}>{t('explore.mun.register')}</LinkBtn>}
        {/^\d{7}$/.test(code) && <LinkBtn to={`/simulador?modo=planejamento&local=BR:ibge:${code}`}>{t('sim.planning.simulateFuture')}</LinkBtn>}
        {c.products.some((p) => p.id === 'strategy_comparison') && <LinkBtn to="/simulador?modo=historico">{t('explore.mun.simulate')}</LinkBtn>}
        {!has && <button className="btn" onClick={onSeeCovered}>{t('explore.seeWithData')}</button>}
      </div>
      {cov.meta && <Source meta={cov.meta} />}
    </div>
  );
}

/** Published location cores outside Brazil (one entry per place; Brazilian places are listed by the coverage index). */
function AbroadList({ items }: { items: LocationSummary[] }) {
  const { t } = useI18n();
  if (!items.length) return null;
  const countries = [...new Set(items.map((l) => l.country))];
  return <div className="stack-2" data-testid="abroad-list">{countries.map((c) => <div key={c} className="stack-2"><h3>{t(`location.country.${c}` as MessageKey)}</h3><p className="meta-13">{t('location.usNote')}</p>
    <ul className="list">{items.filter((l) => l.country === c).map((l) => <li key={l.id}><a href={`#/municipio?id=${encodeURIComponent(l.id)}`}><span className="stack-2" style={{ gap: 2 }}><b>{l.name}, {l.admin1_name}</b><span className="meta-13">{t('location.code', { scheme: l.scheme.toUpperCase(), code: l.code })}</span></span><ChevronRight size={18} aria-hidden /></a></li>)}</ul></div>)}</div>;
}

/** "Regiões com dados": places listed by the API catalogue, with what each one has. */
function WithData({ state, places, onRetry, onPick }: { state: ReturnType<typeof useCoverageIndex>['index']; places: PlaceWithData[]; onRetry: () => void; onPick: (p: PlaceWithData) => void }) {
  const { t } = useI18n();
  return <div id="with-data" data-testid="with-data">{!state ? <Loading label={t('explore.withData.loading')} rows={2} />
      : state.status === 'failed' ? <Notice tone="warn" title={t('explore.withData.failedTitle')}>{t('explore.withData.failed')} <button className="btn btn--sm" onClick={onRetry}>{t('common.retry')}</button></Notice>
      : <ul className="list" aria-label={t('explore.withData.show')}>{places.map((p) => { const sig = p.municipality.stateId?.replace(/^BR-/, ''); const items = [...p.own.map((x) => x.id), ...p.fields.map(() => 'field')]; return <li key={p.municipality.id}><button onClick={() => onPick(p)}><span className="stack-2" style={{ gap: 2 }}><b>{p.municipality.name}{sig ? `, ${sig}` : ''}</b><span className="meta-13">{items.map((i) => t(`explore.withData.item.${i}` as MessageKey)).join(' · ')}</span></span><ChevronRight size={18} aria-hidden /></button></li>; })}</ul>}
  </div>;
}

const SEARCH_LIMIT = 12;
function PlaceSearch({ onPick }: { onPick: (p: Place) => void }) {
  const { t } = useI18n(); const [q, setQ] = useState(''); const [res, setRes] = useState<SearchResult | null>(null); const [all, setAll] = useState(false); const [act, setAct] = useState(0); const [open, setOpen] = useState(false); const run = useRef(latestOnly()).current;
  useEffect(() => { setAll(false); if (q.trim().length < 2) { setRes(null); return; } run((sg) => geography.search(q, sg)).then((r) => { if (!r.stale) { setRes(r.value); setAct(0); } }).catch(() => setRes({ places: [], total: 0, remote: 'failed' })); }, [q]); // eslint-disable-line
  const shown = res ? (all ? res.places : res.places.slice(0, SEARCH_LIMIT)) : [];
  const choose = (p: Place) => { onPick(p); setQ(''); setOpen(false); };
  return (
    <div className="search" data-tour="explore-search" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <Search className="lead" size={18} aria-hidden />
      <label className="sr-only" htmlFor="busca-local">{t('explore.search.label')}</label>
      <input id="busca-local" className="input" role="combobox" aria-expanded={open && !!res} aria-controls="busca-lista" aria-autocomplete="list" aria-activedescendant={open && shown.length ? `busca-op-${act}` : undefined} placeholder={t('explore.search.placeholder')} value={q} autoComplete="off" spellCheck={false} name="busca-local" enterKeyHint="search"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (!shown.length) { if (e.key === 'Escape') setOpen(false); return; } if (e.key === 'ArrowDown') { e.preventDefault(); setAct((a) => (a + 1) % shown.length); } else if (e.key === 'ArrowUp') { e.preventDefault(); setAct((a) => (a - 1 + shown.length) % shown.length); } else if (e.key === 'Enter') { e.preventDefault(); choose(shown[act]); } else if (e.key === 'Escape') setOpen(false); }} />
      {open && res && <div className="search__list" data-testid="search-results">
        <ul id="busca-lista" role="listbox" aria-label={t('explore.search.results')} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {shown.length === 0 ? <li role="option" aria-selected={false} aria-disabled style={{ cursor: 'default' }}><span className="meta">{res.remote === 'failed' ? t('explore.search.noneFailed') : t('explore.search.none')}</span></li>
            : shown.map((p, i) => <li key={p.type + p.code} id={`busca-op-${i}`} role="option" aria-selected={i === act} onMouseDown={(e) => { e.preventDefault(); choose(p); }}><span>{p.name}{p.type === 'municipio' && p.ufSigla ? `, ${p.ufSigla}` : ''}</span><span className="meta-13">{p.type === 'pais' ? `${t('explore.search.country')} · ${t(`continent.${p.ufSigla}` as MessageKey)}` : p.type === 'uf' ? t('explore.search.state') : p.code}</span></li>)}
        </ul>
        {res.remote === 'failed' && shown.length > 0 && <p className="meta-13" role="status" style={{ padding: '6px 12px', margin: 0 }}>{t('explore.search.remoteFailed')}</p>}
        {!all && res.total > SEARCH_LIMIT && <button type="button" className="btn btn--sm btn--ghost" style={{ margin: '4px 8px 8px' }} onMouseDown={(e) => e.preventDefault()} onClick={() => setAll(true)}>{t('explore.search.all', { count: res.total })}</button>}
      </div>}
    </div>
  );
}

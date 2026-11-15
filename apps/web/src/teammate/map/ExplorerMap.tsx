import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import maplibregl, { type Map as MlMap, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { bboxOf, type BBox, type FC } from '../adapters';
import { MOTION } from '../config';
import { stateSelection, stateViewBounds, US_OVERVIEW } from '../geo/usStates';
import { reducedMotion } from '../ui';
import { translate, useI18n } from '../i18n';

import type { MapHandle, MapLayers, Selection } from './types';
type Props = { selection: Selection; states: FC | null; municipalities: FC | null; covered: string[]; layers: MapLayers; padding: { top: number; left: number; right: number; bottom: number }; image: { url: string; corners: number[][]; field: any } | null; onPick: (s: Selection) => void; onUnavailable: (reason: string) => void; onStatus?: (s: 'ready' | 'base-offline') => void; countryBox: BBox | null; placeBox?: BBox | null; markers: { code: string; uf: string; name: string; lon: number; lat: number; href?: string }[] };

const SOUTH_AMERICA: BBox = [[-92, -52], [-22, 16]];
const BRAZIL: BBox = [[-73.99, -33.75], [-34.8, 5.27]];
const C = { ocean: '#0a1a21', land: '#1a2c24', landLine: '#3d5648', brazil: '#28503a', line: '#7d9a89', munLine: '#4f6a5b', action: '#87C98F', text: '#EAF2EB', water: '#79BDD8' };
const style: StyleSpecification = {
  version: 8, projection: { type: 'globe' } as any, glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: { world: { type: 'vector', url: 'https://demotiles.maplibre.org/tiles/tiles.json', attribution: 'Base: MapLibre demotiles (Natural Earth) · Limites: IBGE / Natural Earth Admin 1' } },
  sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.6, 5, 0] } as any,
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': C.ocean } },
    { id: 'countries', type: 'fill', source: 'world', 'source-layer': 'countries', paint: { 'fill-color': C.land } },
    { id: 'countries-line', type: 'line', source: 'world', 'source-layer': 'countries', paint: { 'line-color': C.landLine, 'line-width': 0.7 } },
  ],
};
const empty: FC = { type: 'FeatureCollection', features: [] };

const ExplorerMap = forwardRef<MapHandle, Props>(function ExplorerMap(p, ref) {
  const { t } = useI18n();
  const el = useRef<HTMLDivElement>(null); const mapRef = useRef<MlMap | null>(null); const ready = useRef(false); const latest = useRef(p); latest.current = p;
  const markerEls = useRef<maplibregl.Marker[]>([]); const here = useRef<maplibregl.Marker | null>(null);

  useImperativeHandle(ref, () => ({
    zoom: (d) => { const m = mapRef.current; if (m) m.easeTo({ zoom: m.getZoom() + d, duration: reducedMotion() ? 0 : 200 }); },
    countryAt: (lon, lat) => { const m = mapRef.current; if (!m || !ready.current) return null; const f = m.queryRenderedFeatures(m.project([lon, lat]), { layers: ['countries'] })[0]; return f?.properties?.ADM0_A3 ? String(f.properties.ADM0_A3) : null; },
    flyTo: (lon, lat) => { const m = mapRef.current; if (!m) return; here.current?.remove(); const dot = document.createElement('div'); dot.setAttribute('aria-label', translate('explore.map.position')); dot.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#79BDD8;border:3px solid #EAF2EB'; here.current = new maplibregl.Marker({ element: dot }).setLngLat([lon, lat]).addTo(m); m.flyTo({ center: [lon, lat], zoom: Math.max(m.getZoom(), 7), duration: reducedMotion() ? 0 : MOTION.fly }); },
  }));

  const applySelected = () => {
    const m = mapRef.current; if (!m || !ready.current) return; const s = latest.current.selection;
    m.setFilter('states-selected', ['==', ['get', 'code'], s.uf ?? '']); m.setFilter('states-selected-fill', ['==', ['get', 'code'], s.uf ?? '']);
    m.setFilter('mun-selected', ['==', ['get', 'code'], s.mun ?? '']); m.setFilter('mun-selected-fill', ['==', ['get', 'code'], s.mun ?? '']);
    m.setFilter('mun-covered', ['in', ['get', 'code'], ['literal', latest.current.covered]]);
    const other = s.pais && s.pais !== 'BR' ? s.pais : ''; m.setFilter('country-selected-fill', ['==', ['get', 'ADM0_A3'], other]); m.setFilter('country-selected', ['==', ['get', 'ADM0_A3'], other]);
    const L = latest.current.layers; const vis = (id: string, v: boolean) => m.setLayoutProperty(id, 'visibility', v ? 'visible' : 'none');
    vis('mun-line', L.municipios); vis('mun-covered', L.cobertura); vis('hls', L.imagem); vis('field-line', L.imagem);
    m.setPaintProperty('states-fill', 'fill-color', s.uf ? '#1d3329' : C.brazil);
  };
  const camera = (instant = false) => {
    const m = mapRef.current; if (!m || !ready.current) return; const { selection: s, states, municipalities, padding } = latest.current;
    const { countryBox } = latest.current; if (s.pais && s.pais !== 'BR' && !countryBox) return; // espera a lista de países para não enquadrar o lugar errado
    let box: BBox = !s.pais ? SOUTH_AMERICA : s.pais === 'BR' ? BRAZIL : s.pais === 'USA' ? US_OVERVIEW : countryBox!; let extra = s.pais ? 24 : 8;
    const uf = s.uf && states?.features.find((f) => f.properties.code === s.uf); if (uf) { box = stateViewBounds(uf); extra = 28; }
    const mun = s.mun && municipalities?.features.find((f) => f.properties.code === s.mun); if (mun) { box = bboxOf(mun.geometry); extra = padding.bottom ? 36 : 90; }
    else if (s.mun && latest.current.placeBox) { box = latest.current.placeBox; extra = padding.bottom ? 36 : 90; } // catalogue box when the mesh is not loaded
    else if (s.mun && !municipalities) return; // espera a malha chegar para não enquadrar o lugar errado
    m.stop();
    m.fitBounds(box, { padding: { top: padding.top + extra, bottom: padding.bottom + extra, left: padding.left + extra, right: padding.right + extra }, duration: instant || reducedMotion() ? 0 : MOTION.fly, maxZoom: 10, essential: false });
  };

  useEffect(() => {
    if (!el.current) return;
    let m: MlMap;
    try {
      if (new URLSearchParams(location.hash.split('?')[1] ?? '').has('semwebgl')) throw new Error('WebGL desativado para teste');
      m = new maplibregl.Map({ container: el.current, style, center: [-54, -14], zoom: 2.4, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, maxZoom: 13, minZoom: 1 });
    } catch (e) { latest.current.onUnavailable((e as Error).message); return; }
    mapRef.current = m; (window as any).__gaiapusMap = m;
    m.on('error', (e) => { const msg = String(e.error?.message); if (/webgl/i.test(msg)) latest.current.onUnavailable(msg); else if ((e as any).sourceId === 'world' || /fetch|network|load/i.test(msg)) latest.current.onStatus?.('base-offline'); });
    m.on('load', () => {
      m.addSource('states', { type: 'geojson', data: empty as any }); m.addSource('mun', { type: 'geojson', data: empty as any }); m.addSource('labels', { type: 'geojson', data: empty as any }); m.addSource('field', { type: 'geojson', data: empty as any });
      m.addLayer({ id: 'country-selected-fill', type: 'fill', source: 'world', 'source-layer': 'countries', filter: ['==', ['get', 'ADM0_A3'], ''], paint: { 'fill-color': C.action, 'fill-opacity': 0.2 } });
      m.addLayer({ id: 'country-selected', type: 'line', source: 'world', 'source-layer': 'countries', filter: ['==', ['get', 'ADM0_A3'], ''], paint: { 'line-color': C.action, 'line-width': 2.5 } });
      m.addLayer({ id: 'states-fill', type: 'fill', source: 'states', paint: { 'fill-color': C.brazil } });
      m.addLayer({ id: 'states-selected-fill', type: 'fill', source: 'states', filter: ['==', ['get', 'code'], ''], paint: { 'fill-color': C.action, 'fill-opacity': 0.2 } });
      m.addLayer({ id: 'mun-fill', type: 'fill', source: 'mun', paint: { 'fill-color': C.action, 'fill-opacity': 0.001 } });
      m.addLayer({ id: 'mun-covered', type: 'fill', source: 'mun', filter: ['in', ['get', 'code'], ['literal', []]], paint: { 'fill-color': C.water, 'fill-opacity': 0.45 } });
      m.addLayer({ id: 'mun-line', type: 'line', source: 'mun', paint: { 'line-color': C.munLine, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.3, 8, 1] } });
      m.addLayer({ id: 'states-line', type: 'line', source: 'states', paint: { 'line-color': C.line, 'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.5, 6, 1.4] } });
      m.addLayer({ id: 'states-selected', type: 'line', source: 'states', filter: ['==', ['get', 'code'], ''], paint: { 'line-color': C.action, 'line-width': 3 } });
      m.addLayer({ id: 'mun-selected-fill', type: 'fill', source: 'mun', filter: ['==', ['get', 'code'], ''], paint: { 'fill-color': C.action, 'fill-opacity': 0.3 } });
      m.addLayer({ id: 'mun-selected', type: 'line', source: 'mun', filter: ['==', ['get', 'code'], ''], paint: { 'line-color': C.text, 'line-width': 2.5 } });
      m.addLayer({ id: 'hls', type: 'raster', source: { type: 'image', url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', coordinates: [[-48.422, -18.893], [-48.396, -18.893], [-48.396, -18.914], [-48.422, -18.914]] } as any, layout: { visibility: 'none' } });
      m.addLayer({ id: 'field-line', type: 'line', source: 'field', layout: { visibility: 'none' }, paint: { 'line-color': '#E6B85C', 'line-width': 2.5 } });
      m.addLayer({ id: 'state-labels', type: 'symbol', source: 'labels', minzoom: 2.6, maxzoom: 5.2, layout: { 'text-field': ['get', 'sigla'], 'text-font': ['Open Sans Semibold'], 'text-size': 12 }, paint: { 'text-color': C.text, 'text-halo-color': '#0a1a21', 'text-halo-width': 1.4 } });
      // On narrow screens the compact attribution starts collapsed so it does not sit under the map controls.
      if (el.current && el.current.clientWidth < 760) el.current.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
      ready.current = true; sync(); camera(true); latest.current.onStatus?.('ready');
    });
    m.on('click', (e) => {
      const f = m.queryRenderedFeatures(e.point, { layers: ['mun-fill', 'states-fill', 'countries'] }); const mun = f.find((x) => x.layer.id === 'mun-fill'); const st = f.find((x) => x.layer.id === 'states-fill'); const ct = f.find((x) => x.layer.id === 'countries');
      // Brazilian municipalities (IBGE code) and US counties (US:fips:…, with their state) share the same layer.
      if (mun) latest.current.onPick(mun.properties.country === 'US' ? { pais: 'USA', uf: String(mun.properties.state), mun: String(mun.properties.code) } : { pais: 'BR', uf: String(mun.properties.code).slice(0, 2), mun: String(mun.properties.code) });
      else if (st) latest.current.onPick(stateSelection(String(st.properties.code)));
      else if (ct?.properties?.ADM0_A3) latest.current.onPick({ pais: ct.properties.ADM0_A3 === 'BRA' ? 'BR' : String(ct.properties.ADM0_A3), uf: null, mun: null }); // qualquer país do globo é selecionável
    });
    for (const id of ['mun-fill', 'states-fill', 'countries']) { m.on('mouseenter', id, () => { m.getCanvas().style.cursor = 'pointer'; }); m.on('mouseleave', id, () => { m.getCanvas().style.cursor = ''; }); }
    const ro = new ResizeObserver(() => m.resize()); ro.observe(el.current);
    return () => { ro.disconnect(); ready.current = false; markerEls.current.forEach((x) => x.remove()); m.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line

  const sync = () => {
    const m = mapRef.current; if (!m || !ready.current) return; const { states, municipalities, image } = latest.current;
    (m.getSource('states') as any).setData(states ?? empty); (m.getSource('mun') as any).setData(municipalities ?? empty);
    (m.getSource('labels') as any).setData({ type: 'FeatureCollection', features: (states?.features ?? []).map((f) => { const b = stateViewBounds(f); return { type: 'Feature', properties: { sigla: f.properties.sigla }, geometry: { type: 'Point', coordinates: [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2] } }; }) });
    if (image) { (m.getSource('hls') as any).updateImage({ url: image.url, coordinates: image.corners }); (m.getSource('field') as any).setData({ type: 'Feature', properties: {}, geometry: image.field }); }
    applySelected();
  };
  useEffect(() => { sync(); camera(); }, [p.states, p.municipalities, p.image]); // eslint-disable-line
  useEffect(() => { applySelected(); camera(); }, [p.placeBox?.[0][0], p.countryBox?.[0][0], p.countryBox?.[1][1], p.selection.pais, p.selection.uf, p.selection.mun, p.padding.left, p.padding.right, p.padding.bottom, p.padding.top]); // eslint-disable-line
  useEffect(() => { applySelected(); }, [p.layers, p.covered]); // eslint-disable-line
  useEffect(() => {
    const m = mapRef.current; if (!m) return; markerEls.current.forEach((x) => x.remove()); markerEls.current = [];
    if (p.selection.mun) return;
    // Alternate label side so nearby places (Sorriso, Uberlândia) do not overlap at world zoom.
    p.markers.forEach((mk, i) => { const b = document.createElement('button'); b.className = 'map-marker'; b.type = 'button'; b.textContent = mk.name; b.setAttribute('aria-label', translate('location.markerOpen', { name: mk.name })); b.onclick = (e) => { e.stopPropagation(); if (mk.href) window.location.hash = mk.href; else latest.current.onPick({ pais: 'BR', uf: mk.uf, mun: mk.code }); }; markerEls.current.push(new maplibregl.Marker({ element: b, anchor: i % 2 ? 'top' : 'bottom' }).setLngLat([mk.lon, mk.lat]).addTo(m)); });
  }, [p.markers, p.selection.mun]);
  return <div ref={el} className="explore__map" data-tour="explore-map" role="application" aria-label={t('explore.map.label')} />;
});
export default ExplorerMap;

// Map of "Minha área" (lazy chunk: MapLibre is only downloaded when this map is shown).
// Plots are polygons, stakes are point markers at the position recorded on installation — a point reading is never
// drawn as a measured surface. Drawing: click adds a vertex, vertex handles can be dragged, moved with the arrow
// keys or removed with Delete. Everything the map does is also possible through the forms beside it.
import { useEffect, useRef } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MlMap, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { translate } from '../i18n';
import { reducedMotion } from '../ui';
import { boundsOf, centroid, closeRing, type PolygonGeometry, type Position } from './geometry';

export type MapPlot = { id: string; name: string; geometry: PolygonGeometry };
export type MapSensor = { id: string; label: string; point: Position };
export type MapSelection = { kind: 'plot' | 'sensor'; id: string } | null;
export type AreaMapProps = {
  plots: MapPlot[]; sensors: MapSensor[]; selected: MapSelection; onSelect: (s: MapSelection) => void;
  /** 'draw': clicks add vertices to `draft`. 'pick': a click reports a point. */
  mode: 'view' | 'draw' | 'pick';
  draft: Position[] | null; onDraft: (v: Position[]) => void;
  picked: Position | null; onPick: (p: Position) => void;
  /** Where to start when there is nothing to frame yet. */
  home: Position | null;
  /** Changes when the camera should frame the content again. */
  frameKey: string;
  onUnavailable: (reason: string) => void;
};

const C = { ocean: '#0a1a21', land: '#1a2c24', landLine: '#3d5648', plot: '#87C98F', plotSel: '#EAF2EB', draft: '#F2C14E' };
const style: StyleSpecification = {
  version: 8,
  sources: { world: { type: 'vector', url: 'https://demotiles.maplibre.org/tiles/tiles.json', attribution: 'Base: MapLibre demotiles (Natural Earth)' } },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': C.ocean } },
    { id: 'countries', type: 'fill', source: 'world', 'source-layer': 'countries', paint: { 'fill-color': C.land } },
    { id: 'countries-line', type: 'line', source: 'world', 'source-layer': 'countries', paint: { 'line-color': C.landLine, 'line-width': 0.7 } },
  ],
};
type FC = { type: 'FeatureCollection'; features: { type: 'Feature'; properties: Record<string, string>; geometry: { type: string; coordinates: unknown } }[] };
const fc = (features: FC['features'] = []): FC => ({ type: 'FeatureCollection', features });
const round = (v: number) => Math.round(v * 1e7) / 1e7;

export default function AreaMap(p: AreaMapProps) {
  const el = useRef<HTMLDivElement>(null); const mapRef = useRef<MlMap | null>(null); const ready = useRef(false); const latest = useRef(p); latest.current = p;
  const markers = useRef<maplibregl.Marker[]>([]); const handles = useRef<maplibregl.Marker[]>([]); const pin = useRef<maplibregl.Marker | null>(null);

  const drawData = () => {
    const m = mapRef.current; if (!m || !ready.current) return; const { plots, sensors, selected, draft, picked, mode } = latest.current;
    (m.getSource('plots') as GeoJSONSource).setData(fc(plots.map((x) => ({ type: 'Feature', properties: { id: x.id }, geometry: x.geometry }))) as never);
    m.setFilter('plots-selected', ['==', ['get', 'id'], selected?.kind === 'plot' ? selected.id : '']);
    const d = draft ?? [];
    (m.getSource('draft') as GeoJSONSource).setData(fc(d.length >= 3 ? [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [closeRing(d)] } }] : d.length === 2 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: d } }] : []) as never);
    m.getCanvas().style.cursor = mode === 'view' ? '' : 'crosshair';

    markers.current.forEach((x) => x.remove()); markers.current = [];
    for (const plot of plots) {
      const tag = document.createElement('div'); tag.className = 'area-map__plot'; tag.textContent = plot.name; tag.setAttribute('aria-hidden', 'true');
      markers.current.push(new maplibregl.Marker({ element: tag, anchor: 'bottom', offset: [0, -26] }).setLngLat(centroid(plot.geometry)).addTo(m));
    }
    for (const s of sensors) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'area-map__sensor'; b.dataset.testid = `map-sensor-${s.id}`;
      b.setAttribute('aria-label', translate('area.map.sensorMarker', { name: s.label })); b.setAttribute('aria-pressed', String(selected?.kind === 'sensor' && selected.id === s.id));
      b.addEventListener('click', (e) => { e.stopPropagation(); latest.current.onSelect({ kind: 'sensor', id: s.id }); });
      markers.current.push(new maplibregl.Marker({ element: b }).setLngLat(s.point).addTo(m));
    }

    handles.current.forEach((x) => x.remove()); handles.current = [];
    d.forEach((v, i) => {
      const h = document.createElement('button'); h.type = 'button'; h.className = 'area-map__vertex'; h.dataset.testid = `map-vertex-${i}`;
      h.setAttribute('aria-label', translate('area.map.vertex', { n: i + 1, total: d.length }));
      const marker = new maplibregl.Marker({ element: h, draggable: true }).setLngLat(v).addTo(m);
      const put = (next: Position | null) => { const cur = [...(latest.current.draft ?? [])]; if (next) cur[i] = next; else cur.splice(i, 1); latest.current.onDraft(cur); };
      marker.on('dragend', () => { const ll = marker.getLngLat(); put([round(ll.lng), round(ll.lat)]); });
      h.addEventListener('click', (e) => e.stopPropagation());
      h.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); put(null); return; }
        const dir: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }; const step = dir[e.key]; if (!step) return;
        e.preventDefault(); e.stopPropagation(); const px = m.project(v); const ll = m.unproject([px.x + step[0] * (e.shiftKey ? 20 : 4), px.y + step[1] * (e.shiftKey ? 20 : 4)]); put([round(ll.lng), round(ll.lat)]);
      });
      handles.current.push(marker);
    });

    pin.current?.remove(); pin.current = null;
    if (picked) { const dot = document.createElement('div'); dot.className = 'area-map__pin'; dot.setAttribute('aria-hidden', 'true'); pin.current = new maplibregl.Marker({ element: dot }).setLngLat(picked).addTo(m); }
  };
  const frame = () => {
    const m = mapRef.current; if (!m || !ready.current) return; const { plots, sensors, draft, picked, home } = latest.current;
    const pts: Position[] = [...plots.flatMap((x) => x.geometry.coordinates[0]), ...sensors.map((s) => s.point), ...(draft ?? []), ...(picked ? [picked] : [])];
    const box = boundsOf(pts); const duration = reducedMotion() ? 0 : 300;
    if (box && (box[0][0] !== box[1][0] || box[0][1] !== box[1][1])) m.fitBounds(box, { padding: 56, maxZoom: 16, duration });
    else if (box) m.easeTo({ center: box[0], zoom: 15, duration });
    else if (home) m.easeTo({ center: home, zoom: 11, duration });
  };

  useEffect(() => {
    if (!el.current) return; let m: MlMap;
    try {
      if (new URLSearchParams(location.hash.split('?')[1] ?? '').has('semwebgl')) throw new Error('WebGL disabled for testing');
      m = new maplibregl.Map({ container: el.current, style, center: [-54, -14], zoom: 3, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, maxZoom: 19, minZoom: 1 });
    } catch (e) { latest.current.onUnavailable((e as Error).message); return; }
    mapRef.current = m; (window as unknown as { __gaiapusAreaMap?: MlMap }).__gaiapusAreaMap = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    m.on('error', (e) => { if (/webgl/i.test(String(e.error?.message))) latest.current.onUnavailable(String(e.error?.message)); });
    m.on('load', () => {
      m.addSource('plots', { type: 'geojson', data: fc() as never }); m.addSource('draft', { type: 'geojson', data: fc() as never });
      m.addLayer({ id: 'plots-fill', type: 'fill', source: 'plots', paint: { 'fill-color': C.plot, 'fill-opacity': 0.22 } });
      m.addLayer({ id: 'plots-line', type: 'line', source: 'plots', paint: { 'line-color': C.plot, 'line-width': 2 } });
      m.addLayer({ id: 'plots-selected', type: 'line', source: 'plots', filter: ['==', ['get', 'id'], ''], paint: { 'line-color': C.plotSel, 'line-width': 4 } });
      m.addLayer({ id: 'draft-fill', type: 'fill', source: 'draft', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': C.draft, 'fill-opacity': 0.2 } });
      m.addLayer({ id: 'draft-line', type: 'line', source: 'draft', paint: { 'line-color': C.draft, 'line-width': 2.5, 'line-dasharray': [2, 1.5] } });
      m.on('click', (e) => {
        const now = latest.current; const at: Position = [round(e.lngLat.lng), round(e.lngLat.lat)];
        if (now.mode === 'draw') { now.onDraft([...(now.draft ?? []), at]); return; }
        if (now.mode === 'pick') { now.onPick(at); return; }
        const hit = m.queryRenderedFeatures(e.point, { layers: ['plots-fill'] })[0];
        now.onSelect(hit?.properties?.id ? { kind: 'plot', id: String(hit.properties.id) } : null);
      });
      ready.current = true; el.current?.setAttribute('data-ready', 'true'); drawData(); frame();
    });
    const ro = new ResizeObserver(() => m.resize()); ro.observe(el.current);
    return () => { ro.disconnect(); ready.current = false; markers.current = []; handles.current = []; m.remove(); mapRef.current = null; };
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- redraw whenever any drawn input changes
  useEffect(drawData, [p.plots, p.sensors, p.selected, p.draft, p.picked, p.mode]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reframe only when the caller asks
  useEffect(frame, [p.frameKey]);
  return <div ref={el} className="area-map" data-testid="area-map" role="application" aria-label={translate('area.map.label')} />;
}

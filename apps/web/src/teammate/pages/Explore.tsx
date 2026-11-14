import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Layers, LocateFixed, MapPin, Minus, Plus, RotateCcw, Search } from 'lucide-react';
import { coverage, geography, imagery, type Coverage, type FC, type Place, type SearchResult } from '../adapters';
import { latestOnly, type Meta } from '../adapters/core';
import type { MapHandle, MapLayers, Selection } from '../map/types';
import { PRESETS } from '../config';
import { norm } from '../format';
import { Empty, ErrorState, LinkBtn, Loading, Notice, Pill, Source, useAsync, useMedia } from '../ui';
import { useLazy } from '../lazyPage';

const loadMap = () => import('../map/ExplorerMap');
const MARKERS = [{ code: '5107925', uf: '51', name: 'Sorriso', lon: -55.78, lat: -12.55 }, { code: '3170206', uf: '31', name: 'Uberlândia', lon: -48.32, lat: -18.92 }];
const KIND: Record<string, { label: string; tone: 'water' | 'warn' | 'ok' | 'soil' }> = { previsao: { label: 'Previsão', tone: 'water' }, simulacao: { label: 'Simulação histórica', tone: 'warn' }, historico: { label: 'Histórico', tone: 'soil' }, observacao: { label: 'Observação orbital', tone: 'ok' } };
const SHEET = { recolhida: 132, media: 0.46, expandida: 0.86 } as const; type SheetPos = keyof typeof SHEET;

function pointIn(geom: any, lon: number, lat: number) {
  const ring = (r: number[][]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > lat) !== (r[j][1] > lat) && lon < ((r[j][0] - r[i][0]) * (lat - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates; return polys.some((p: number[][][]) => ring(p[0]));
}

export function Explore() {
  const [params, setParams] = useSearchParams(); const nav = useNavigate();
  const sel: Selection = useMemo(() => { const mun = params.get('mun'); const uf = params.get('uf') ?? (mun ? mun.slice(0, 2) : null); const raw = (params.get('pais') ?? '').toUpperCase(); const pais = uf || mun ? 'BR' : raw === 'BRA' ? 'BR' : /^[A-Z]{2,3}$/.test(raw) ? raw : null; return { pais, uf: pais === 'BR' ? uf : null, mun: pais === 'BR' ? mun : null }; }, [params]);
  const select = (s: Selection) => { const p = new URLSearchParams(params); ['pais', 'uf', 'mun'].forEach((k) => p.delete(k)); if (s.pais) p.set('pais', s.pais); if (s.uf) p.set('uf', s.uf); if (s.mun) p.set('mun', s.mun); setParams(p); };
  const wide = useMedia('(min-width: 1100px)'); const mobile = useMedia('(max-width: 760px)');
  const states = useAsync((sg) => geography.states(sg), []); const world = useAsync((sg) => geography.countries(sg), []); const [worldFilter, setWorldFilter] = useState('');
  const br = sel.pais === 'BR'; const country = sel.pais && !br ? world.data?.data.find((c) => c.code === sel.pais) ?? null : null; const unknownCountry = !!sel.pais && !br && !!world.data && !country;
  // Malha municipal e cobertura: só a resposta do pedido mais recente é aplicada.
  const [mun, setMun] = useState<{ uf: string | null; status: 'idle' | 'loading' | 'ok' | 'error'; fc: FC | null; meta?: Meta; error?: unknown }>({ uf: null, status: 'idle', fc: null });
  const runMun = useRef(latestOnly()).current; const runCov = useRef(latestOnly()).current; const [munTick, setMunTick] = useState(0);
  useEffect(() => { if (!sel.uf) { setMun({ uf: null, status: 'idle', fc: null }); return; } setMun((m) => ({ uf: sel.uf, status: 'loading', fc: m.uf === sel.uf ? m.fc : null })); const uf = sel.uf; runMun((sg) => geography.municipalities(uf, sg)).then((r) => { if (!r.stale) setMun({ uf, status: 'ok', fc: r.value.data, meta: r.value.meta }); }).catch((error) => setMun({ uf, status: 'error', fc: null, error })); }, [sel.uf, munTick]); // eslint-disable-line
  const [cov, setCov] = useState<{ code: string | null; status: 'idle' | 'loading' | 'ok' | 'error'; data?: Coverage; meta?: Meta; error?: unknown }>({ code: null, status: 'idle' }); const [covTick, setCovTick] = useState(0);
  useEffect(() => { if (!sel.mun) { setCov({ code: null, status: 'idle' }); return; } const code = sel.mun; setCov({ code, status: 'loading' }); runCov((sg) => coverage.get(code, sg)).then((r) => { if (!r.stale) setCov({ code, status: 'ok', data: r.value.data, meta: r.value.meta }); }).catch((error) => setCov({ code, status: 'error', error })); }, [sel.mun, covTick]); // eslint-disable-line
  const [layers, setLayers] = useState<MapLayers>({ municipios: true, cobertura: true, imagem: false }); const [layersOpen, setLayersOpen] = useState(false);
  const img = useAsync((sg) => (layers.imagem ? imagery.series('3170206', sg) : Promise.resolve(null)), [layers.imagem]);
  const [mapDown, setMapDown] = useState<string | null>(null); const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'base-offline'>('loading'); const [geo, setGeo] = useState<string | null>(null); const [sheet, setSheet] = useState<SheetPos>('media'); const [filter, setFilter] = useState('');
  const map = useRef<MapHandle>(null); const mapMod = useLazy(loadMap); const ExplorerMap = mapMod.mod?.default;
  useEffect(() => { setFilter(''); }, [sel.uf]);
  useEffect(() => { if (mobile && sel.mun) setSheet('media'); }, [sel.mun, mobile]);

  const ufFeature = sel.uf ? states.data?.data.features.find((f) => f.properties.code === sel.uf) : undefined;
  const munFeature = sel.mun && mun.uf === sel.uf ? mun.fc?.features.find((f) => f.properties.code === sel.mun) : undefined;
  const munList = useMemo(() => { const all = mun.fc?.features ?? []; const f = norm(filter); const hit = f ? all.filter((x) => norm(x.properties.name).includes(f) || x.properties.code.startsWith(f)) : all; return [...hit].sort((a, b) => Number(coverage.covered.includes(b.properties.code)) - Number(coverage.covered.includes(a.properties.code)) || a.properties.name.localeCompare(b.properties.name, 'pt-BR')); }, [mun.fc, filter]);
  const sheetPx = mobile ? (sheet === 'recolhida' ? SHEET.recolhida : Math.round(innerHeight * SHEET[sheet === 'expandida' ? 'media' : sheet])) : 0;
  const padding = mobile ? { top: 132, left: 0, right: 0, bottom: sheetPx } : { top: 0, left: 344 + 16, right: wide && sel.mun ? 312 + 16 : 0, bottom: 0 };
  const locate = () => {
    if (!navigator.geolocation) { setGeo('Este navegador não oferece geolocalização.'); return; } setGeo('Localizando…');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { longitude: lon, latitude: lat } = pos.coords; map.current?.flyTo(lon, lat);
      const st = states.data?.data.features.find((f) => pointIn(f.geometry, lon, lat));
      if (!st) { setGeo('Sua posição está fora do Brasil; limites disponíveis só para o Brasil nesta edição.'); return; }
      const fc = (await geography.municipalities(st.properties.code)).data; const m = fc?.features.find((f) => pointIn(f.geometry, lon, lat));
      select({ pais: 'BR', uf: st.properties.code, mun: m?.properties.code ?? null }); setGeo(m ? `Você está em ${m.properties.name}, ${st.properties.sigla}.` : `Você está em ${st.properties.name}.`);
    }, (err) => setGeo(err.code === 1 ? 'Permissão de localização negada. Use a busca ou o mapa.' : 'Não foi possível obter sua posição.'), { timeout: 8000 });
  };

  const title = munFeature ? munFeature.properties.name : sel.mun ? 'Município' : ufFeature ? ufFeature.properties.name : br ? 'Brasil' : country ? country.name : sel.pais ? (unknownCountry ? 'País não encontrado' : 'País') : 'Onde está sua lavoura?';
  const next = sel.mun ? 'Veja o que dá para analisar aqui.' : sel.uf ? 'Escolha um município na lista ou no mapa.' : br ? 'Escolha um estado na lista ou no mapa.' : sel.pais ? (country ? `${country.continent} · sem análise nesta edição.` : '') : 'Busque um lugar ou escolha um país na lista ou no mapa.';
  const searchBox = <PlaceSearch onPick={(p) => select(p.type === 'pais' ? { pais: p.code, uf: null, mun: null } : { pais: 'BR', uf: p.uf, mun: p.type === 'municipio' ? p.code : null })} />;
  const worldList = useMemo(() => { const f = norm(worldFilter); const all = world.data?.data ?? []; const hit = f ? all.filter((c) => norm(c.name).includes(f) || norm(c.code) === f || norm(c.continent).includes(f)) : all; return [...hit].sort((a, b) => Number(b.code === 'BR') - Number(a.code === 'BR')); }, [world.data, worldFilter]);
  const detail = sel.mun ? <MunDetail code={sel.mun} name={munFeature?.properties.name} uf={ufFeature?.properties.sigla} cov={cov} munStatus={mun.status} found={!!munFeature} retry={() => setCovTick((t) => t + 1)} onSeeCovered={() => select({ pais: 'BR', uf: null, mun: null })} go={nav} /> : null;

  return (
    <div className="explore">
      {mapDown ? <div className="explore__map" style={{ display: 'grid', placeItems: 'center', padding: 24, paddingLeft: mobile ? 24 : 384 }}><Notice tone="warn" title="Mapa indisponível neste aparelho.">O navegador não conseguiu iniciar o mapa (WebGL). A busca e as listas ao lado continuam funcionando para escolher estado e município.</Notice></div>
        : mapMod.failed ? <div className="explore__map" style={{ display: 'grid', placeItems: 'center', padding: 24, paddingLeft: mobile ? 24 : 384 }}><div className="stack-2"><Notice tone="warn" title="O mapa não pôde ser baixado.">Sem conexão para carregar o mapa. A busca e as listas ao lado continuam funcionando para escolher estado e município.</Notice><div><button className="btn btn--sm" onClick={mapMod.retry}>Tentar de novo</button></div></div></div>
        : ExplorerMap && <ExplorerMap ref={map} onStatus={(s) => setMapStatus((prev) => (s === 'ready' && prev === 'base-offline' ? prev : s))} selection={sel} states={states.data?.data ?? null} municipalities={mun.uf === sel.uf ? mun.fc : null} covered={coverage.covered} layers={layers} countryBox={country?.bbox ?? null} padding={padding} image={img.data ? { url: img.data.data.imageUrl, corners: img.data.data.image.corners, field: img.data.data.field.geojson } : null} onPick={select} onUnavailable={setMapDown} markers={MARKERS} />}
      {!mapDown && !mapMod.failed && mapStatus === 'loading' && <div className="explore__loading" role="status" style={{ paddingLeft: mobile ? 0 : 360 }}><span className="spinner" aria-hidden /><span>Carregando o mapa…</span></div>}
      {!mapDown && mapStatus === 'base-offline' && <div className="explore__toast" role="status">Mapa-base sem conexão. Os limites do IBGE e as listas continuam funcionando.</div>}
      {mobile && <div className="explore__search-top">{searchBox}</div>}
      <section className="explore__panel" aria-label="Seleção de local" style={mobile ? ({ '--sheet-h': sheet === 'recolhida' ? `${SHEET.recolhida}px` : `${SHEET[sheet] * 100}%` } as any) : undefined}>
        <button className="sheet-handle" aria-label={`Painel na posição ${sheet}. Tocar para ${sheet === 'expandida' ? 'recolher' : 'expandir'}`} onClick={() => setSheet(sheet === 'recolhida' ? 'media' : sheet === 'media' ? 'expandida' : 'recolhida')} />
        <div className="explore__panel-head">
          {!mobile && searchBox}
          <nav className="crumbs" aria-label="Você está em">
            {[{ label: 'Mundo', s: { pais: null, uf: null, mun: null }, on: true }, { label: br ? 'Brasil' : country?.name ?? sel.pais ?? '', s: { pais: sel.pais, uf: null, mun: null }, on: !!sel.pais }, { label: ufFeature?.properties.sigla ?? sel.uf ?? '', s: { pais: 'BR', uf: sel.uf, mun: null }, on: !!sel.uf }, { label: munFeature?.properties.name ?? sel.mun ?? '', s: sel, on: !!sel.mun }].filter((c) => c.on).map((c, i, a) => <span key={c.label} className="row" style={{ gap: 2 }}>{i > 0 && <ChevronRight size={14} aria-hidden />}{i === a.length - 1 ? <span aria-current="location">{c.label}</span> : <button onClick={() => select(c.s as Selection)}>{c.label}</button>}</span>)}
          </nav>
          <div><h1 style={{ fontSize: 24 }}>{title}</h1><p className="meta">{next}</p></div>
        </div>
        <div className="explore__panel-body">
          {!sel.pais && (world.status === 'error' ? <ErrorState error={world.error} onRetry={world.retry} /> : !world.data ? <Loading label="Carregando países…" rows={5} /> : <div className="stack-2">
            <label className="sr-only" htmlFor="filtro-pais">Filtrar países</label>
            <input id="filtro-pais" className="input" name="filtro-pais" autoComplete="off" spellCheck={false} placeholder={`Filtrar ${world.data.data.length} países e territórios…`} value={worldFilter} onChange={(e) => setWorldFilter(e.target.value)} />
            {worldList.length === 0 ? <Empty title="Nenhum país com esse nome">Confira a grafia ou clique no país no mapa.</Empty> : <ul className="list list--long" aria-label="Países">{worldList.map((c) => <li key={c.code}><button onClick={() => select({ pais: c.code, uf: null, mun: null })}>{c.code === 'BR' ? <span><b>Brasil</b><br /><span className="meta-13">27 unidades da federação · análise em MG e MT</span></span> : <span>{c.name} <span className="meta-13">{c.continent}</span></span>}{c.code === 'BR' ? <Pill tone="water">Com análise</Pill> : <ChevronRight size={18} aria-hidden />}</button></li>)}</ul>}
            <Source meta={world.data.meta} />
          </div>)}
          {sel.pais && !br && (world.status === 'error' ? <ErrorState error={world.error} onRetry={world.retry} /> : !world.data ? <Loading label="Carregando país…" rows={3} /> : unknownCountry ? <Notice tone="risk" title="País não encontrado.">O código “{sel.pais}” não está no mapa-base. Escolha um país na lista ou clique no mapa.</Notice> : <div className="stack" data-testid="country-detail" data-code={sel.pais}>
            <div><Pill>Sem análise nesta edição</Pill></div>
            <p>{country!.name} aparece como contexto geográfico. Não há estados, municípios nem dados agrícolas publicados para este país, e nenhum número é agregado por país.</p>
            <Notice>As análises desta edição (água, clima e rendimento de referência) existem para municípios de Minas Gerais e Mato Grosso, no Brasil.</Notice>
            <div className="row"><button className="btn btn--primary" onClick={() => select({ pais: 'BR', uf: null, mun: null })}>Ver o Brasil</button><button className="btn" onClick={() => select({ pais: null, uf: null, mun: null })}>Escolher outro país</button></div>
          </div>)}
          {br && !sel.uf && (states.status === 'error' ? <ErrorState error={states.error} onRetry={states.retry} /> : !states.data ? <Loading label="Carregando estados" rows={5} /> :
            <ul className="list" aria-label="Estados">{[...states.data.data.features].sort((a, b) => Number(geography.ufsWithMunicipalities.includes(b.properties.code)) - Number(geography.ufsWithMunicipalities.includes(a.properties.code)) || a.properties.name.localeCompare(b.properties.name, 'pt-BR')).map((f) => <li key={f.properties.code}><button onClick={() => select({ pais: 'BR', uf: f.properties.code, mun: null })}><span>{f.properties.name} <span className="meta-13">{f.properties.sigla}</span></span>{geography.ufsWithMunicipalities.includes(f.properties.code) ? <Pill tone="water">Com análise</Pill> : <ChevronRight size={18} aria-hidden />}</button></li>)}</ul>)}
          {sel.uf && !wide && detail}
          {sel.uf && (mun.status === 'error' ? <ErrorState error={mun.error} onRetry={() => setMunTick((t) => t + 1)} /> : mun.status === 'loading' && !mun.fc ? <Loading label="Carregando municípios" rows={6} /> : mun.status === 'ok' && !mun.fc ?
            <Empty title="Municípios ainda não carregados">{mun.meta?.note} O estado continua navegável no mapa. Nesta edição, a malha municipal cobre MG e MT.</Empty> : mun.fc && <div className="stack-2">
              <label className="sr-only" htmlFor="filtro-mun">Filtrar municípios de {ufFeature?.properties.name}</label>
              <input id="filtro-mun" className="input" name="filtro-municipio" autoComplete="off" spellCheck={false} placeholder={`Filtrar ${mun.fc.features.length} municípios…`} value={filter} onChange={(e) => setFilter(e.target.value)} />
              {munList.length === 0 ? <Empty title="Nenhum município com esse nome">Confira a grafia ou use o código IBGE de 7 dígitos.</Empty> : <ul className="list" aria-label="Municípios">{munList.slice(0, 80).map((f) => <li key={f.properties.code}><button aria-current={sel.mun === f.properties.code} onClick={() => select({ pais: 'BR', uf: sel.uf, mun: f.properties.code })}><span>{f.properties.name}</span>{coverage.covered.includes(f.properties.code) && <Pill tone="water">Com análise</Pill>}</button></li>)}</ul>}
              {munList.length > 80 && <p className="meta-13">Mostrando 80 de {munList.length}. Digite para filtrar.</p>}
              {mun.meta && <Source meta={mun.meta} />}
            </div>)}
          <div className="stack-2"><span className="meta-13">Atalhos</span><div className="row">
            <button className="btn btn--sm" onClick={() => select({ pais: 'BR', uf: null, mun: null })}>Brasil</button>
            <button className="btn btn--sm" onClick={() => select({ pais: 'BR', uf: PRESETS.sorriso.uf, mun: PRESETS.sorriso.mun })}>Sorriso, MT</button>
            <button className="btn btn--sm" onClick={() => select({ pais: 'BR', uf: PRESETS.uberlandia.uf, mun: PRESETS.uberlandia.mun })}>Uberlândia, MG</button>
          </div></div>
          {geo && <p className="meta" role="status">{geo}</p>}
        </div>
      </section>
      {wide && detail && <aside className="explore__detail" aria-label="Município selecionado" key={sel.mun}>{detail}</aside>}
      <div className="explore__controls">
        {layersOpen && <fieldset className="explore__legend" style={{ display: 'grid' }}><legend className="sr-only">Camadas</legend>
          <label className="check" style={{ minHeight: 36, padding: 0 }}><input type="checkbox" checked={layers.municipios} onChange={(e) => setLayers({ ...layers, municipios: e.target.checked })} />Limites municipais</label>
          <label className="check" style={{ minHeight: 36, padding: 0 }}><input type="checkbox" checked={layers.cobertura} onChange={(e) => setLayers({ ...layers, cobertura: e.target.checked })} />Municípios com análise</label>
          <label className="check" style={{ minHeight: 36, padding: 0 }}><input type="checkbox" checked={layers.imagem} onChange={(e) => { setLayers({ ...layers, imagem: e.target.checked }); if (e.target.checked) select({ pais: 'BR', uf: '31', mun: '3170206' }); }} /><span>Imagem orbital HLS<br /><span className="meta-13">Uberlândia · 30 jul 2024</span></span></label>
        </fieldset>}
        <div className="explore__legend explore__legend--key" aria-label="Legenda">
          <span className="legend-item"><i className="swatch" style={{ background: 'rgba(135,201,143,.3)', border: '2px solid #87C98F' }} />Selecionado</span>
          <span className="legend-item"><i className="swatch" style={{ background: 'rgba(121,189,216,.5)' }} />Município com análise</span>
          <span className="legend-item"><i className="swatch" style={{ background: '#28503a', border: '1px solid #7d9a89' }} />Limite disponível, sem análise</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="icon-btn" aria-label="Camadas do mapa" aria-pressed={layersOpen} onClick={() => setLayersOpen(!layersOpen)}><Layers size={20} aria-hidden /></button>
          <button className="icon-btn" aria-label="Usar minha localização" onClick={locate}><LocateFixed size={20} aria-hidden /></button>
          <button className="icon-btn" aria-label="Voltar para a visão do Brasil" onClick={() => select({ pais: 'BR', uf: null, mun: null })}><RotateCcw size={20} aria-hidden /></button>
          <button className="icon-btn" aria-label="Afastar" disabled={!!mapDown} onClick={() => map.current?.zoom(-1)}><Minus size={20} aria-hidden /></button>
          <button className="icon-btn" aria-label="Aproximar" disabled={!!mapDown} onClick={() => map.current?.zoom(1)}><Plus size={20} aria-hidden /></button>
        </div>
      </div>
    </div>
  );
}

function MunDetail({ code, name, uf, cov, munStatus, found, retry, onSeeCovered, go }: { code: string; name?: string; uf?: string; cov: { code: string | null; status: string; data?: Coverage; meta?: Meta; error?: unknown }; munStatus: string; found: boolean; retry: () => void; onSeeCovered: () => void; go: (to: string) => void }) {
  if (munStatus === 'ok' && !found) return <Notice tone="risk" title="Município não encontrado.">O código {code} não existe na malha carregada. Confira o código IBGE ou escolha na lista.</Notice>;
  if (cov.status === 'error') return <ErrorState error={cov.error} onRetry={retry} />;
  if (cov.code !== code || cov.status !== 'ok' || !cov.data || !name) return <Loading label="Carregando cobertura do município" rows={4} />;
  const c = cov.data; const has = c.level === 'analise';
  return (
    <div className="stack" data-testid="mun-detail" data-code={code}>
      <div className="stack-2">
        <h2 className="row" style={{ gap: 8 }}><MapPin size={20} aria-hidden />{name}, {uf}</h2>
        <p className="meta-13">Código IBGE {code} · limite municipal</p>
        <div><Pill tone={has ? 'water' : undefined}>{has ? 'Análise disponível' : 'Sem análise nesta edição'}</Pill></div>
        <p>{c.summary}</p>
      </div>
      {has ? <ul className="list" aria-label="O que dá para analisar">{c.products.map((p) => <li key={p.id}><button onClick={() => go(`${p.to}?mun=${code}`)}><span className="stack-2" style={{ gap: 4 }}><b>{p.label}</b><span className="meta-13">{p.period}</span><span><Pill tone={KIND[p.kind].tone}>{KIND[p.kind].label}</Pill></span></span><ChevronRight size={18} aria-hidden /></button></li>)}</ul>
        : <Notice>O local continua navegável. Você pode cadastrar sua propriedade aqui e registrar a safra; as análises aparecem quando o município entrar na cobertura.</Notice>}
      <div className="row">
        {has ? <LinkBtn primary to={`${code === '5107925' ? '/visao-geral' : '/municipio'}?mun=${code}`}>{code === '5107925' ? 'Ver água e clima' : 'Ver dados do município'}</LinkBtn> : <LinkBtn primary to={`/propriedades?mun=${code}&nome=${encodeURIComponent(name)}&uf=${uf}`}>Cadastrar propriedade aqui</LinkBtn>}
        {code === '5107925' && <LinkBtn to="/simulador">Simular safra</LinkBtn>}
        {!has && <button className="btn" onClick={onSeeCovered}>Ver onde há análise</button>}
      </div>
      {cov.meta && <Source meta={cov.meta} />}
    </div>
  );
}

const SEARCH_LIMIT = 12;
function PlaceSearch({ onPick }: { onPick: (p: Place) => void }) {
  const [q, setQ] = useState(''); const [res, setRes] = useState<SearchResult | null>(null); const [all, setAll] = useState(false); const [act, setAct] = useState(0); const [open, setOpen] = useState(false); const run = useRef(latestOnly()).current;
  useEffect(() => { setAll(false); if (q.trim().length < 2) { setRes(null); return; } run((sg) => geography.search(q, sg)).then((r) => { if (!r.stale) { setRes(r.value); setAct(0); } }).catch(() => setRes({ places: [], total: 0, remote: 'failed' })); }, [q]); // eslint-disable-line
  const shown = res ? (all ? res.places : res.places.slice(0, SEARCH_LIMIT)) : [];
  const choose = (p: Place) => { onPick(p); setQ(''); setOpen(false); };
  return (
    <div className="search" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <Search className="lead" size={18} aria-hidden />
      <label className="sr-only" htmlFor="busca-local">Buscar país, estado ou município por nome ou código IBGE</label>
      <input id="busca-local" className="input" role="combobox" aria-expanded={open && !!res} aria-controls="busca-lista" aria-autocomplete="list" aria-activedescendant={open && shown.length ? `busca-op-${act}` : undefined} placeholder="Buscar país, lugar ou código IBGE…" value={q} autoComplete="off" spellCheck={false} name="busca-local" enterKeyHint="search"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (!shown.length) { if (e.key === 'Escape') setOpen(false); return; } if (e.key === 'ArrowDown') { e.preventDefault(); setAct((a) => (a + 1) % shown.length); } else if (e.key === 'ArrowUp') { e.preventDefault(); setAct((a) => (a - 1 + shown.length) % shown.length); } else if (e.key === 'Enter') { e.preventDefault(); choose(shown[act]); } else if (e.key === 'Escape') setOpen(false); }} />
      {open && res && <div className="search__list" data-testid="search-results">
        <ul id="busca-lista" role="listbox" aria-label="Resultados" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {shown.length === 0 ? <li role="option" aria-selected={false} aria-disabled style={{ cursor: 'default' }}><span className="meta">{res.remote === 'failed' ? 'Nenhum lugar deste aplicativo tem esse nome, e a consulta de lugares publicados falhou. Tente de novo em instantes.' : 'Nada encontrado. A busca cobre países, os estados do Brasil e os municípios de MG e MT.'}</span></li>
            : shown.map((p, i) => <li key={p.type + p.code} id={`busca-op-${i}`} role="option" aria-selected={i === act} onMouseDown={(e) => { e.preventDefault(); choose(p); }}><span>{p.name}{p.type === 'municipio' && p.ufSigla ? `, ${p.ufSigla}` : ''}</span><span className="meta-13">{p.type === 'pais' ? `País · ${p.ufSigla}` : p.type === 'uf' ? 'Estado' : p.code}</span></li>)}
        </ul>
        {res.remote === 'failed' && shown.length > 0 && <p className="meta-13" role="status" style={{ padding: '6px 12px', margin: 0 }}>A consulta de lugares publicados falhou. Mostrando os lugares deste aplicativo.</p>}
        {!all && res.total > SEARCH_LIMIT && <button type="button" className="btn btn--sm btn--ghost" style={{ margin: '4px 8px 8px' }} onMouseDown={(e) => e.preventDefault()} onClick={() => setAll(true)}>Ver todos os {res.total} resultados</button>}
      </div>}
    </div>
  );
}

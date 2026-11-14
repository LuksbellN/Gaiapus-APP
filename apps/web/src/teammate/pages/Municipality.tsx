import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CloudRain, Droplets, Satellite, Sprout } from 'lucide-react';
import { crops, imagery, simulations, weather } from '../adapters';
import { dFull, n0, n1, pct } from '../format';
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

const PLACES: Record<string, string> = { '5107925': 'Sorriso, MT', '3170206': 'Uberlândia, MG' };
type Tab = 'clima' | 'agua' | 'safra' | 'imagem';
const GAPS = 'Temperatura, umidade do ar, radiação, vento e ET0 mensal entram no modelo, mas suas séries municipais não foram publicadas neste pacote. Aparecerão aqui quando o backend as servir.';

export function Municipality() {
  // Place: link → plot in use → Sorriso demonstration, restricted to the municipalities this screen has data for.
  const [params, setParams] = useSearchParams(); const ctx = useActiveContext(); const idx = useCoverageIndex();
  // Municipalities with data come from the catalogue; Sorriso and Uberlândia stay available while it loads.
  // Ordered list (object keys that look like numbers would be reordered by JavaScript).
  const placeList = useMemo(() => { const out: [string, string][] = [[SORRISO, PLACES[SORRISO]], ['3170206', PLACES['3170206']]]; for (const p of placesWithData(idx.index)) if (!out.some(([c]) => c === p.municipality.id)) out.push([p.municipality.id, placeName(p.municipality.id)]); return out; }, [idx.index]); const places = Object.fromEntries(placeList);
  const resolved = resolvePlace(params, ctx); const place: ResolvedPlace = places[resolved.code] || isKnownPlace(resolved.code) ? resolved : { code: SORRISO, name: PLACES[SORRISO], origin: 'demo' }; const code = place.code; const elsewhere = plotElsewhere(place, ctx); const tab: Tab = (['clima', 'agua', 'safra', 'imagem'] as const).find((t) => t === params.get('aba')) ?? 'clima'; const keep: Record<string, string> = params.get('cultura') ? { cultura: params.get('cultura')! } : {}; const setTab = (t: Tab) => setParams({ mun: code, ...(t === 'clima' ? {} : { aba: t }), ...(t === 'safra' ? keep : {}) });
  return (
    <div className="page">
      <div className="page-head"><div className="stack-2"><h1>{placeName(code)}</h1><p>Dados na escala do município (IBGE {code}). Não representam a medição de um talhão.</p></div>
        <Seg legend="Município" name="mun" value={code} onChange={(v) => setParams({ mun: v, ...(tab === 'clima' ? {} : { aba: tab }), ...(tab === 'safra' ? keep : {}) })} options={placeList.map(([value, label]) => ({ value, label }))} /></div>
      <ScopeStrip place={place} elsewhere={elsewhere} />
      <Tabs label="Dados do município" value={tab} onChange={setTab} tabs={[{ id: 'clima', label: 'Clima', icon: <CloudRain size={18} aria-hidden /> }, { id: 'agua', label: 'Água', icon: <Droplets size={18} aria-hidden /> }, { id: 'safra', label: 'Safra', icon: <Sprout size={18} aria-hidden /> }, { id: 'imagem', label: 'Imagem orbital', icon: <Satellite size={18} aria-hidden /> }]} />
      <TabPanel id={tab} key={code + tab}>{tab === 'clima' ? <Clima code={code} /> : tab === 'agua' ? <Agua code={code} /> : tab === 'safra' ? <Safra code={code} /> : <Imagem code={code} />}</TabPanel>
    </div>
  );
}
function Clima({ code }: { code: string }) {
  const d = useAsync((s) => (code === '5107925' ? weather.dailySeries(code, s) : Promise.resolve(null)), [code]);
  // Daily rain of the published field, where the municipality has one; no field is not an error.
  const im = useAsync((s) => (code === '5107925' ? Promise.resolve(null) : imagery.series(code, s).catch((e) => { if (e?.code === 'municipality_not_covered') return null; throw e; })), [code]);
  const years = useMemo(() => { const s = d.data?.data.scenarios.reference_fallow; if (!s) return []; const o: Record<string, { rain: number; et0: number; dry: number }> = {}; s.date.forEach((_, i) => { const y = (o[s.agricultural_year[i]] ??= { rain: 0, et0: 0, dry: 0 }); y.rain += s.rain_mm[i]; y.et0 += s.et0_mm[i]; if (s.rain_mm[i] < 1) y.dry++; }); return Object.entries(o); }, [d.data]);
  if (d.status === 'error' || im.status === 'error') return <ErrorState error={d.error ?? im.error} onRetry={() => { d.retry(); im.retry(); }} />;
  if (d.status === 'loading' || im.status === 'loading') return <Loading rows={5} />;
  return <>
    {d.data && <section className="card"><div className="row-between"><h2>Chuva e demanda da atmosfera por ano agrícola</h2><Pill tone="soil">Histórico · out a set</Pill></div>
      <div className="table-wrap" tabIndex={0} role="group" aria-label="Tabela; role para os lados se não couber na tela"><table><thead><tr><th>Ano agrícola</th><th className="num">Chuva (mm)</th><th className="num">ET0 (mm)</th><th className="num">Dias com menos de 1 mm</th></tr></thead><tbody>{years.map(([y, v]) => <tr key={y}><td>{y}</td><td className="num">{n0(v.rain)}</td><td className="num">{n0(v.et0)}</td><td className="num">{v.dry}</td></tr>)}</tbody></table></div><Source meta={d.data.meta} extra="Ponto diário do município; chuva IMERG" /></section>}
    {im.data && <section className="card"><div className="row-between"><h2>Chuva diária do recorte demonstrativo</h2><Pill tone="soil">Histórico · {dFull(im.data.data.rainfall[0]?.date ?? im.data.data.image.date)} a {dFull(im.data.data.rainfall.at(-1)?.date ?? im.data.data.image.date)}</Pill></div>
      <DualChart dates={im.data.data.rainfall.map((r) => r.date)} bars={im.data.data.rainfall.map((r) => r.rain_mm)} barsLabel="Chuva (mm/dia)" ariaLabel={`Chuva diária no recorte demonstrativo de ${placeName(code)}`} />
      <Stat label="Total no período" value={n0(im.data.data.rainfall.reduce((a, r) => a + (r.rain_mm ?? 0), 0))} unit="mm" note={im.data.data.rainfall.some((r) => r.rain_mm == null) ? 'Dias sem dado não entram na soma.' : undefined} />
      <Source meta={{ kind: 'publicacao', source: im.data.data.sources.rain }} extra={[im.data.data.sources.weather_scope, im.data.data.sources.rain_validation].filter(Boolean).join(' ') || undefined} /></section>}
    <Notice tone="warn" title="Ainda não disponível.">{GAPS}</Notice>
  </>;
}
function Agua({ code }: { code: string }) {
  const fsd = useAsync((s) => simulations.fieldShift(code, s), [code]); const d = useAsync((s) => weather.dailySeries(code, s), [code]); const [year, setYear] = useState('2020/2021');
  if ((fsd.error as any)?.code === 'municipality_not_covered') return <Empty title="Sem balanço hídrico publicado para este município">O cálculo de reserva de água existe hoje para Sorriso, MT. Onde há recorte demonstrativo publicado, a chuva diária está na aba Clima e o NDVI na aba Imagem orbital.</Empty>;
  if (fsd.status === 'error' || d.status === 'error') return <ErrorState error={fsd.error ?? d.error} onRetry={() => { fsd.retry(); d.retry(); }} />;
  if (!fsd.data || !d.data) return <Loading rows={5} />;
  const s = d.data.data.scenarios.reference_fallow; const a = s.agricultural_year.indexOf(year), b = s.agricultural_year.lastIndexOf(year) + 1;
  return <>
    <section className="card"><div className="row-between"><h2>Chuva, reserva de água e fases — {year}</h2><label className="row meta">Ano agrícola<select className="input" style={{ width: 'auto' }} value={year} onChange={(e) => setYear(e.target.value)}>{fsd.data.data.weather.agricultural_years.map((y) => <option key={y}>{y}</option>)}</select></label></div>
      <PhaseTimeline series={{ dates: s.date.slice(a, b), rain: s.rain_mm.slice(a, b), storage: s.storage_end_mm.slice(a, b), stage: s.stage.slice(a, b), land: s.land_cover.slice(a, b), deficit: s.et_deficit_mm.slice(a, b), capacity: d.data.data.capacity_mm }} ariaLabel={`Chuva, reserva e fases em ${year}`} />
      <Source meta={d.data.meta} extra="Soja → milho safrinha → pousio; solo AD4 (55 mm) como hipótese fixa" /></section>
    <section className="card"><div className="row-between"><h2>Resumo por ano agrícola</h2><Pill tone="warn">Simulação histórica</Pill></div>
      <div className="table-wrap" tabIndex={0} role="group" aria-label="Tabela; role para os lados se não couber na tela"><table><thead><tr><th>Ano</th><th className="num">Déficit soja (mm)</th><th className="num">Déficit milho (mm)</th><th className="num">Dias de estresse no milho</th><th className="num">Reserva na próxima semeadura (mm)</th></tr></thead><tbody>{fsd.data.data.scenarios.reference_fallow.by_year.map((r) => <tr key={r.agricultural_year} data-highlight={r.agricultural_year === year}><td>{r.agricultural_year}</td><td className="num">{n1(r.soy_deficit_mm)}</td><td className="num">{n1(r.maize_deficit_mm)}</td><td className="num">{r.maize_stress_days}</td><td className="num">{n1(r.storage_at_next_sowing_mm)}</td></tr>)}</tbody></table></div></section>
  </>;
}
function Safra({ code }: { code: string }) {
  // Cultura na URL (?cultura=). O conteúdo é remontado a cada troca: nada da seleção anterior fica na tela enquanto a nova consulta carrega ou falha.
  const [params, setParams] = useSearchParams(); const crop: CropId = isCropId(params.get('cultura')) ? (params.get('cultura') as CropId) : 'soy';
  const setCrop = (c: string) => setParams((prev) => { const p = new URLSearchParams(prev); if (c === 'soy') p.delete('cultura'); else p.set('cultura', c); return p; });
  return <>
    <div className="row-between"><Field label="Cultura" hint={isPlainCrop(crop) ? undefined : CROPS[crop].role}>{(a) => <select className="input" {...a} name="cultura" value={crop} onChange={(e) => setCrop(e.target.value)}>{CROP_IDS.map((id) => <option key={id} value={id}>{CROPS[id].name}{CROPS[id].plantable ? '' : ' (coorte agregada)'}</option>)}</select>}</Field></div>
    <SafraCrop key={code + crop} code={code} crop={crop} />
  </>;
}
function SafraCrop({ code, crop }: { code: string; crop: CropId }) {
  const here = useAsync((s) => crops.yieldExamples({ crop, municipalityCode: code }, s), [code, crop]); const all = useAsync((s) => crops.yieldExamples({ crop }, s), [crop]); const mlp = useAsync((s) => (crop === 'soy' ? crops.regionalMlp(code, s) : Promise.resolve(null)), [code, crop]);
  if (here.status === 'error') return <ErrorState error={here.error} onRetry={here.retry} />; if (!here.data || all.status === 'loading') return <Loading label={`Consultando ${CROPS[crop].name.toLowerCase()} em ${placeName(code)}…`} rows={5} />;
  const elsewhere = (all.data ?? []).filter((r) => r.data.municipality_code !== code);
  return <div className="stack" data-testid="safra" data-crop={crop} data-mun={code}>
    <section className="stack" aria-labelledby="h-est"><div className="stack-2"><h2 id="h-est">Estimativa de rendimento — {CROPS[crop].name.toLowerCase()} em {placeName(code)}</h2><p className="meta">Respostas de exemplo do contrato <code>yield-estimate</code>. Cada cartão traz o modelo, a versão e a abrangência que a própria resposta declara.</p></div>
      {here.data.length ? <div className="grid-2">{here.data.map((r) => <YieldCard key={r.meta.source + r.data.generated_at} r={r} />)}</div>
        : <Empty title={`Sem resposta de exemplo para ${CROPS[crop].name.toLowerCase()} em ${placeName(code)}`}>Integração pendente: sem serviço HTTP ligado, o frontend só conhece os exemplos do contrato. Isso não quer dizer que o município esteja fora da cobertura do modelo.{crop === 'coffee_total_mg' ? ' Café total MG é uma coorte agregada do estado, sem resposta por município nos exemplos.' : ''}</Empty>}
    </section>
    {crop === 'soy' && <section className="card"><div className="row-between"><h2>Soja — MLP regional MG/MT · amostras de verificação</h2><Pill tone="warn">Pesquisa · não liberado</Pill></div>
      {!mlp.data ? <Loading rows={2} /> : mlp.data.data.length ? <><div className="table-wrap" tabIndex={0} role="group" aria-label="Tabela; role para os lados se não couber na tela"><table><thead><tr><th>Dias após a semeadura</th>{mlp.data.data.map((x) => <th className="num" key={x.horizon_days}>{x.horizon_days}</th>)}</tr></thead><tbody><tr><td>Estimativa (kg/ha)</td>{mlp.data.data.map((x) => <td className="num" key={x.horizon_days}>{n0(x.expected_kg_ha)}</td>)}</tr></tbody></table></div><ModelTest cohort="soy" scope="MG+MT" /><Source meta={mlp.data.meta} /></> : <Empty title="Sem amostra regional para este município" />}</section>}
    {elsewhere.length > 0 && <section className="stack" aria-labelledby="h-outros"><div className="stack-2"><h2 id="h-outros">Exemplo do contrato em outro município</h2><p className="meta">Mostra o formato da resposta para {CROPS[crop].name.toLowerCase()}. Não é dado de {placeName(code)}.</p></div><div className="grid-2">{elsewhere.map((r) => <YieldCard key={r.meta.source} r={r} place={`IBGE ${r.data.municipality_code}`} />)}</div></section>}
    <div className="grid-2"><CapabilityTable crop={crop} mun={code} place={placeName(code)} /><section className="card" aria-labelledby="h-sit"><h2 id="h-sit">Situação científica — {CROPS[crop].name.toLowerCase()}</h2><ModelStatus crop={crop} /></section></div>
    <Notice tone="warn" title="Histórico de produção (IBGE PAM).">O histórico municipal de área e rendimento entra no treino dos modelos, mas a série não faz parte do pacote de integração. O gráfico histórico aparece aqui quando o backend a publicar.</Notice>
  </div>;
}
function Imagem({ code }: { code: string }) {
  const im = useAsync((s) => imagery.series(code, s), [code]); const idx = useCoverageIndex(); const withField = placesWithData(idx.index).filter((p) => p.fields.length).map((p) => placeName(p.municipality.id));
  if ((im.error as any)?.code === 'municipality_not_covered') return <Empty title="Sem imagem orbital processada para este município">{withField.length ? `Nesta versão há NDVI para os recortes demonstrativos de: ${withField.join('; ')}.` : 'O catálogo de imagens ainda não foi consultado.'}</Empty>;
  if (im.status === 'error') return <ErrorState error={im.error} onRetry={im.retry} />; if (!im.data) return <Loading rows={5} />;
  const d = im.data.data; const byDate = new Map<string, (typeof d.observations)[number]>(); for (const o of d.observations) { const prev = byDate.get(o.date); if (!prev || (prev.ndvi == null && o.ndvi != null) || (o.ndvi != null && o.valid_fraction > prev.valid_fraction)) byDate.set(o.date, o); } const dates = d.rainfall.map((r) => r.date); const valid = d.observations.filter((o) => o.ndvi != null);
  return <div className="cols">
    <section className="card"><div className="row-between"><h2>NDVI e chuva alinhados por data</h2><Pill tone="ok">Observação orbital</Pill></div>
      <DualChart dates={dates} line={dates.map((x) => (byDate.has(x) ? byDate.get(x)!.ndvi ?? null : undefined))} rejected={dates.map((x) => byDate.has(x) && byDate.get(x)!.ndvi == null)} lineLabel="NDVI (0 a 1) · × = imagem descartada por nuvens" lineDomain={[0, 1]} bars={d.rainfall.map((r) => r.rain_mm)} barsLabel="Chuva (mm/dia)" ariaLabel="NDVI e chuva diária, abril a julho de 2024, com lacunas onde não houve imagem válida" />
      <p className="meta">A linha liga apenas imagens válidas seguidas e é interrompida onde uma imagem foi descartada ou o intervalo passa de 12 dias; nenhum valor é estimado. {d.validation.accepted_scenes} de {d.validation.total_scenes} cenas aceitas{d.validation.min_valid_fraction != null ? ` (mínimo de ${pct(d.validation.min_valid_fraction)} de pixels sem nuvem)` : ''}, {valid.length} datas com NDVI.</p>
      <Source meta={im.data.meta} extra={d.observations[0]?.field_pixels ? `Agregação: ${d.observations[0].field_pixels} pixels de 30 m dentro do polígono "${d.field.label}"` : `Média do polígono "${d.field.label}"; vale só para o recorte, não para o município.`} /></section>
    <aside className="card"><h2>Imagem de {dFull(d.image.date)}</h2><img src={d.imageUrl} width={560} height={560} loading="lazy" decoding="async" alt={`Imagem de satélite em cor natural do recorte rural demonstrativo em ${placeName(code)}`} style={{ width: '100%', height: 'auto', borderRadius: 8, border: '1px solid var(--border)' }} />
      <dl className="kv"><dt>Produto</dt><dd>HLS v2 · Sentinel-2 (S30)</dd><dt>Resolução</dt><dd>30 m</dd><dt>Pixels válidos no recorte</dt><dd>{pct(byDate.get(d.image.date)?.valid_fraction)}</dd><dt>NDVI na data</dt><dd>{byDate.get(d.image.date)?.ndvi?.toLocaleString('pt-BR') ?? '—'}</dd></dl><p className="meta-13" style={{ wordBreak: 'break-all' }}>Cena {d.image.scene_id}</p></aside>
  </div>;
}

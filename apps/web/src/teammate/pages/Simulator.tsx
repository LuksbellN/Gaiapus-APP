import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsLeft, ChevronsRight, Pause, Play, SkipBack, SkipForward, SlidersHorizontal, StepBack, StepForward } from 'lucide-react';
import { crops, modelLabel, modelScope, weather, type Daily } from '../adapters';
import { dFull, LAND, n0, n1, n2, pct, signed, STAGE } from '../format';
import { ErrorState, Field, Loading, Notice, Pill, Seg, Source, Stat, Tabs, useAsync, useMedia } from '../ui';
import { PhaseTimeline, type TimelineSeries } from '../ui/PhaseTimeline';
import { ModelTest } from '../ui/SealedTest';
import { CROPS, isCoffee, isCropId, PLANTABLE, type CropId } from '../catalog';
import { hasDailySeries, SORRISO } from '../capabilities';
import { CapabilityTable } from '../ui/Crops';
import { useSearchParams } from 'react-router-dom';
import { Field2D, webglAvailable, type FieldState } from '../sim/field-state';
import { useLazy } from '../lazyPage';
import { useActiveContext } from '../App';
import { plotElsewhere } from '../context';
const loadField3D = () => import('../sim/Field3D');

type Mode = 'historico' | 'cenario' | 'previsao' | 'climatologia';
const MODE: Record<Mode, { label: string; tone: 'soil' | 'warn' | 'water' | undefined; desc: string }> = {
  historico: { label: 'Histórico', tone: 'soil', desc: 'Clima retrospectivo (NASA POWER/IMERG) com soja → milho safrinha → pousio.' },
  cenario: { label: 'Cenário hipotético', tone: 'warn', desc: 'Mesmo clima histórico, trocando o pousio por braquiária. Depende das hipóteses de cobertura e palhada.' },
  previsao: { label: 'Previsão disponível', tone: 'water', desc: 'Projeção de 14 a 19 nov 2026 (Open-Meteo, ECMWF IFS).' },
  climatologia: { label: 'Climatologia', tone: undefined, desc: 'Média de 2001–2021 para os mesmos dias da previsão.' },
};
const YEARS = ['2015/2016', '2016/2017', '2017/2018', '2018/2019', '2019/2020', '2020/2021'];
type Row = { etc: number | null; eta: number | null; et0: number; ks: number; drainage: number | null; awf: number };
function slice(d: Daily['scenarios']['brachiaria'], year: string) { const a = d.agricultural_year.indexOf(year), b = d.agricultural_year.lastIndexOf(year) + 1; const s = <T,>(x: T[]) => x.slice(a, b); return { dates: s(d.date), rain: s(d.rain_mm), storage: s(d.storage_end_mm), stage: s(d.stage), land: s(d.land_cover), deficit: s(d.et_deficit_mm), covered: s(d.soil_covered), rows: s(d.date).map((_, i): Row => ({ etc: d.etc_mm[a + i], eta: d.eta_mm[a + i], et0: d.et0_mm[a + i], ks: d.ks[a + i], drainage: d.drainage_mm[a + i], awf: d.available_water_fraction[a + i] })) }; }

const PLACE: Record<string, string> = { '5107925': 'Sorriso, MT', '3170206': 'Uberlândia, MG' };
// A cultura e o município escolhidos decidem os dados. Só a rotação de soja em Sorriso tem série diária no pacote;
// para qualquer outra combinação mostramos o que existe e o que falta, sem curva, fase ou planta inventada.
export function Simulator() {
  const [params, setParams] = useSearchParams(); const crop: CropId = isCropId(params.get('cultura')) ? (params.get('cultura') as CropId) : 'soy'; const mun = /^\d{7}$/.test(params.get('mun') ?? '') ? params.get('mun')! : SORRISO;
  const setCrop = (c: string) => setParams((prev) => { const p = new URLSearchParams(prev); if (c === 'soy') p.delete('cultura'); else p.set('cultura', c); return p; });
  if (hasDailySeries(crop, mun)) return <SorrisoSimulator onCrop={setCrop} />;
  const place = PLACE[mun] ?? `município IBGE ${mun}`; const coffee = isCoffee(crop); const stage = params.get('cafezal') === 'implantacao' ? 'implantacao' : 'producao';
  return (
    <div className="page" data-testid="sim-unavailable" data-crop={crop} data-mun={mun}>
      <div className="page-head"><div className="stack-2"><h1>Simulador — {CROPS[crop].name.toLowerCase()} em {place}</h1><p>Não há série diária de água, fases ou crescimento para esta combinação. Nada é simulado: nenhuma curva de soja é mostrada com outro nome.</p></div><Pill>Sem série compatível</Pill></div>
      <div className="cols">
        <div className="stack">
          <section className="card"><h2>Escolha o que simular</h2>
            <div className="form-grid"><Field label="Cultura" hint={CROPS[crop].role === 'Cultura' ? undefined : CROPS[crop].role}>{(a) => <select className="input" {...a} name="cultura" value={crop} onChange={(e) => setCrop(e.target.value)}>{PLANTABLE.map((id) => <option key={id} value={id}>{CROPS[id].name}</option>)}</select>}</Field>
              <Field label="Local" hint="A série diária do pacote existe só para Sorriso, MT.">{(a) => <select className="input" {...a} name="local" value={mun} onChange={(e) => setParams((prev) => { const p = new URLSearchParams(prev); if (e.target.value === SORRISO) p.delete('mun'); else p.set('mun', e.target.value); return p; })}>{[...new Set([SORRISO, '3170206', mun])].map((m) => <option key={m} value={m}>{PLACE[m] ?? `IBGE ${m}`}</option>)}</select>}</Field></div>
            <div className="row"><a className="btn" href="#/simulador">Abrir a simulação de soja em Sorriso (demonstração)</a></div>
          </section>
          {crop === 'maize2' && mun === SORRISO && <Notice title="Milho safrinha em Sorriso.">O milho safrinha aparece dentro da rotação soja → milho safrinha → pousio da simulação de Sorriso. Não há série que comece no milho; para vê-lo na rotação, abra a simulação de soja e avance até a fase do milho.</Notice>}
          {coffee && <section className="card" aria-labelledby="h-cafe"><h2 id="h-cafe">Café: qual é a situação do cafezal?</h2>
            <Seg legend="Situação" name="cafezal" value={stage} onChange={(x) => setParams((prev) => { const p = new URLSearchParams(prev); p.set('cafezal', x); return p; })} options={[{ value: 'producao', label: 'Cafezal em produção' }, { value: 'implantacao', label: 'Implantação de cafezal novo' }]} />
            {stage === 'implantacao' ? <p>Na implantação, três meses após o plantio são só o começo do estabelecimento das mudas; a primeira colheita vem anos depois e <b>não é representada aqui como um ciclo</b>. O que dá para fazer hoje: registrar o plantio com espécie, data, área e irrigação.</p>
              : <p>Para um cafezal em produção, o acompanhamento depende da espécie, da idade, da última poda, da irrigação e da safra (bienalidade). Esses dados são guardados em Registros; o motor científico ainda não publica fases nem balanço hídrico de café, então nenhuma fase é desenhada.</p>}
            <div className="row"><a className="btn" href="#/registros?novo=plantio">Registrar {stage === 'implantacao' ? 'a implantação' : 'o cafezal'}</a><a className="btn" href={`#/municipio?mun=3170206&aba=safra&cultura=${crop}`}>Ver exemplo de estimativa municipal</a></div>
          </section>}
          <section className="card"><h2>O que existe hoje</h2><ul className="plain"><li><a href={`#/municipio?mun=${PLACE[mun] ? mun : SORRISO}&aba=safra&cultura=${crop}`}>Exemplos de estimativa municipal de rendimento</a> — retrospectivos, na escala do município.</li><li><a href="#/registros">Registros de plantio, manejo, colheita e venda</a> — salvos neste aparelho.</li><li><a href={`#/planejar?mun=${mun}`}>Planejamento com seus próprios números</a> de rendimento, preço e custo.</li></ul>
            <h3>O que falta para simular</h3><ul className="plain"><li>Série diária de chuva, ET0 e balanço hídrico para esta cultura neste município.</li><li>Calendário de fases e coeficientes da cultura publicados pelo motor científico.</li><li>Representação 3D própria; a cena atual só tem soja, milho e braquiária, e é ilustrativa.</li><li>Previsão meteorológica diária só cobre poucos dias: não há previsão diária para meses à frente.</li></ul>
          </section>
        </div>
        <CapabilityTable crop={crop} mun={mun} place={place} />
      </div>
    </div>
  );
}
function SorrisoSimulator({ onCrop }: { onCrop: (c: string) => void }) {
  const ctx = useActiveContext(); const elsewhere = plotElsewhere({ code: SORRISO, name: 'Sorriso, MT', origin: 'demo' }, ctx);
  const daily = useAsync((s) => weather.dailySeries('5107925', s), []); const proj = useAsync((s) => weather.waterProjection('5107925', s), []); const yld = useAsync((s) => crops.yieldEstimate({ crop: 'soy', municipalityCode: '5107925' }, s), []);
  // Configuração na URL (?modo=&ano=&ab=&secao=): o link reabre o mesmo cenário e voltar/avançar percorre as trocas.
  const [params, setParams] = useSearchParams(); const put = (kv: Record<string, string | null>) => setParams((prev) => { const p = new URLSearchParams(prev); for (const [k, v] of Object.entries(kv)) { if (v == null) p.delete(k); else p.set(k, v); } return p; });
  const mode: Mode = (Object.keys(MODE) as Mode[]).find((m) => m === params.get('modo')) ?? 'historico'; const setMode = (m: Mode) => put({ modo: m === 'historico' ? null : m });
  const year = YEARS.find((y) => y.replace('/', '-') === params.get('ano')) ?? '2020/2021'; const setYear = (y: string) => put({ ano: y === '2020/2021' ? null : y.replace('/', '-') });
  const compare = params.get('ab') === '1'; const setCompare = (v: boolean) => put({ ab: v ? '1' : null }); const [cursor, setCursor] = useState(0); const [playing, setPlaying] = useState(false); const [speed, setSpeed] = useState(14);
  const [collapsed, setCollapsed] = useState(false); const tab = (['campo', 'indicadores', 'configurar'] as const).find((t) => t === params.get('secao')) ?? 'campo'; const setTab = (t: 'campo' | 'indicadores' | 'configurar') => put({ secao: t === 'campo' ? null : t }); const mobile = useMedia('(max-width: 760px)'); const [gl] = useState(webglAvailable); const field3d = useLazy(loadField3D, gl);
  const seed = useMemo(() => Number(new URLSearchParams(location.hash.split('?')[1] ?? '').get('seed') ?? 7), []);

  const model = useMemo(() => {
    if (!daily.data || !proj.data) return null; const cap = daily.data.data.capacity_mm;
    if (mode === 'historico' || mode === 'cenario') {
      const A = slice(daily.data.data.scenarios[mode === 'historico' ? 'reference_fallow' : 'brachiaria'], year), B = slice(daily.data.data.scenarios[mode === 'historico' ? 'brachiaria' : 'reference_fallow'], year);
      const series: TimelineSeries = { dates: A.dates, rain: A.rain, storage: A.storage, stage: A.stage, land: A.land, deficit: A.deficit, capacity: cap, ...(compare ? { storageB: B.storage, landB: B.land } : {}) };
      return { series, A, B: compare ? B : null, names: mode === 'historico' ? ['A · Pousio', 'B · Braquiária'] : ['A · Braquiária', 'B · Pousio'] };
    }
    const p = proj.data.data; const mk = (days: typeof p.days) => ({ dates: days.map((d) => d.date), rain: days.map((d) => d.rain_mm), storage: days.map((d) => d.storage_end_mm), stage: days.map((d) => d.phase), land: days.map(() => 'soy'), deficit: days.map((d) => d.et_deficit_mm), covered: days.map(() => 1), rows: days.map((d): Row => ({ etc: null, eta: null, et0: d.et0_mm, ks: d.ks, drainage: null, awf: d.available_water_fraction })) });
    const A = mk(mode === 'previsao' ? p.days : p.reference_days), B = mk(mode === 'previsao' ? p.reference_days : p.days);
    return { series: { dates: A.dates, rain: A.rain, storage: A.storage, stage: A.stage, land: A.land, deficit: A.deficit, capacity: p.soil.capacity_mm, ...(compare ? { storageB: B.storage } : {}) } as TimelineSeries, A, B: compare ? B : null, names: mode === 'previsao' ? ['A · Previsão', 'B · Climatologia'] : ['A · Climatologia', 'B · Previsão'] };
  }, [daily.data, proj.data, mode, year, compare]);
  const n = model?.series.dates.length ?? 1; const c = Math.min(cursor, n - 1);
  useEffect(() => { setCursor((v) => Math.min(v, n - 1)); setPlaying(false); }, [n, mode, year]);
  // Um único cursor temporal dirige gráfico, fase, cena e números.
  const last = useRef(0);
  useEffect(() => { if (!playing) return; let raf = 0; let acc = 0; last.current = performance.now(); const tick = (t: number) => { acc += ((t - last.current) / 1000) * speed; last.current = t; if (acc >= 1) { const step = Math.floor(acc); acc -= step; setCursor((v) => { if (v + step >= n - 1) { setPlaying(false); return n - 1; } return v + step; }); } raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [playing, speed, n]);

  const phaseStarts = useMemo(() => { if (!model) return []; const out: number[] = [0]; for (let i = 1; i < n; i++) if (model.A.stage[i] !== model.A.stage[i - 1] || model.A.land[i] !== model.A.land[i - 1]) out.push(i); return out; }, [model, n]);
  if (daily.status === 'error' || proj.status === 'error') return <div className="page"><h1>Simulador</h1><ErrorState error={daily.error ?? proj.error} onRetry={() => { daily.retry(); proj.retry(); }} /></div>;
  if (!model) return <div className="page"><h1>Simulador</h1><Loading rows={6} /></div>;
  const { A, B } = model; const row = A.rows[c]; const start = [...phaseStarts].reverse().find((i) => i <= c) ?? 0; const end = (phaseStarts.find((i) => i > c) ?? n) - 1;
  const fs: FieldState = { land: A.land[c], stage: A.stage[c], progress: end > start ? (c - start) / (end - start) : 1, awf: row.awf, rain: A.rain[c], covered: !!A.covered[c] };
  const cum = (arr: number[]) => arr.slice(0, c + 1).reduce((a, b) => a + b, 0); const stressDays = A.rows.slice(0, c + 1).filter((r) => r.ks < 1).length;
  const label = `Campo ilustrativo em ${dFull(A.dates[c])}: ${LAND[fs.land]}, fase ${STAGE[fs.stage]}, reserva em ${pct(fs.awf)}.${gl && field3d.mod ? ' Setas giram a vista; + e − aproximam.' : ''}`;
  const jump = (dir: 1 | -1) => setCursor(dir === 1 ? (phaseStarts.find((i) => i > c) ?? n - 1) : ([...phaseStarts].reverse().find((i) => i < c) ?? 0));
  const long = mode === 'historico' || mode === 'cenario';
  return (
    <div className="sim" data-tab={tab} data-mode={mode}>
      <h1 className="sr-only">Simulador de safra — Sorriso, MT</h1>
      {mobile && <div className="sim__tabs"><Tabs label="Seções do simulador" value={tab} onChange={setTab} tabs={[{ id: 'campo', label: 'Campo' }, { id: 'indicadores', label: 'Indicadores' }, { id: 'configurar', label: 'Configurar' }]} /></div>}
      <aside className="sim__config" id="panel-configurar" data-collapsed={collapsed && !mobile} aria-label="Configuração da simulação">
        {!mobile && <button className={collapsed ? 'icon-btn' : 'btn btn--sm'} aria-expanded={!collapsed} aria-label={collapsed ? 'Abrir configuração' : undefined} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <SlidersHorizontal size={20} aria-hidden /> : <><ChevronsLeft size={16} aria-hidden />Recolher configuração</>}</button>}
        {(!collapsed || mobile) && <>
          {elsewhere && <div data-testid="scope-strip"><Notice tone="warn" title="Demonstração em Sorriso, MT.">Seu talhão em uso ({elsewhere.plot}) fica em {elsewhere.place}; esta simulação não é dele.</Notice></div>}
          <Field label="Cultura" hint="Só a rotação de soja em Sorriso tem série diária. Outras culturas abrem uma tela que explica o que existe e o que falta.">{(p) => <select className="input" {...p} name="cultura" value="soy" onChange={(e) => onCrop(e.target.value)}>{PLANTABLE.map((id) => <option key={id} value={id}>{CROPS[id].name}</option>)}</select>}</Field>
          <Field label="Local">{(p) => <select className="input" {...p} defaultValue="5107925"><option value="5107925">Sorriso, MT (IBGE 5107925)</option><option disabled>Outros municípios: sem série diária nesta edição</option></select>}</Field>
          <Seg legend="Tipo de dado" name="modo" value={mode} onChange={(m) => { setMode(m); setCursor(0); }} options={(Object.keys(MODE) as Mode[]).map((m) => ({ value: m, label: MODE[m].label }))} />
          <p className="meta">{MODE[mode].desc}</p>
          {long && <Field label="Ano agrícola" hint="Semeadura da soja em 5 de outubro (calendário fixo hipotético de MT).">{(p) => <select className="input" {...p} value={year} onChange={(e) => { setYear(e.target.value); setCursor(0); }}>{YEARS.map((y) => <option key={y}>{y}</option>)}</select>}</Field>}
          <label className="check"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /><span><b>Comparar A/B</b><br /><span className="meta-13">{model.names[0]} com {model.names[1]}</span></span></label>
          <div className="card card--flat"><h3>Hipóteses fixas</h3><dl className="kv"><dt>Rotação</dt><dd>Soja → milho safrinha</dd><dt>Solo</dt><dd>AD4 · 55 mm</dd><dt>Reserva na semeadura</dt><dd>{long ? 'contínua entre safras' : '70% (hipótese)'}</dd><dt>Irrigação</dt><dd>Sem irrigação</dd></dl><p className="meta-13">Cenários de irrigação ou de chuva alterada não têm método validado no pacote e por isso não são oferecidos. Solo é hipótese fixa, não perfil medido.</p></div>
          <Notice title="Café.">Não há série diária de café no pacote. Acompanhar um cafezal por três meses exigirá espécie, idade, poda e histórico; a primeira produção segue parâmetros de cultura perene.</Notice>
        </>}
      </aside>
      <div className="sim__stage" id="panel-campo">
        {gl && field3d.mod ? <field3d.mod.default state={fs} seed={seed} label={label} /> : gl && !field3d.failed ? <div className="sim__loading" role="status"><span className="spinner" aria-hidden /><span>Carregando o campo 3D…</span></div> : <Field2D state={fs} label={label} />}
        {gl && field3d.failed && <div className="sim__retry"><span>Sem conexão para baixar a vista 3D; mostrando a vista 2D.</span><button className="btn btn--sm" onClick={field3d.retry}>Tentar de novo</button></div>}
        <div className="sim__overlay"><Pill tone={MODE[mode].tone}>{MODE[mode].label}</Pill><Pill>{dFull(A.dates[c])}</Pill><Pill>{LAND[fs.land]} · {STAGE[fs.stage]}</Pill></div>
        <p className="sim__caption">Ilustração. As plantas seguem um calendário demonstrativo de fases, não o estado medido de um talhão. Modelos 3D provisórios.</p>
      </div>
      <div className="sim__timeline">
        <div className="transport" role="group" aria-label="Controles de tempo">
          <button className="icon-btn" aria-label="Fase anterior" onClick={() => jump(-1)}><SkipBack size={18} aria-hidden /></button>
          <button className="icon-btn" aria-label="Voltar 1 dia" onClick={() => setCursor(Math.max(0, c - 1))}><StepBack size={18} aria-hidden /></button>
          <button className="btn btn--primary" onClick={() => { if (c >= n - 1) setCursor(0); setPlaying(!playing); }} aria-pressed={playing}>{playing ? <><Pause size={18} aria-hidden />Pausar</> : <><Play size={18} aria-hidden />Reproduzir</>}</button>
          <button className="icon-btn" aria-label="Avançar 1 dia" onClick={() => setCursor(Math.min(n - 1, c + 1))}><StepForward size={18} aria-hidden /></button>
          {long && <button className="btn btn--sm" onClick={() => setCursor(Math.min(n - 1, c + 7))}>+1 semana</button>}
          <button className="icon-btn" aria-label="Próxima fase" onClick={() => jump(1)}><SkipForward size={18} aria-hidden /></button>
          {long && <label className="row meta" style={{ marginLeft: 'auto' }}>Velocidade<select className="input input--sm" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value={7}>1 semana/s</option><option value={14}>2 semanas/s</option><option value={30}>1 mês/s</option></select></label>}
        </div>
        <PhaseTimeline series={model.series} cursor={c} onCursor={(i) => { setPlaying(false); setCursor(i); }} labelA={compare ? `Reserva ${model.names[0]}` : 'Reserva de água'} labelB={compare ? `Reserva ${model.names[1]}` : undefined} ariaLabel="Linha do tempo da simulação. Setas movem um dia; PageUp e PageDown, uma semana." height={mobile ? 170 : 190} />
      </div>
      <aside className="sim__results" id="panel-indicadores" aria-label="Indicadores no dia selecionado" aria-live="off">
        <div className="stack-2"><h2>{dFull(A.dates[c])}</h2><p className="meta">{LAND[fs.land]} · {STAGE[fs.stage]} · dia {c + 1} de {n}</p></div>
        <div className="card"><h3>Água no dia</h3><dl className="kv">
          <dt>Chuva</dt><dd>{n1(A.rain[c])} mm</dd><dt>ET0 (demanda da atmosfera)</dt><dd>{n1(row.et0)} mm</dd>
          <dt>ETc (necessidade da cultura)</dt><dd>{row.etc == null ? 'não fornecida' : `${n1(row.etc)} mm`}</dd><dt>ETa (uso real)</dt><dd>{row.eta == null ? 'não fornecida' : `${n1(row.eta)} mm`}</dd>
          <dt>Déficit</dt><dd>{n2(A.deficit[c])} mm</dd><dt>Reserva de água</dt><dd>{n1(A.storage[c])} mm · {pct(row.awf)}</dd>
          {row.drainage != null && <><dt>Drenagem</dt><dd>{n1(row.drainage)} mm</dd></>}
        </dl><div>{row.ks < 1 ? <Pill tone="warn">Água abaixo do ideal</Pill> : <Pill tone="ok">Água suficiente</Pill>}</div></div>
        <div className="card"><h3>Acumulado até este dia</h3><div className="grid-2"><Stat label="Chuva" value={n0(cum(A.rain))} unit="mm" /><Stat label="Déficit" value={n1(cum(A.deficit))} unit="mm" /><Stat label="Dias com estresse" value={stressDays} /><Stat label="Dias simulados" value={c + 1} /></div></div>
        {B && <div className="card"><h3>Diferença {model.names[1].slice(0, 1)} − {model.names[0].slice(0, 1)} neste dia</h3><dl className="kv"><dt>Reserva de água</dt><dd>{signed(B.storage[c] - A.storage[c])} mm</dd><dt>Déficit acumulado</dt><dd>{signed(cum(B.deficit) - cum(A.deficit))} mm</dd><dt>Cobertura do solo em B</dt><dd>{LAND[B.land[c]]}</dd></dl></div>}
        <div className="card"><div className="row-between"><h3>Rendimento</h3><Pill tone="soil">Retrospectivo</Pill></div>
          {yld.data ? <><Stat label="Soja · município · colheita 2021" value={n0(yld.data.data.estimate_kg_ha)} unit="kg/ha" note={`MAE de validação ${n0(yld.data.data.validation?.mae_kg_ha)} kg/ha`} /><p className="meta-13">Vem de um serviço separado ({modelLabel(yld.data.data.model)} · {yld.data.data.model.version}) e não muda com o cursor nem com o cenário: o efeito do manejo sobre o rendimento não foi avaliado.</p><ModelTest cohort="soy" scope={modelScope(yld.data.data.model)} /></> : <Loading rows={2} />}</div>
        <div className="card"><h3>Economia</h3><p className="meta">Sem preço e custos informados. Preencha em <a href="#/planejar">Planejar</a> para ver margem.</p></div>
        {daily.data && <Source meta={long ? daily.data.meta : proj.data!.meta} />}
      </aside>
    </div>
  );
}

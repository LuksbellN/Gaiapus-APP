import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, CloudRain, Droplets, Globe, Sprout, Tractor } from 'lucide-react';
import { crops, modelLabel, modelScope, weather } from '../adapters';
import { useActiveContext } from '../App';
import { dFull, dShort, dTime, dWeek, n0, n1, pct, STAGE } from '../format';
import { useStore, type FieldRecord } from '../store';
import { plotElsewhere, resolvePlace, SORRISO, upcomingActivity } from '../context';
import { ScopeStrip } from '../ui/ScopeStrip';
import { Empty, ErrorState, LinkBtn, Loading, Notice, Pill, Source, Stat, useAsync } from '../ui';
import { PhaseTimeline } from '../ui/PhaseTimeline';
import { ModelTest } from '../ui/SealedTest';

export function Overview() {
  // Place: link → plot in use → Sorriso demonstration (context.ts). The water projection is published only for Sorriso.
  const [params] = useSearchParams(); const ctx = useActiveContext(); const place = resolvePlace(params, ctx); const code = place.code; const elsewhere = plotElsewhere(place, ctx); const covered = code === SORRISO;
  const w = useAsync((s) => (covered ? weather.waterProjection(code, s) : Promise.resolve(null)), [code]); const daily = useAsync((s) => (covered ? weather.dailySeries(code, s) : Promise.resolve(null)), [code]); const y = useAsync((s) => (covered ? crops.yieldEstimate({ crop: 'soy', municipalityCode: code }, s) : Promise.resolve(null)), [code]);
  const records = useStore((s) => s.records); const upcoming = upcomingActivity(records, ctx.plot?.id ?? null);
  const phaseDeficit = useMemo(() => { const d = daily.data?.data.scenarios.reference_fallow; if (!d) return null; const out: Record<string, { mm: number; days: number; stress: number }> = {}; d.date.forEach((_, i) => { if (d.agricultural_year[i] !== '2020/2021' || d.land_cover[i] !== 'soy') return; const o = (out[d.stage[i]] ??= { mm: 0, days: 0, stress: 0 }); o.mm += d.et_deficit_mm[i]; o.days++; if (d.ks[i] < 1) o.stress++; }); return out; }, [daily.data]);
  if (!covered) return <div className="page"><div className="page-head"><div className="stack-2"><h1>Visão geral — {place.name}</h1><p>Água, clima e safra do lugar que você está acompanhando.</p></div></div>
    <ScopeStrip place={place} elsewhere={elsewhere} />
    <div className="cols"><section className="card" aria-labelledby="h-sem" data-testid="no-analysis"><h2 id="h-sem">Ainda sem projeção de água para {place.name}</h2>
      <p>Você selecionou {place.name}. Ainda não há projeção de reserva de água publicada para esse município nesta versão. Nenhum número de outro lugar é mostrado aqui.</p>
      <div className="row"><LinkBtn primary to={`/explorar?mun=${code}`}>Ver o que existe para {place.name}</LinkBtn><LinkBtn to="/visao-geral?mun=5107925">Ver a demonstração de Sorriso</LinkBtn><LinkBtn to="/explorar?pais=BR">Ver regiões com dados</LinkBtn></div></section>
      <aside className="stack" aria-label="Ações e contexto"><Actions /><Upcoming upcoming={upcoming} plot={ctx.plot?.name} /></aside></div></div>;
  if (w.status === 'error') return <div className="page"><h1>Visão geral</h1><ErrorState error={w.error} onRetry={w.retry} /><p><LinkBtn to="/explorar?pais=BR">Escolher outro local</LinkBtn></p></div>;
  if (!w.data?.data) return <div className="page"><h1>Visão geral</h1><Loading rows={6} /></div>;
  const p = w.data.data; const d0 = p.days[0]; const last = p.days[p.days.length - 1]; const rainTotal = p.days.reduce((a, d) => a + d.rain_mm, 0); const stressDays = p.days.filter((d) => d.stress);
  const series = { dates: p.days.map((d) => d.date), rain: p.days.map((d) => d.rain_mm), storage: p.days.map((d) => d.storage_end_mm), storageB: p.reference_days.map((d) => d.storage_end_mm), stage: p.days.map((d) => d.phase), land: p.days.map(() => p.crop), deficit: p.days.map((d) => d.et_deficit_mm), capacity: p.soil.capacity_mm };
  const lead1 = p.evaluation.by_lead[0];
  return (
    <div className="page">
      <div className="page-head">
        <div className="stack-2"><h1>Hoje em {place.name}</h1><p>Soja · dia {p.crop_day_at_decision} do ciclo · estágio {STAGE[d0.phase].toLowerCase()} · semeadura em {dFull(p.sowing_date)} (calendário fixo hipotético do estado)</p></div>
        <div className="row"><Pill tone="water">Previsão</Pill><Pill>Escala municipal</Pill></div>
      </div>
      <ScopeStrip place={place} elsewhere={elsewhere} period={`previsão de ${dShort(d0.date)} a ${dFull(last.date)}`} />
      <div className="cols">
        <div className="stack">
          <section className="card" aria-labelledby="h-alerta" style={{ borderColor: stressDays.length ? 'var(--warn)' : undefined }}>
            <h2 id="h-alerta"><Droplets size={20} aria-hidden />{stressDays.length ? 'Atenção: falta de água leve hoje, com recarga prevista' : 'Sem alerta de água para os próximos dias'}</h2>
            <p>{stressDays.length ? <>Em {dShort(d0.date)} a soja deve receber um pouco menos de água do que precisa (déficit de <b>{n2s(d0.et_deficit_mm)} mm</b>). A previsão indica <b>{n0(rainTotal)} mm</b> de chuva até {dShort(last.date)}, levando a reserva de {pct(p.initial_state.available_water_fraction)} para <b>{pct(last.available_water_fraction)}</b> da capacidade.</> : 'A reserva de água projetada fica acima do nível de estresse em todos os dias servidos.'}</p>
            <dl className="kv kv--text">
              <dt>Motivo</dt><dd>Reserva em {pct(d0.available_water_fraction)} com chuva de {n1(d0.rain_mm)} mm e demanda (ET0) de {n1(d0.et0_mm)} mm</dd>
              <dt>Período</dt><dd>{stressDays.map((d) => dShort(d.date)).join(', ') || '—'}</dd>
              <dt>O que fazer</dt><dd>Acompanhar. Sem irrigação cadastrada; nenhuma operação é recomendada automaticamente.</dd>
              <dt>Incerteza</dt><dd>Erro médio da reserva no 1º dia: {n1(lead1.storage_mae_mm)} mm (climatologia: {n1(lead1.reference_storage_mae_mm)} mm). Verificado contra a própria série do provedor, não contra pluviômetros.</dd>
            </dl>
          </section>
          <section className="card" aria-labelledby="h-prev">
            <div className="row-between"><h2 id="h-prev"><CloudRain size={20} aria-hidden />Próximos {p.days.length} dias</h2><span className="meta-13">Emitida {dTime(p.forecast.issued_at)} · disponível {dTime(p.forecast.available_at)}</span></div>
            <div className="table-wrap" tabIndex={0} role="group" aria-label="Tabela; role para os lados se não couber na tela"><table>
              <thead><tr><th>Dia</th><th className="num">Chuva (mm)</th><th className="num">ET0 (mm)</th><th className="num">Reserva (mm)</th><th className="num">Reserva (%)</th><th>Água para a planta</th></tr></thead>
              <tbody>{p.days.map((d) => <tr key={d.date}><td><b>{dWeek(d.date)}</b> {dShort(d.date)}</td><td className="num">{n1(d.rain_mm)}</td><td className="num">{n1(d.et0_mm)}</td><td className="num">{n1(d.storage_end_mm)}</td><td className="num">{pct(d.available_water_fraction)}</td><td>{d.stress ? <Pill tone="warn">Abaixo do ideal</Pill> : <Pill tone="ok">Suficiente</Pill>}</td></tr>)}</tbody>
            </table></div>
            <PhaseTimeline series={series} labelA="Reserva prevista" labelB="Reserva na climatologia 2001–2021" ariaLabel="Chuva e reserva de água previstas" height={200} />
            <Notice tone="warn" title="Lacunas desta previsão.">Foram servidos {p.horizon_days_served} dos {p.horizon_days_requested} dias pedidos (a previsão ou o ciclo terminam antes). Temperatura mínima e máxima e probabilidade de chuva não fazem parte deste contrato e por isso não aparecem. Validade verificada até {p.max_validated_lead_days} dias à frente.</Notice>
            <Source meta={w.data.meta} extra={`Solo: classe ${p.soil.cad_class}, ${n0(p.soil.capacity_mm)} mm — hipótese fixa, não é perfil medido`} />
          </section>
          <section className="card" aria-labelledby="h-fase">
            <div className="row-between"><h2 id="h-fase"><Sprout size={20} aria-hidden />Déficit de água por fase da soja</h2><Pill tone="soil">Histórico · safra 2020/21</Pill></div>
            {daily.status === 'error' ? <ErrorState error={daily.error} onRetry={daily.retry} /> : !phaseDeficit ? <Loading /> :
              <div className="table-wrap" tabIndex={0} role="group" aria-label="Tabela; role para os lados se não couber na tela"><table><thead><tr><th>Fase</th><th className="num">Dias</th><th className="num">Dias com estresse</th><th className="num">Déficit (mm)</th></tr></thead><tbody>{Object.entries(phaseDeficit).map(([k, v]) => <tr key={k} data-highlight={k === d0.phase}><td>{STAGE[k]}{k === d0.phase && <span className="meta-13"> · fase atual</span>}</td><td className="num">{v.days}</td><td className="num">{v.stress}</td><td className="num">{n1(v.mm)}</td></tr>)}</tbody></table></div>}
            {daily.data && <Source meta={daily.data.meta} extra="Simulação histórica, não medição em fazenda" />}
          </section>
        </div>
        <aside className="stack" aria-label="Ações e contexto">
          <section className="card" aria-labelledby="h-res">
            <h2 id="h-res">Reserva de água no solo</h2>
            <Stat label={`Em ${dFull(p.initial_state.date)}`} value={pct(p.initial_state.available_water_fraction)} unit={`· ${n1(p.initial_state.storage_mm)} de ${n0(p.soil.capacity_mm)} mm`} />
            <div className="meter" role="img" aria-label={`Reserva em ${pct(p.initial_state.available_water_fraction)} da capacidade`}><i style={{ width: `${p.initial_state.available_water_fraction * 100}%` }} /></div>
            <p className="meta-13">Calculada a partir de {p.initial_state.observed_days} dias desde a semeadura ({p.initial_state.observed_source}).</p>
          </section>
          <Actions />
          <Upcoming upcoming={upcoming} plot={ctx.plot?.name} />
          <section className="card" aria-labelledby="h-rend">
            <div className="row-between"><h2 id="h-rend">Rendimento de referência</h2><Pill tone="soil">Retrospectivo</Pill></div>
            {y.status === 'error' ? <ErrorState error={y.error} onRetry={y.retry} /> : !y.data ? <Loading rows={2} /> : <>
              <Stat label={`Soja · município · colheita ${y.data.data.harvest_year}`} value={n0(y.data.data.estimate_kg_ha)} unit="kg/ha" note={`Erro de validação (MAE): ${n0(y.data.data.validation?.mae_kg_ha)} kg/ha — não é intervalo de confiança`} />
              <p className="meta-13">Estimativa municipal aos {y.data.data.cutoff_days_used} dias após a semeadura, modelo {modelLabel(y.data.data.model)} ({y.data.data.model.version}). Não é rendimento do seu talhão nem recomendação de plantio.</p>
              <ModelTest cohort="soy" scope={modelScope(y.data.data.model)} />
              <Source meta={y.data.meta} /></>}
          </section>
        </aside>
      </div>
    </div>
  );
}
function Actions() {
  return <section className="card" aria-labelledby="h-acoes">
    <h2 id="h-acoes">O que você quer fazer?</h2>
    <LinkBtn primary to="/planejar"><CalendarDays size={18} aria-hidden />Planejar plantio</LinkBtn>
    <LinkBtn to="/simulador"><Sprout size={18} aria-hidden />Acompanhar safra</LinkBtn>
    <LinkBtn to="/registros?novo=evento"><Tractor size={18} aria-hidden />Registrar atividade</LinkBtn>
    <LinkBtn to="/explorar"><Globe size={18} aria-hidden />Explorar uma região</LinkBtn>
  </section>;
}
function Upcoming({ upcoming, plot }: { upcoming?: FieldRecord; plot?: string }) {
  return <section className="card" aria-labelledby="h-prox">
    <h2 id="h-prox">Próxima atividade{plot ? ` · ${plot}` : ''}</h2>
    {upcoming ? <p><b>{upcoming.data.tipo ?? upcoming.kind}</b> em {dFull(upcoming.event_at)}</p> : <Empty title="Nenhuma atividade agendada">{plot ? `Registre plantio, manejo ou colheita do ${plot} para ver aqui o que vem a seguir.` : 'Registre plantio, manejo ou colheita para ver aqui o que vem a seguir.'}</Empty>}
  </section>;
}
const n2s = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

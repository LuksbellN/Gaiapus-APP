import { BatteryLow, Bell, Droplets } from 'lucide-react';
import { devices, weather } from '../adapters';
import { dShort, dTime, n1, pct } from '../format';
import { Empty, ErrorState, LinkBtn, Loading, Notice, Pill, Source, useAsync } from '../ui';

export function Devices() {
  const d = useAsync((s) => devices.list(s), []);
  return <div className="page"><div className="page-head"><div className="stack-2"><h1>Sondas de solo</h1><p>Umidade e temperatura do solo por talhão e profundidade.</p></div><Pill tone="warn">Dado sintético</Pill></div>
    <Notice tone="warn" title="Demonstração com telemetria sintética.">Nenhuma sonda real está conectada. As leituras abaixo foram geradas para testar a ingestão e não entram em modelos nem em alertas de decisão. Um modelo que use sensores depende de disponibilidade e validação informadas pelo backend.</Notice>
    {d.status === 'error' ? <ErrorState error={d.error} onRetry={d.retry} /> : !d.data ? <Loading rows={4} /> : d.data.data.length === 0 ? <Empty title="Nenhuma sonda cadastrada" /> : <div className="grid-auto">{d.data.data.map((x) => <section className="card" key={x.id} style={x.fault ? { borderColor: 'var(--risk)' } : undefined}><div className="row-between"><h2><Droplets size={18} aria-hidden />{x.name}</h2>{x.fault ? <Pill tone="risk">Com falha</Pill> : <Pill tone="ok">Operando</Pill>}</div>
      {x.fault && <Notice tone="risk"><BatteryLow size={0} aria-hidden />{x.fault}</Notice>}
      <dl className="kv"><dt>Talhão</dt><dd>{x.plot}</dd><dt>Profundidade</dt><dd>{x.depth_cm} cm</dd><dt>Umidade volumétrica</dt><dd>{x.vwc_pct == null ? 'sem leitura' : `${n1(x.vwc_pct)}%`}</dd><dt>Temperatura do solo</dt><dd>{x.soil_temp_c == null ? 'sem leitura' : `${n1(x.soil_temp_c)} °C`}</dd><dt>Última leitura</dt><dd>{dTime(x.last_reading_at)}</dd><dt>Bateria</dt><dd>{x.battery_pct}%</dd><dt>Sinal</dt><dd>{x.signal}</dd><dt>Calibração</dt><dd>{x.calibration}</dd></dl></section>)}</div>}
    {d.data && <Source meta={d.data.meta} />}</div>;
}
export function Alerts() {
  const w = useAsync((s) => weather.waterProjection('5107925', s), []);
  if (w.status === 'error') return <div className="page"><h1>Alertas</h1><ErrorState error={w.error} onRetry={w.retry} /></div>; if (!w.data) return <div className="page"><h1>Alertas</h1><Loading /></div>;
  const p = w.data.data; const stress = p.days.filter((d) => d.stress); const l = p.evaluation.by_lead[0];
  return <div className="page"><div className="page-head"><div className="stack-2"><h1>Alertas</h1><p>Só avisamos quando há evidência nos dados disponíveis. Cada alerta mostra motivo, período, fonte e incerteza.</p></div><Pill>Sorriso, MT · soja</Pill></div>
    {stress.length === 0 ? <Empty title="Sem alertas de água">A reserva projetada fica acima do nível de estresse nos próximos {p.days.length} dias.</Empty> : <section className="card" style={{ borderColor: 'var(--warn)' }}><div className="row-between"><h2><Bell size={18} aria-hidden />Água abaixo do ideal para a soja</h2><Pill tone="warn">Atenção · previsão</Pill></div>
      <dl className="kv" style={{ gridTemplateColumns: 'auto 1fr' }}>{[['Motivo', `Reserva em ${pct(stress[0].available_water_fraction)} da capacidade; déficit previsto de ${stress.reduce((a, d) => a + d.et_deficit_mm, 0).toLocaleString('pt-BR')} mm`], ['Período', stress.map((d) => dShort(d.date)).join(', ')], ['Fonte', `${p.forecast.provider} ${p.forecast.model}, emitida ${dTime(p.forecast.issued_at)}`], ['Ação', 'Acompanhar. A chuva prevista para os dias seguintes recompõe a reserva; nenhuma operação é recomendada automaticamente.'], ['Incerteza', `Erro médio da reserva com 1 dia de antecedência: ${n1(l.storage_mae_mm)} mm; acerto de estresse ${pct(l.stress_accuracy)}. Verificado contra a série do próprio provedor.`]].map(([k, v]) => <><dt key={k}>{k}</dt><dd key={k + 'v'} style={{ textAlign: 'left', fontWeight: 400 }}>{v}</dd></>)}</dl>
      <div className="row"><LinkBtn primary to="/visao-geral">Ver previsão completa</LinkBtn></div><Source meta={w.data.meta} /></section>}
    <section className="stack-2"><h2>Outros tipos de alerta</h2><Empty title="Sem alertas de geada, calor, pragas ou sondas">Esses alertas dependem de fontes ainda não conectadas (previsão de temperatura, monitoramento fitossanitário e sondas reais). Não geramos aviso sem dado.</Empty></section></div>;
}

// Componentes por cultura: resposta de rendimento, capacidades e situação científica.
// Tudo o que identifica modelo, versão, período e abrangência vem da resposta ou do artefato consultado.
import { crops, modelLabel, modelScope, type YieldEstimate } from '../adapters';
import type { Sourced } from '../adapters/core';
import { capabilities, CAP_STATUS } from '../capabilities';
import { CROPS, type CropId } from '../catalog';
import { dFull, n0, n1 } from '../format';
import { ErrorState, Loading, Notice, Pill, Source, Stat, useAsync } from './index';
import { MODEL, ModelTest } from './SealedTest';
import { fieldOf, useCoverageIndex } from '../geo/coverageIndex';

const BASIS: Record<string, string> = { hypothetical_fixed_calendar_per_state: 'calendário fixo hipotético do estado', coffee_production_year_start: 'início do ano de produção do café (não é plantio)' };
const MILESTONE: Record<string, string> = { pre_flowering: 'pré-florada', post_flowering: 'pós-florada', grain_filling: 'enchimento de grãos' };
const SCOPE = (s: string) => (s === 'national' ? 'Nacional' : s.replace('+', ' e '));

/** Uma resposta do contrato yield-estimate, com o modelo e o contexto que ela mesma declara. */
export function YieldCard({ r, place }: { r: Sourced<YieldEstimate>; place?: string }) {
  const d = r.data; const scope = modelScope(d.model); const coffee = CROPS[d.crop]?.group === 'cafe';
  return (
    <section className="card" data-testid="yield-card" data-crop={d.crop} data-mun={d.municipality_code} data-model={d.model.type} data-scope={scope}>
      <div className="row-between"><h2>{CROPS[d.crop]?.name ?? d.crop}{place ? ` — ${place}` : ''}</h2><Pill tone="soil">Exemplo retrospectivo</Pill></div>
      {d.status === 'ready' ? <Stat label={`Estimativa municipal · colheita ${d.harvest_year}`} value={n0(d.estimate_kg_ha)} unit="kg/ha" note={d.validation ? `MAE de validação ${n0(d.validation.mae_kg_ha)} kg/ha (${d.validation.years[0]}–${d.validation.years[d.validation.years.length - 1]}) — erro médio, não intervalo de previsão` : undefined} />
        : d.status === 'before_first_cutoff' ? <Notice tone="warn" title="Ainda sem estimativa.">Pedido no dia {d.days_after_sowing_requested} após a semeadura; o primeiro corte validado é o dia {d.supported_cutoffs_days[0]}. Isto é uma resposta normal do serviço, não um erro.</Notice>
          : d.status === 'outside_season' ? <Notice tone="warn" title="Fora da safra nesta data.">Nenhuma safra desta cultura está ativa em {d.as_of ? dFull(d.as_of) : 'a data pedida'}. Resposta normal do serviço, não um erro.</Notice>
            : <Notice tone="warn" title="Sem estimativa.">O serviço respondeu “{d.status}”.</Notice>}
      {d.model.type === 'reference' && <Notice>Para esta cultura nenhum modelo superou a referência simples na validação; o número acima é a própria referência histórica do município.</Notice>}
      <dl className="kv">
        <dt>Modelo</dt><dd>{modelLabel(d.model)}</dd>
        <dt>Versão</dt><dd>{d.model.version}{d.model.name ? ` · ${d.model.name}` : ''}</dd>
        <dt>Abrangência do modelo</dt><dd>{SCOPE(scope)}</dd>
        <dt>Escala do resultado</dt><dd>Município (IBGE {d.municipality_code})</dd>
        {d.as_of && <><dt>Data do pedido</dt><dd>{dFull(d.as_of)}</dd></>}
        <dt>{coffee ? 'Início do ano de produção' : 'Semeadura'}</dt><dd style={{ whiteSpace: 'normal' }}>{dFull(d.sowing_date)} · {BASIS[d.sowing_basis] ?? d.sowing_basis}</dd>
        <dt>{coffee ? 'Marco usado' : 'Corte usado'}</dt><dd>{d.milestone && MILESTONE[d.milestone] ? MILESTONE[d.milestone] : d.cutoff_days_used != null ? `dia ${d.cutoff_days_used}` : '—'}</dd>
        <dt>Observado até</dt><dd>{d.observed_through ? dFull(d.observed_through) : '—'}</dd>
        <dt>Treinado até a colheita</dt><dd>{d.model.trained_through_harvest}</dd>
        <dt>Uso operacional</dt><dd>{d.operational_release === 'released' ? 'Liberado' : 'Não liberado'}</dd>
      </dl>
      <ModelTest cohort={d.crop} scope={scope} />
      <Source meta={r.meta} />
    </section>
  );
}

/** Tabela de capacidades da cultura no território: cadastro, histórico, estimativa, água, imagem e 3D, cada uma com seu estado. */
export function CapabilityTable({ crop, mun, place }: { crop: CropId; mun: string | null; place?: string }) {
  const idx = useCoverageIndex(); const caps = capabilities(crop, mun, idx.index?.status === 'ok' && mun ? { field: !!fieldOf(idx.index, mun) } : {});
  return (
    <section className="card" aria-labelledby="h-caps" data-testid="capabilities" data-crop={crop}>
      <h2 id="h-caps">O que dá para fazer com {CROPS[crop].name.toLowerCase()}{place ? ` em ${place}` : ''}</h2>
      <ul className="caps">{caps.map((c) => <li key={c.id} data-cap={c.id} data-status={c.status}><div className="row-between"><b>{c.label}</b><Pill tone={CAP_STATUS[c.status].tone}>{CAP_STATUS[c.status].label}</Pill></div><p className="meta-13">{c.note}</p></li>)}</ul>
      <p className="meta-13">“Integração pendente” quer dizer que este frontend ainda não consegue consultar; não quer dizer que o município esteja fora da cobertura.</p>
    </section>
  );
}

const VSTATUS: Record<string, string> = { validated: 'Modelo escolhido superou as referências', reference_only: 'Nenhum modelo superou a referência simples' };
/** Situação científica em quatro partes, sem selo único: serviço, desenvolvimento, teste e uso operacional. */
export function ModelStatus({ crop }: { crop: CropId }) {
  const mx = useAsync((s) => crops.matrix(s), []); const ex = useAsync((s) => crops.yieldExamples({ crop }, s), [crop]);
  if (mx.status === 'error') return <ErrorState error={mx.error} onRetry={mx.retry} />;
  if (!mx.data || ex.status === 'loading') return <Loading rows={4} />;
  const r = mx.data.data.find((x) => x.cohort === crop); const served = [...new Set((ex.data ?? []).map((e) => `${modelLabel(e.data.model)} · ${e.data.model.version}`))];
  return (
    <div className="stack" data-testid="model-status" data-crop={crop}>
      <div className="stack-2"><h3>1. Modelo no serviço</h3><p className="meta">{served.length ? <>Nos exemplos do contrato: <b>{served.join('; ')}</b>. Não há serviço HTTP ligado a este frontend.</> : 'Sem resposta de exemplo para esta cultura neste frontend.'}</p></div>
      <hr className="divider" />
      <div className="stack-2"><div className="row-between"><h3>2. Desenvolvimento (2019–2021)</h3></div>
        {r ? <><dl className="kv"><dt>Escolha da validação</dt><dd style={{ whiteSpace: 'normal' }}>{MODEL[r.validation_choice] ?? (r.validation_choice.includes('reference') ? 'Referência histórica' : r.validation_choice)}</dd><dt>Erro médio (MAE)</dt><dd>{n0(r.recommended_mae)} kg/ha · {n1(r.recommended_mae_pct)}%</dd><dt>Rendimento médio</dt><dd>{n0(r.mean_yield_kg_ha)} kg/ha</dd><dt>Municípios</dt><dd>{r.municipalities}</dd><dt>Estados</dt><dd style={{ whiteSpace: 'normal', maxWidth: 170 }}>{r.states.join(', ')}</dd></dl><p className="meta-13">{VSTATUS[r.row.validation_status] ?? r.row.validation_status}. Validação walk-forward nacional; é resultado de desenvolvimento, não de teste.</p><Source meta={mx.data.meta} /></> : <p className="meta">Sem linha na matriz de validação.</p>}</div>
      <hr className="divider" />
      <div className="stack-2"><h3>3. Teste (2022–2024)</h3><ModelTest cohort={crop} scope="national" />{crop === 'soy' && <ModelTest cohort="soy" scope="MG+MT" />}</div>
      <hr className="divider" />
      <div className="stack-2"><div className="row-between"><h3>4. Uso operacional</h3><Pill tone="warn">Não liberado</Pill></div><p className="meta-13">Nenhuma cultura está liberada para decisão operacional: as datas de publicação das entradas e dos rótulos não foram verificadas. O número é referência municipal retrospectiva, não previsão para um talhão.</p></div>
    </div>
  );
}

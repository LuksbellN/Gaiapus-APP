// Componentes por cultura: resposta de rendimento, capacidades e situação científica.
// Tudo o que identifica modelo, versão, período e abrangência vem da resposta ou do artefato consultado.
import { crops, modelLabel, modelScope, type YieldEstimate } from '../adapters';
import type { Sourced } from '../adapters/core';
import { capabilities, CAP_STATUS } from '../capabilities';
import { CROPS, type CropId } from '../catalog';
import { dFull, n0, n1 } from '../format';
import { ErrorState, Loading, Notice, Pill, Source, Stat, useAsync } from './index';
import { MODEL, ModelTest } from './SealedTest';
import { translate, useI18n, type MessageKey } from '../i18n';
import { fieldOf, useCoverageIndex } from '../geo/coverageIndex';

const BASIS = ['hypothetical_fixed_calendar_per_state', 'coffee_production_year_start']; const MILESTONE = ['pre_flowering', 'post_flowering', 'grain_filling'];
const SCOPE = (s: string) => (s === 'national' ? translate('yieldCard.national') : s.replace('+', ` ${translate('yieldCard.and')} `));

/** Uma resposta do contrato yield-estimate, com o modelo e o contexto que ela mesma declara. */
export function YieldCard({ r, place }: { r: Sourced<YieldEstimate>; place?: string }) {
  const { t } = useI18n(); const d = r.data; const scope = modelScope(d.model); const coffee = CROPS[d.crop]?.group === 'cafe';
  return (
    <section className="card" data-testid="yield-card" data-crop={d.crop} data-mun={d.municipality_code} data-model={d.model.type} data-scope={scope}>
      <div className="row-between"><h2>{CROPS[d.crop]?.name ?? d.crop}{place ? ` — ${place}` : ''}</h2><Pill tone="soil">{t('kind.example')}</Pill></div>
      {d.status === 'ready' ? <Stat label={t('yieldCard.estimate', { year: d.harvest_year })} value={n0(d.estimate_kg_ha)} unit="kg/ha" note={d.validation ? t('yieldCard.mae', { mae: n0(d.validation.mae_kg_ha), from: d.validation.years[0], to: d.validation.years[d.validation.years.length - 1] }) : undefined} />
        : d.status === 'before_first_cutoff' ? <Notice tone="warn" title={t('yieldCard.beforeTitle')}>{t('yieldCard.before', { day: d.days_after_sowing_requested, first: d.supported_cutoffs_days[0] })}</Notice>
          : d.status === 'outside_season' ? <Notice tone="warn" title={t('yieldCard.outsideTitle')}>{t('yieldCard.outside', { date: d.as_of ? dFull(d.as_of) : t('yieldCard.requestedDate') })}</Notice>
            : <Notice tone="warn" title={t('yieldCard.noneTitle')}>{t('yieldCard.none', { status: d.status })}</Notice>}
      {d.model.type === 'reference' && <Notice>{t('yieldCard.reference')}</Notice>}
      <dl className="kv">
        <dt>{t('yieldCard.model')}</dt><dd>{modelLabel(d.model)}</dd>
        <dt>{t('yieldCard.version')}</dt><dd>{d.model.version}{d.model.name ? ` · ${d.model.name}` : ''}</dd>
        <dt>{t('yieldCard.scope')}</dt><dd>{SCOPE(scope)}</dd>
        <dt>{t('yieldCard.scale')}</dt><dd>{t('yieldCard.scaleValue', { code: d.municipality_code })}</dd>
        {d.as_of && <><dt>{t('yieldCard.asOf')}</dt><dd>{dFull(d.as_of)}</dd></>}
        <dt>{coffee ? t('yieldCard.productionStart') : t('yieldCard.sowing')}</dt><dd style={{ whiteSpace: 'normal' }}>{dFull(d.sowing_date)} · {BASIS.includes(d.sowing_basis) ? t(`yieldCard.basis.${d.sowing_basis}` as MessageKey) : d.sowing_basis}</dd>
        <dt>{coffee ? t('yieldCard.milestone') : t('yieldCard.cutoff')}</dt><dd>{d.milestone && MILESTONE.includes(d.milestone) ? t(`yieldCard.milestones.${d.milestone}` as MessageKey) : d.cutoff_days_used != null ? t('yieldCard.day', { day: d.cutoff_days_used }) : '—'}</dd>
        <dt>{t('yieldCard.observedThrough')}</dt><dd>{d.observed_through ? dFull(d.observed_through) : '—'}</dd>
        <dt>{t('yieldCard.trainedThrough')}</dt><dd>{d.model.trained_through_harvest}</dd>
        <dt>{t('yieldCard.operational')}</dt><dd>{d.operational_release === 'released' ? t('yieldCard.released') : t('kind.notReleased')}</dd>
      </dl>
      <ModelTest cohort={d.crop} scope={scope} />
      <Source meta={r.meta} />
    </section>
  );
}

/** Tabela de capacidades da cultura no território: cadastro, histórico, estimativa, água, imagem e 3D, cada uma com seu estado. */
export function CapabilityTable({ crop, mun, place }: { crop: CropId; mun: string | null; place?: string }) {
  const { t } = useI18n(); const idx = useCoverageIndex(); const caps = capabilities(crop, mun, idx.index?.status === 'ok' && mun ? { field: !!fieldOf(idx.index, mun) } : {});
  return (
    <section className="card" aria-labelledby="h-caps" data-testid="capabilities" data-crop={crop}>
      <h2 id="h-caps">{place ? t('caps.titlePlace', { crop: CROPS[crop].name, place }) : t('caps.title', { crop: CROPS[crop].name })}</h2>
      <ul className="caps">{caps.map((c) => <li key={c.id} data-cap={c.id} data-status={c.status}><div className="row-between"><b>{c.label}</b><Pill tone={CAP_STATUS[c.status].tone}>{CAP_STATUS[c.status].label}</Pill></div><p className="meta-13">{c.note}</p></li>)}</ul>
      <p className="meta-13">{t('caps.pendingNote')}</p>
    </section>
  );
}

const VSTATUS = ['validated', 'reference_only'];
/** Situação científica em quatro partes, sem selo único: serviço, desenvolvimento, teste e uso operacional. */
export function ModelStatus({ crop }: { crop: CropId }) {
  const { t } = useI18n(); const mx = useAsync((s) => crops.matrix(s), []); const ex = useAsync((s) => crops.yieldExamples({ crop }, s), [crop]);
  if (mx.status === 'error') return <ErrorState error={mx.error} onRetry={mx.retry} />;
  if (!mx.data || ex.status === 'loading') return <Loading rows={4} />;
  const r = mx.data.data.find((x) => x.cohort === crop); const served = [...new Set((ex.data ?? []).map((e) => `${modelLabel(e.data.model)} · ${e.data.model.version}`))];
  return (
    <div className="stack" data-testid="model-status" data-crop={crop}>
      <div className="stack-2"><h3>{t('modelStatus.service')}</h3><p className="meta">{served.length ? <>{t('modelStatus.servedIn')} <b>{served.join('; ')}</b>. {t('modelStatus.noHttp')}</> : t('modelStatus.noExample')}</p></div>
      <hr className="divider" />
      <div className="stack-2"><div className="row-between"><h3>{t('modelStatus.development')}</h3></div>
        {r ? <><dl className="kv"><dt>{t('modelStatus.choice')}</dt><dd style={{ whiteSpace: 'normal' }}>{MODEL[r.validation_choice] ?? (r.validation_choice.includes('reference') ? t('modelStatus.reference') : r.validation_choice)}</dd><dt>{t('modelStatus.mae')}</dt><dd>{n0(r.recommended_mae)} kg/ha · {n1(r.recommended_mae_pct)}%</dd><dt>{t('modelStatus.meanYield')}</dt><dd>{n0(r.mean_yield_kg_ha)} kg/ha</dd><dt>{t('modelStatus.municipalities')}</dt><dd>{r.municipalities}</dd><dt>{t('modelStatus.states')}</dt><dd style={{ whiteSpace: 'normal', maxWidth: 170 }}>{r.states.join(', ')}</dd></dl><p className="meta-13">{VSTATUS.includes(r.row.validation_status) ? t(`modelStatus.vstatus.${r.row.validation_status}` as MessageKey) : r.row.validation_status}. {t('modelStatus.walkForward')}</p><Source meta={mx.data.meta} /></> : <p className="meta">{t('modelStatus.noRow')}</p>}</div>
      <hr className="divider" />
      <div className="stack-2"><h3>{t('modelStatus.test')}</h3><ModelTest cohort={crop} scope="national" />{crop === 'soy' && <ModelTest cohort="soy" scope="MG+MT" />}</div>
      <hr className="divider" />
      <div className="stack-2"><div className="row-between"><h3>{t('modelStatus.operational')}</h3><Pill tone="warn">{t('kind.notReleased')}</Pill></div><p className="meta-13">{t('modelStatus.operationalText')}</p></div>
    </div>
  );
}

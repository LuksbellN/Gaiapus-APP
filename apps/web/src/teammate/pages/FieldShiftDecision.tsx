// Field Shift v2 — producer priority and decision cards. The priority reorders what is read first; it never changes
// weather, model or results. Every sentence with a number takes it from the package; no agronomic effect is invented.
import type { FieldShiftPackage } from '../adapters';
import { dFull, nMax, signed } from '../format';
import { useI18n, type MessageKey } from '../i18n';
import { Notice, Pill, Seg } from '../ui';
import { buildComparison, PRIORITIES, STRATEGIES, type MetricId, type Priority, type PrioritySource, type PublishedComparison, type StrategyId } from '../sim/field-shift-decision';
import { useStrategyNames } from './FieldShiftStrategies';

type Line = 'covered' | 'reserve' | 'use' | 'drain' | 'soy' | 'maize';
const LINES: Record<Priority, Line[]> = {
  conservacao: ['covered', 'reserve', 'use', 'drain', 'soy', 'maize'],
  producao: ['soy', 'maize', 'reserve', 'covered', 'use', 'drain'],
  margem: ['maize', 'soy', 'covered', 'reserve', 'use', 'drain'],
};
const LINE_METRIC: Record<Exclude<Line, 'maize'>, MetricId> = { covered: 'covered_days', reserve: 'storage_at_next_sowing_mm', use: 'year_water_use_mm', drain: 'year_drainage_mm', soy: 'soy_deficit_mm' };

export function PriorityPicker({ priority, source, planDate, onChange }: { priority: Priority; source: PrioritySource; planDate: string | null; onChange: (p: Priority) => void }) {
  const { t } = useI18n();
  return (
    <section className="card" data-testid="fs-priority" data-priority={priority} data-source={source}>
      <Seg legend={t('fieldShift.v2.priority.legend')} name="prioridade" value={priority} onChange={onChange} options={PRIORITIES.map((p) => ({ value: p, label: t(`options.priority.${p}` as MessageKey) }))} />
      <p className="meta-13">
        {source === 'plan' && planDate ? `${t('fieldShift.v2.priority.fromPlan', { date: dFull(planDate) })} ` : source === 'default' ? `${t('fieldShift.v2.priority.default')} ` : source === 'plan_missing' ? `${t('fieldShift.v2.priority.planMissing')} ` : ''}
        {t('fieldShift.v2.priority.effect')}{priority === 'producao' ? ` ${t('fieldShift.v2.priority.production')}` : ''}
      </p>
      {priority === 'margem' && <div data-testid="fs-margin"><Notice title={t('fieldShift.v2.margin.title')}>{t('fieldShift.v2.margin.text')} <a href="#/planejar">{t('fieldShift.v2.margin.link')}</a></Notice></div>}
    </section>
  );
}

/** One card per strategy: why, evidence, what the simulation shows (ordered by the priority), gaps and risks to review on site. */
export function StrategyCards({ pkg, input, reference, priority }: { pkg: FieldShiftPackage; input: PublishedComparison; reference: StrategyId; priority: Priority }) {
  const { t } = useI18n(); const names = useStrategyNames();
  const view = buildComparison(input, reference); const x = pkg.summary; const row = (k: MetricId) => view.rows.find((r) => r.metric === k)!;
  const years = x.weather.agricultural_years;
  const noStraw = x.sensitivity.parameters.find((p) => p.parameter === 'straw_factor' && Number(p.value) === 1)?.comparisons.brachiaria_minus_reference_fallow.next_soy_establishment_deficit_mm.mean ?? null;
  const note = (s: StrategyId, k: MetricId, unit: string) => {
    const d = row(k).deltas[s];
    return s === reference || !d || d.mean == null ? t('fieldShift.v2.card.isRef') : t('fieldShift.v2.card.vs', { delta: `${signed(Math.abs(d.mean) < 0.05 ? 0 : d.mean, 1)} ${unit}`, ref: names.letter(reference) });
  };
  const line = (s: StrategyId, l: Line) => {
    const mean = input.scenarios[s].mean;
    if (l === 'maize') return mean.maize_deficit_mm == null ? t('fieldShift.v2.card.maizeNone') : t('fieldShift.v2.card.maizeLine', { value: nMax(mean.maize_deficit_mm, 1), days: nMax(mean.maize_stress_days, 1) });
    const k = LINE_METRIC[l]; const value = nMax(mean[k], 1);
    if (l === 'soy') return t('fieldShift.v2.card.soyLine', { value, note: note(s, k, 'mm'), days: nMax(mean.soy_stress_days, 1) });
    return t(`fieldShift.v2.card.${l}Line` as MessageKey, { value, note: note(s, k, l === 'covered' ? t('common.days') : 'mm') });
  };
  return (
    <div className="grid-3" data-testid="fs-cards" data-priority={priority}>
      {STRATEGIES.map((s) => (
        <article key={s} className="card stack-2" data-strategy={s} data-reference={s === reference || undefined}>
          <h3>{names.full(s)} {s === reference && <Pill>{t('fieldShift.v2.card.isRef')}</Pill>}</h3>
          <p className="meta-13">{t(`fieldShift.v2.sequence.${s}` as MessageKey)}</p>
          <div><h4 className="meta">{t('fieldShift.v2.card.why')}</h4><p>{t(`fieldShift.v2.why.${s}` as MessageKey)}</p></div>
          <div data-part="benefits"><h4 className="meta">{t('fieldShift.v2.card.benefits')}</h4><ul className="plain stack-2">{LINES[priority].map((l) => <li key={l} data-line={l}>{line(s, l)}</li>)}</ul></div>
          <div><h4 className="meta">{t('fieldShift.v2.card.evidence')}</h4><p className="meta-13">{t('fieldShift.v2.card.evidenceText', { n: input.scenarios[s].valid_years, first: years[0], last: years[years.length - 1], mm: nMax(x.soil.capacity_mm, 0) })}</p></div>
          <div data-part="gaps"><h4 className="meta">{t('fieldShift.v2.card.gaps')}</h4><p className="meta-13">{t(`fieldShift.v2.gap.${s}` as MessageKey, { factor: nMax(x.hypotheses.central.straw_factor, 2), noStraw: noStraw == null ? '—' : nMax(noStraw, 2) })}</p></div>
          <div data-part="risks"><h4 className="meta">{t('fieldShift.v2.card.risks')}</h4><p className="meta-13">{t(`fieldShift.v2.risk.${s}` as MessageKey)}</p></div>
        </article>
      ))}
    </div>
  );
}

const ASPECTS = ['nematodes', 'nitrogen', 'carbon', 'weeds', 'erosion'] as const;
/** Qualitative agronomic aspects: only what has an applicable source is stated; everything else says "not assessed". */
export function AgronomyMatrix() {
  const { t } = useI18n(); const names = useStrategyNames();
  return (
    <section className="card" data-testid="fs-matrix"><h2>{t('fieldShift.v2.matrix.title')}</h2><p className="meta">{t('fieldShift.v2.matrix.intro')}</p>
      <div className="table-wrap" tabIndex={0} role="group" aria-label={t('common.tableScroll')}><table><thead><tr><th>{t('fieldShift.v2.matrix.aspect')}</th>{STRATEGIES.map((s) => <th key={s}>{names.full(s)}</th>)}</tr></thead>
        <tbody>{ASPECTS.map((a) => <tr key={a} data-aspect={a}><td>{t(`fieldShift.v2.matrix.rows.${a}` as MessageKey)}</td>{STRATEGIES.map((s) => <td key={s} className="meta-13">{t('fieldShift.v2.matrix.notAssessed')}</td>)}</tr>)}</tbody></table></div>
      <p className="meta-13">{t('fieldShift.v2.matrix.nematodes')} <a href="https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1120353/1/CT17111022020.pdf" rel="noreferrer" target="_blank">Embrapa</a></p>
      <p className="meta-13">{t('fieldShift.v2.matrix.nitrogen')}</p>
      <p className="meta-13">{t('fieldShift.v2.matrix.erosionLink')}</p>
    </section>
  );
}

// Resultado do teste selado 2022–2024 (data/frozen/test_2022_2024_v7.json): aberto uma única vez
// após o congelamento. Cada resultado pertence a um modelo e a um recorte; os componentes abaixo
// sempre dizem qual, para que o número do MLP regional não apareça sob o Ridge nacional (e vice-versa).
import { crops, type SealedResult } from '../adapters';
import { CROP, n0, n1, signed } from '../format';
import { translate, useI18n } from '../i18n';
import { ErrorState, Loading, Pill, Source, useAsync } from './index';

const OUTCOME: Record<string, { key: 'confirmed' | 'not_confirmed' | 'worse_than_history'; tone: 'ok' | 'warn' | 'risk' }> = {
  confirmed: { key: 'confirmed', tone: 'ok' }, not_confirmed: { key: 'not_confirmed', tone: 'warn' }, worse_than_history: { key: 'worse_than_history', tone: 'risk' },
};
export const MODEL: Record<string, string> = { 'site+ridge': 'Ridge', 'site+hgb': 'HGB (gradient boosting)', 'site+mlp': 'MLP', 'weather+mlp': 'MLP', 'hydro+mlp': 'MLP' };
const modelName = (m: string | null | undefined) => (m ? MODEL[m] ?? (m.includes('reference') ? translate('sealed.reference') : m) : translate('sealed.chosen'));
const scopeName = (s: string) => s.replace('+', ` ${translate('yieldCard.and')} `);

function Row({ title, r }: { title: string; r: SealedResult }) {
  const { t } = useI18n(); const o = OUTCOME[r.outcome] ?? OUTCOME.not_confirmed;
  return (
    <div className="stack-2">
      <div className="row-between"><h3>{title}</h3><Pill tone={o.tone}>{t(`sealed.outcome.${o.key}`)}</Pill></div>
      <dl className="kv">
        <dt>{t('sealed.modelMae')}</dt><dd>{n1(r.mae_kg_ha)} kg/ha</dd>
        <dt>{t('sealed.historyMae')}</dt><dd>{n1(r.history_mae_kg_ha)} kg/ha</dd>
        <dt>{t('sealed.diff')}</dt><dd>{t('sealed.diffValue', { diff: signed(r.difference_vs_history_kg_ha), lo: signed(r.ci95[0]), hi: signed(r.ci95[1]) })}</dd>
        {r.harvests != null && <><dt>{t('sealed.harvests')}</dt><dd>{n0(r.harvests)} · {n0(r.municipalities)}</dd></>}
      </dl>
      <p className="meta-13">{t(`sealed.outcomeText.${o.key}`)}</p>
    </div>
  );
}
/** Lista por cultura: uma linha por modelo e recorte (nacional e, quando existir, regional). */
export function SealedTest({ cohorts }: { cohorts: string[] }) {
  const { t: tr } = useI18n(); const t = useAsync((s) => crops.sealedTest(s), []);
  if (t.status === 'error') return <ErrorState error={t.error} onRetry={t.retry} />;
  if (!t.data) return <Loading label={tr('sealed.loading')} rows={3} />;
  const d = t.data.data;
  const rows = cohorts.flatMap((c) => { const x = d.crops[c]; if (!x) return []; return [...(x.national ? [{ key: c, title: tr('sealed.national', { crop: CROP[c] ?? c, model: modelName(x.national.model) }), r: x.national as SealedResult }] : []), ...x.regional.map((r) => ({ key: `${c}-${r.scope}`, title: tr('sealed.regional', { crop: CROP[c] ?? c, model: modelName(r.model), scope: scopeName(r.scope) }), r: r as SealedResult }))]; });
  return (
    <div className="stack" data-testid="sealed-test">
      <p className="meta">{tr('sealed.intro', { from: d.years[0], to: d.years[d.years.length - 1] })}</p>
      {rows.length === 0 ? <p className="meta">{tr('sealed.none')}</p> : rows.map((x, i) => <div key={x.key} className="stack-2">{i > 0 && <hr className="divider" />}<Row title={x.title} r={x.r} /></div>)}
      <Source meta={t.data.meta} />
    </div>
  );
}
/** Nota curta para ficar dentro do cartão de UM modelo: o resultado do teste daquele modelo, naquele recorte. */
export function ModelTest({ cohort, scope }: { cohort: string; scope: 'national' | string }) {
  const { t: tr } = useI18n(); const t = useAsync((s) => crops.sealedTest(s), []);
  if (!t.data) return null;
  const x = t.data.data.crops[cohort]; const r = scope === 'national' ? x?.national : x?.regional.find((y) => y.scope === scope);
  if (!r) return <p className="meta-13" data-testid="model-test" data-scope={scope}>{tr('sealed.noResult')}</p>;
  const o = OUTCOME[r.outcome] ?? OUTCOME.not_confirmed; const y = t.data.data.years;
  return (
    <div className="model-test" data-testid="model-test" data-scope={scope} data-outcome={r.outcome}>
      <div className="row"><span className="meta-13"><b>{tr('sealed.testOf', { from: y[0], to: y[y.length - 1] })}</b> · {scope === 'national' ? (r.municipalities ? tr('sealed.nationalSetN', { count: n0(r.municipalities) }) : tr('sealed.nationalSet')) : tr('sealed.only', { scope: scopeName(scope) })}</span><Pill tone={o.tone}>{tr(`sealed.outcome.${o.key}`)}</Pill></div>
      <p className="meta-13">{tr(scope === 'national' ? 'sealed.summaryNational' : 'sealed.summaryRegional', { model: modelName(r.model), mae: n1(r.mae_kg_ha), hist: n1(r.history_mae_kg_ha), diff: signed(r.difference_vs_history_kg_ha), lo: signed(r.ci95[0]), hi: signed(r.ci95[1]) })}</p>
    </div>
  );
}

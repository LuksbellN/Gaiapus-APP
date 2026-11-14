// Resultado do teste selado 2022–2024 (data/frozen/test_2022_2024_v7.json): aberto uma única vez
// após o congelamento. Cada resultado pertence a um modelo e a um recorte; os componentes abaixo
// sempre dizem qual, para que o número do MLP regional não apareça sob o Ridge nacional (e vice-versa).
import { crops, type SealedResult } from '../adapters';
import { CROP, n1, signed } from '../format';
import { ErrorState, Loading, Pill, Source, useAsync } from './index';

const OUTCOME: Record<string, { label: string; tone: 'ok' | 'warn' | 'risk'; text: string }> = {
  confirmed: { label: 'Ganho confirmado', tone: 'ok', text: 'Errou menos que o histórico ajustado; o intervalo da diferença não inclui zero.' },
  not_confirmed: { label: 'Ganho não confirmado', tone: 'warn', text: 'A diferença para o histórico ajustado inclui zero: não dá para afirmar que o modelo é melhor.' },
  worse_than_history: { label: 'Pior que a referência', tone: 'risk', text: 'Errou mais que o histórico ajustado neste teste.' },
};
export const MODEL: Record<string, string> = { 'site+ridge': 'Ridge', 'site+hgb': 'HGB (gradient boosting)', 'site+mlp': 'MLP', 'weather+mlp': 'MLP', 'hydro+mlp': 'MLP' };
const modelName = (m: string | null | undefined) => (m ? MODEL[m] ?? (m.includes('reference') ? 'referência histórica' : m) : 'modelo escolhido na validação');
const scopeName = (s: string) => s.replace('+', ' e ');

function Row({ title, r }: { title: string; r: SealedResult }) {
  const o = OUTCOME[r.outcome] ?? OUTCOME.not_confirmed;
  return (
    <div className="stack-2">
      <div className="row-between"><h3>{title}</h3><Pill tone={o.tone}>{o.label}</Pill></div>
      <dl className="kv">
        <dt>Erro do modelo (MAE)</dt><dd>{n1(r.mae_kg_ha)} kg/ha</dd>
        <dt>Erro do histórico ajustado</dt><dd>{n1(r.history_mae_kg_ha)} kg/ha</dd>
        <dt>Diferença (IC 95%)</dt><dd>{signed(r.difference_vs_history_kg_ha)} ({signed(r.ci95[0])} a {signed(r.ci95[1])})</dd>
        {r.harvests != null && <><dt>Colheitas · municípios</dt><dd>{r.harvests.toLocaleString('pt-BR')} · {r.municipalities?.toLocaleString('pt-BR')}</dd></>}
      </dl>
      <p className="meta-13">{o.text}</p>
    </div>
  );
}
/** Lista por cultura: uma linha por modelo e recorte (nacional e, quando existir, regional). */
export function SealedTest({ cohorts }: { cohorts: string[] }) {
  const t = useAsync((s) => crops.sealedTest(s), []);
  if (t.status === 'error') return <ErrorState error={t.error} onRetry={t.retry} />;
  if (!t.data) return <Loading label="Carregando resultado do teste 2022–2024…" rows={3} />;
  const d = t.data.data;
  const rows = cohorts.flatMap((c) => { const x = d.crops[c]; if (!x) return []; return [...(x.national ? [{ key: c, title: `${CROP[c] ?? c} · ${modelName(x.national.model)} nacional`, r: x.national as SealedResult }] : []), ...x.regional.map((r) => ({ key: `${c}-${r.scope}`, title: `${CROP[c] ?? c} · ${modelName(r.model)} regional (${scopeName(r.scope)})`, r: r as SealedResult }))]; });
  return (
    <div className="stack" data-testid="sealed-test">
      <p className="meta">Colheitas de {d.years[0]} a {d.years[d.years.length - 1]}, escala municipal, pacote v7. Modelos e regra regional congelados antes de abrir o teste; avaliado uma única vez, sem nova escolha.</p>
      {rows.length === 0 ? <p className="meta">Sem resultado de teste para esta cultura.</p> : rows.map((x, i) => <div key={x.key} className="stack-2">{i > 0 && <hr className="divider" />}<Row title={x.title} r={x.r} /></div>)}
      <Source meta={t.data.meta} />
    </div>
  );
}
/** Nota curta para ficar dentro do cartão de UM modelo: o resultado do teste daquele modelo, naquele recorte. */
export function ModelTest({ cohort, scope }: { cohort: string; scope: 'national' | string }) {
  const t = useAsync((s) => crops.sealedTest(s), []);
  if (!t.data) return null;
  const x = t.data.data.crops[cohort]; const r = scope === 'national' ? x?.national : x?.regional.find((y) => y.scope === scope);
  if (!r) return <p className="meta-13" data-testid="model-test" data-scope={scope}>Teste 2022–2024: sem resultado publicado para este modelo.</p>;
  const o = OUTCOME[r.outcome] ?? OUTCOME.not_confirmed; const y = t.data.data.years;
  return (
    <div className="model-test" data-testid="model-test" data-scope={scope} data-outcome={r.outcome}>
      <div className="row"><span className="meta-13"><b>Teste {y[0]}–{y[y.length - 1]} deste modelo</b> · {scope === 'national' ? `conjunto nacional${r.municipalities ? `, ${r.municipalities.toLocaleString('pt-BR')} municípios` : ''}` : `só ${scopeName(scope)}`}</span><Pill tone={o.tone}>{o.label}</Pill></div>
      <p className="meta-13">{modelName(r.model)} {scope === 'national' ? 'nacional' : 'regional'}: erro médio de {n1(r.mae_kg_ha)} kg/ha contra {n1(r.history_mae_kg_ha)} kg/ha do histórico ajustado (diferença {signed(r.difference_vs_history_kg_ha)}, IC 95% {signed(r.ci95[0])} a {signed(r.ci95[1])}).{scope === 'national' ? ' Mesma configuração congelada, reajustada a cada ano; o resultado é do conjunto nacional e não uma avaliação deste município.' : ''}</p>
    </div>
  );
}

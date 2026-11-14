import { useState } from 'react';
import { simulations, weather } from '../adapters';
import { n0, n1, n2, signed } from '../format';
import { ErrorState, LinkBtn, Loading, Notice, Pill, Source, Stat, useAsync } from '../ui';
import { PhaseTimeline } from '../ui/PhaseTimeline';

const METRICS: [string, string, string, number][] = [['covered_days', 'Dias com solo coberto', 'dias', 0], ['storage_at_next_sowing_mm', 'Reserva de água antes da próxima soja', 'mm', 1], ['off_season_water_use_mm', 'Água usada na entressafra', 'mm', 1], ['off_season_drainage_mm', 'Água drenada na entressafra', 'mm', 1], ['soy_deficit_mm', 'Déficit da soja', 'mm', 2], ['next_soy_establishment_deficit_mm', 'Déficit na implantação da próxima soja', 'mm', 2], ['maize_deficit_mm', 'Déficit do milho safrinha', 'mm', 1], ['maize_stress_days', 'Dias de estresse do milho', 'dias', 1]];
const PARAM: Record<string, string> = { cover_kc: 'Kc da braquiária', straw_factor: 'Fator de palhada (1,0 = sem efeito)', cad_class: 'Classe de solo', soy_shift_days: 'Semeadura da soja (dias)' };
const NOT: Record<string, string> = { yield: 'rendimento', 'soil carbon': 'carbono do solo', infiltration: 'infiltração', weeds: 'plantas daninhas', nitrogen: 'nitrogênio' };

export function FieldShiftPage() {
  const f = useAsync((s) => simulations.fieldShift('5107925', s), []); const d = useAsync((s) => weather.dailySeries('5107925', s), []); const [year, setYear] = useState('2020/2021');
  if (f.status === 'error') return <div className="page"><h1>Field Shift</h1><ErrorState error={f.error} onRetry={f.retry} /></div>; if (!f.data) return <div className="page"><h1>Field Shift</h1><Loading rows={6} /></div>;
  const x = f.data.data; const ref = x.scenarios.reference_fallow.mean as Record<string, number>, bra = x.scenarios.brachiaria.mean as Record<string, number>, diff = x.difference_brachiaria_minus_reference as Record<string, number>;
  const A = d.data?.data.scenarios.reference_fallow, B = d.data?.data.scenarios.brachiaria; const a = A ? A.agricultural_year.indexOf(year) : 0, b = A ? A.agricultural_year.lastIndexOf(year) + 1 : 0;
  const noStraw = x.sensitivity.find((s) => s.parameter === 'straw_factor' && Number(s.value) === 1);
  return (
    <div className="page">
      <div className="page-head"><div className="stack-2"><h1>Field Shift — Sorriso, MT</h1><p>O que muda na água do solo se, depois do milho safrinha, a área ficar com braquiária em vez de pousio?</p></div><div className="row"><Pill tone="warn">Simulação histórica</Pill><Pill>6 safras · 2015/16 a 2020/21</Pill></div></div>
      <div className="grid-3">
        <div className="card"><Stat label="Solo coberto" value={signed(diff.covered_days, 0)} unit="dias por ano" note={`${n0(ref.covered_days)} → ${n0(bra.covered_days)} dias`} /></div>
        <div className="card"><Stat label="Reserva antes da próxima soja" value={signed(diff.storage_at_next_sowing_mm, 2)} unit="mm" note={`${n1(ref.storage_at_next_sowing_mm)} → ${n1(bra.storage_at_next_sowing_mm)} mm · praticamente igual`} /></div>
        <div className="card"><Stat label="Déficit na implantação da soja" value={signed(diff.next_soy_establishment_deficit_mm, 2)} unit="mm" note="Só aparece com a hipótese de palhada" /></div>
      </div>
      <Notice tone="warn" title="O benefício depende de uma hipótese.">A redução de déficit vem do fator de palhada assumido ({x.hypotheses.central.straw_factor.toLocaleString('pt-BR')}). Sem efeito de palhada (fator 1,0), a diferença no déficit de implantação é {n2(noStraw?.difference_next_soy_establishment_deficit_mm)} mm. {x.evidence === 'Simulation under stated hypotheses; no field measurement of these effects in Sorriso.' ? 'Não há medição de campo desses efeitos em Sorriso.' : x.evidence}</Notice>
      <section className="card"><div className="row-between"><h2>Comparação — média das 6 safras</h2><span className="meta-13">A: soja → milho → pousio · B: soja → milho + braquiária</span></div>
        <div className="table-wrap" tabIndex={0} role="group" aria-label="Tabela; role para os lados se não couber na tela"><table><thead><tr><th>Indicador</th><th className="num">A · Pousio</th><th className="num">B · Braquiária</th><th className="num">B − A</th></tr></thead><tbody>{METRICS.map(([k, label, unit, dgt]) => <tr key={k}><td>{label} <span className="meta-13">({unit})</span></td><td className="num">{ref[k].toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td><td className="num">{bra[k].toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td><td className="num"><b>{signed(diff[k], Math.max(dgt, 1))}</b></td></tr>)}<tr><td>Efeito no rendimento</td><td className="num" colSpan={3}>Não avaliado — indisponível</td></tr></tbody></table></div>
        <p className="meta">Não foram simulados: {x.not_simulated.map((k) => NOT[k] ?? k).join(', ')}. A braquiária usa mais água na entressafra ({signed(diff.off_season_water_use_mm)} mm) e reduz a drenagem ({signed(diff.off_season_drainage_mm)} mm).</p>
        <Source meta={f.data.meta} extra={`Solo ${x.soil.cad_class}, ${n0(x.soil.capacity_mm)} mm — hipótese fixa`} /></section>
      <section className="card"><div className="row-between"><h2>Dia a dia — {year}</h2><label className="row meta">Ano agrícola<select className="input" style={{ width: 'auto' }} value={year} onChange={(e) => setYear(e.target.value)}>{x.weather.agricultural_years.map((y) => <option key={y}>{y}</option>)}</select></label></div>
        {d.status === 'error' ? <ErrorState error={d.error} onRetry={d.retry} /> : !A || !B ? <Loading /> : <PhaseTimeline series={{ dates: A.date.slice(a, b), rain: A.rain_mm.slice(a, b), storage: A.storage_end_mm.slice(a, b), storageB: B.storage_end_mm.slice(a, b), stage: A.stage.slice(a, b), land: A.land_cover.slice(a, b), landB: B.land_cover.slice(a, b), deficit: A.et_deficit_mm.slice(a, b), capacity: x.soil.capacity_mm }} labelA="Reserva A · pousio" labelB="Reserva B · braquiária" ariaLabel={`Reserva de água nos dois cenários em ${year}`} height={220} />}
        <div className="row"><LinkBtn primary to="/simulador">Abrir no simulador</LinkBtn></div></section>
      <section className="card"><h2>Sensibilidade às hipóteses</h2><p className="meta">Cada linha muda uma hipótese por vez. Valores são B − A, média das 6 safras.</p>
        <div className="table-wrap" tabIndex={0} role="group" aria-label="Tabela; role para os lados se não couber na tela"><table><thead><tr><th>Hipótese</th><th>Valor</th><th className="num">Reserva na semeadura (mm)</th><th className="num">Déficit da soja (mm)</th><th className="num">Déficit na implantação (mm)</th><th className="num">Água usada na entressafra (mm)</th></tr></thead><tbody>{x.sensitivity.map((s, i) => <tr key={i} data-highlight={s.parameter === 'straw_factor' && Number(s.value) === 1}><td>{PARAM[s.parameter]}</td><td>{typeof s.value === 'number' ? signedIf(s.parameter, s.value) : s.value}</td><td className="num">{signed(s.difference_storage_at_next_sowing_mm, 2)}</td><td className="num">{signed(s.difference_soy_deficit_mm, 2)}</td><td className="num">{signed(s.difference_next_soy_establishment_deficit_mm, 2)}</td><td className="num">{signed(s.difference_off_season_water_use_mm, 2)}</td></tr>)}</tbody></table></div>
        <p className="meta-13">Hipótese central: Kc da cobertura {x.hypotheses.central.cover_kc.toLocaleString('pt-BR')} ({x.hypotheses.sources.cover_kc}); palhada {x.hypotheses.central.straw_factor.toLocaleString('pt-BR')}; pousio com Kc 0,30.</p></section>
    </div>
  );
}
const signedIf = (p: string, v: number) => (p === 'soy_shift_days' ? signed(v, 0) : v.toLocaleString('pt-BR'));

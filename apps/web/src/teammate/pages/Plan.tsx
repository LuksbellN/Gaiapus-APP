import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { simulations } from '../adapters';
import { useActiveContext } from '../App';
import { SORRISO } from '../capabilities';
import { CROPS, cropIdFromName, isCoffee, isCropId, PLANTABLE, type CropId } from '../catalog';
import { money, n0, n1, n2, signed } from '../format';
import { now, setState, uid, useStore } from '../store';
import { ErrorState, Field, Loading, Notice, Pill, Seg, Source, Stat, useAsync } from '../ui';
import { CapabilityTable, ModelStatus } from '../ui/Crops';
import { num, numError, useDraftForm } from '../ui/form';
import { economics, isPriceUnit, PRICE_UNIT_LABEL, type PriceUnit } from '../units';

const SHIFT: Record<string, string> = { '-15': '20 de setembro (15 dias antes)', '0': '5 de outubro (calendário de referência)', '15': '20 de outubro (15 dias depois)' };
const PLACE: Record<string, string> = { '5107925': 'Sorriso, MT', '3170206': 'Uberlândia, MG' };

export function PlanPage() {
  const [params, setParams] = useSearchParams(); const ctx = useActiveContext(); const nav = useNavigate(); const plans = useStore((s) => s.plans); const [msg, setMsg] = useState(''); const [allPlans, setAllPlans] = useState(false); const fromPlan = params.get('plano');
  // Território: o da URL, senão o da propriedade em uso, senão a demonstração de Sorriso (identificada).
  const urlMun = /^\d{7}$/.test(params.get('mun') ?? '') ? params.get('mun')! : null; const mun = urlMun ?? ctx.property?.municipalityCode ?? SORRISO; const demo = !urlMun && !ctx.property;
  const place = ctx.property?.municipalityCode === mun ? `${ctx.property.municipalityName}, ${ctx.property.uf}` : PLACE[mun] ?? `município IBGE ${mun}`;
  const f = useDraftForm('plano', { cultura_id: '', data: '0', area: '', irrigacao: 'Sequeiro', solo: 'Não sei', prioridade: 'conservacao', rendimento: '', precoUnidade: 'saca', saca: '', forma: 'Beneficiado', preco: '', precoData: '', precoFonte: '', custo: '' });
  const v = f.v;
  const loadedPlan = useRef<string | null>(null);
  useEffect(() => { const p = fromPlan ? plans.find((x) => x.id === fromPlan) : null; if (p && loadedPlan.current !== p.id) { loadedPlan.current = p.id; f.load(p.data); } }, [fromPlan]); // eslint-disable-line
  // Rascunhos e planos antigos guardavam só o nome ("Soja", "Milho safrinha", "Café"). "Café" não diz a espécie: pedimos o complemento.
  const crop: CropId | null = isCropId(v.cultura_id) ? v.cultura_id : v.cultura ? cropIdFromName(v.cultura) : 'soy'; const pendingCrop = crop == null;
  const fsd = useAsync((s) => (crop === 'soy' && mun === SORRISO ? simulations.fieldShift(SORRISO, s) : Promise.resolve(null)), [crop, mun]);
  const unit: PriceUnit = isPriceUnit(v.precoUnidade) ? v.precoUnidade : 'saca'; const coffee = isCoffee(crop);
  const eco = economics({ yieldKgHa: num(v.rendimento), areaHa: num(v.area), price: num(v.preco), priceUnit: unit, sackKg: num(v.saca), costPerHa: num(v.custo), priceDate: v.precoData });
  const shifts = fsd.data ? [...fsd.data.data.sensitivity.filter((s) => s.parameter === 'soy_shift_days'), { value: 0, reference_storage_at_next_sowing_mm: fsd.data.data.scenarios.reference_fallow.mean.storage_at_next_sowing_mm, difference_next_soy_establishment_deficit_mm: fsd.data.data.difference_brachiaria_minus_reference.next_soy_establishment_deficit_mm } as (typeof fsd.data.data.sensitivity)[number]].sort((a, b) => Number(a.value) - Number(b.value)) : [];
  const save = (open: boolean) => {
    if (!crop) { setMsg('Escolha a cultura antes de salvar.'); return; }
    const id = uid('plano'); setState((s) => ({ plans: [{ id, createdAt: now(), data: { ...v, cultura_id: crop, cultura: CROPS[crop].name, municipio: mun, municipio_nome: place } }, ...s.plans] })); setMsg('Planejamento salvo neste aparelho.');
    if (open) nav(`/simulador?cultura=${crop}&mun=${mun}&plano=${id}`);
  };
  return (
    <div className="page">
      <div className="page-head"><div className="stack-2"><h1>Planejar plantio</h1><p>Cadastre o plano de qualquer cultura. As análises aparecem só onde há dados e suporte científico; onde faltar, dizemos o que falta.</p></div><Pill>{place}{demo ? ' · demonstração' : fromPlan ? ' · do plano salvo' : urlMun ? '' : ' · do talhão em uso'}</Pill></div>
      <div className="cols">
        <div className="stack">
          <form className="card" onSubmit={(e) => { e.preventDefault(); save(false); }} aria-labelledby="h-plano"><h2 id="h-plano">Seu plano</h2>
            {pendingCrop && <Notice tone="warn" title="Complete a cultura.">Este plano foi salvo como “{v.cultura}”, sem dizer a espécie ou a safra. Escolha abaixo para continuar; o restante foi mantido.</Notice>}
            <div className="form-grid">
              <Field label="Cultura" hint={crop && CROPS[crop].role !== 'Cultura' ? CROPS[crop].role : undefined}>{(a) => <select className="input" {...a} name="cultura" value={crop ?? ''} onChange={(e) => f.set('cultura_id', e.target.value)}>{pendingCrop && <option value="" disabled>Escolha a cultura…</option>}{PLANTABLE.map((id) => <option key={id} value={id}>{CROPS[id].name}</option>)}</select>}</Field>
              <Field label="Área (ha)" error={numError(v.area)}>{(a) => <input className="input" inputMode="decimal" autoComplete="off" {...a} {...f.bind('area')} />}</Field>
              <Field label="Irrigação">{(a) => <select className="input" {...a} {...f.bind('irrigacao')}><option>Sequeiro</option><option>Irrigado</option></select>}</Field>
              <Field label="Solo">{(a) => <select className="input" {...a} {...f.bind('solo')}>{['Não sei', 'Arenoso', 'Médio', 'Argiloso'].map((o) => <option key={o}>{o}</option>)}</select>}</Field>
            </div>
            <Seg legend="O que pesa mais na decisão" name="prioridade" value={v.prioridade} onChange={(x) => f.set('prioridade', x)} options={[{ value: 'margem', label: 'Margem' }, { value: 'producao', label: 'Produção' }, { value: 'conservacao', label: 'Conservar solo e água' }]} />
            <p className="meta-13">A prioridade fica registrada no plano; ela não altera as comparações nem os cálculos abaixo.</p>
            {v.irrigacao === 'Irrigado' && <Notice tone="warn">Ainda não há método validado para o efeito da irrigação; as comparações valem para sequeiro.</Notice>}
            {coffee && <Notice title="Café é cultura perene.">Três meses após o plantio não são um ciclo até a primeira colheita. Registre em <a href="#/registros?novo=plantio">Registros</a> a espécie, a idade do cafezal e a última poda; o planejamento abaixo vale para a safra do cafezal em produção.</Notice>}
          </form>
          <section className="card" aria-labelledby="h-datas" data-testid="plan-dates"><div className="row-between"><h2 id="h-datas">Comparar datas de semeadura</h2>{crop === 'soy' && mun === SORRISO ? <Pill tone="warn">Simulação histórica · 6 safras</Pill> : <Pill>Sem comparação nesta combinação</Pill>}</div>
            {!(crop === 'soy' && mun === SORRISO) ? <Notice>A comparação de datas existe hoje só para a <b>soja em Sorriso, MT</b> (simulação histórica do pacote v7). Ela não é reaproveitada para {crop ? CROPS[crop].name.toLowerCase() : 'outra cultura'}{mun !== SORRISO ? ` nem para ${place}` : ''}. O que falta: série diária do balanço hídrico e calendário de fases desta cultura neste município.</Notice>
              : fsd.status === 'error' ? <ErrorState error={fsd.error} onRetry={fsd.retry} /> : !fsd.data ? <Loading /> : <>
                <fieldset><legend className="sr-only">Data de semeadura</legend><div className="table-wrap" tabIndex={0} role="group" aria-label="Tabela; role para os lados se não couber na tela"><table><thead><tr><th>Escolher</th><th>Semeadura</th><th className="num">Reserva de água na semeadura (mm)</th><th className="num">Efeito da braquiária no déficit de implantação (mm)</th></tr></thead><tbody>{shifts.map((s) => <tr key={s.value} data-highlight={String(s.value) === v.data}><td><input type="radio" name="data" aria-label={SHIFT[String(s.value)]} checked={String(s.value) === v.data} onChange={() => f.set('data', String(s.value))} style={{ width: 20, height: 20, accentColor: 'var(--action)' }} /></td><td>{SHIFT[String(s.value)]}</td><td className="num"><b>{n1(s.reference_storage_at_next_sowing_mm)}</b> de 55</td><td className="num">{signed(s.difference_next_soy_establishment_deficit_mm, 2)}</td></tr>)}</tbody></table></div></fieldset>
                <p><b>Por quê:</b> semeando 15 dias antes, o solo começa com cerca de {n0(shifts[0].reference_storage_at_next_sowing_mm)} mm de reserva (em média), contra {n0(shifts[1].reference_storage_at_next_sowing_mm)} mm na data de referência. Isto descreve a água no solo; <b>não é uma recomendação automática de plantio</b>.</p>
                <p className="meta"><b>O que falta para comparar melhor:</b> efeito no rendimento (não avaliado), perfil de solo medido, previsão sazonal e zoneamento agrícola oficial.</p>
                <Source meta={fsd.data.meta} extra="scenario/sensitivity.csv" /></>}
          </section>
          <section className="card" aria-labelledby="h-eco" data-testid="plan-eco"><div className="row-between"><h2 id="h-eco">Margem estimada</h2><Pill>Números informados por você</Pill></div><p className="meta">Receita = rendimento (kg/ha) × área (ha) × preço (R$/kg). Nenhum preço nem rendimento é preenchido por nós, e a estimativa do modelo não entra neste cálculo.</p>
            <div className="form-grid">
              <Field label="Rendimento esperado (kg/ha)" error={numError(v.rendimento)} hint={coffee ? 'Seu número, na mesma forma do café usada no preço.' : 'Seu próprio número, por exemplo da última safra.'}>{(a) => <input className="input" inputMode="decimal" autoComplete="off" {...a} {...f.bind('rendimento')} />}</Field>
              {coffee && <Field label="Forma do café" hint="Rendimento e preço precisam estar na mesma forma; não convertemos entre cereja, coco e beneficiado.">{(a) => <select className="input" {...a} {...f.bind('forma')}>{['Cereja', 'Coco', 'Beneficiado'].map((o) => <option key={o}>{o}</option>)}</select>}</Field>}
              <Field label="Unidade do preço">{(a) => <select className="input" {...a} {...f.bind('precoUnidade')}>{(Object.keys(PRICE_UNIT_LABEL) as PriceUnit[]).map((u) => <option key={u} value={u}>{PRICE_UNIT_LABEL[u]}</option>)}</select>}</Field>
              {unit === 'saca' && <Field label="Peso da saca (kg)" error={numError(v.saca)} hint="Informe o peso usado na sua negociação; não supomos 60 kg.">{(a) => <input className="input" inputMode="decimal" autoComplete="off" {...a} {...f.bind('saca')} />}</Field>}
              <Field label={`Preço (${PRICE_UNIT_LABEL[unit]})`} error={numError(v.preco)}>{(a) => <input className="input" inputMode="decimal" autoComplete="off" {...a} {...f.bind('preco')} />}</Field>
              <Field label="Data do preço">{(a) => <input className="input" type="date" max="2100-12-31" {...a} {...f.bind('precoData')} />}</Field>
              <Field label="Fonte do preço" optional>{(a) => <input className="input" autoComplete="off" {...a} {...f.bind('precoFonte')} placeholder="Ex.: cooperativa…" />}</Field>
              <Field label="Custo total (R$/ha)" error={numError(v.custo)} hint="Para a mesma área e a mesma safra.">{(a) => <input className="input" inputMode="decimal" autoComplete="off" {...a} {...f.bind('custo')} />}</Field>
            </div>
            <div className="grid-2" aria-live="polite">
              <Stat label="Receita bruta" value={eco.revenue == null ? '—' : money(eco.revenue)} note={eco.revenue != null ? `${n0(num(v.rendimento))} kg/ha × ${v.area} ha × R$ ${n2(eco.priceKg)}/kg${unit === 'saca' ? ` (saca de ${v.saca} kg)` : unit === 't' ? ' (preço por tonelada ÷ 1.000)' : ''}${coffee ? ` · café ${v.forma.toLowerCase()}` : ''}` : undefined} />
              <Stat label="Margem" value={eco.margin == null ? '—' : money(eco.margin)} note={eco.margin != null ? `Receita − R$ ${v.custo}/ha × ${v.area} ha · preço de ${v.precoData.split('-').reverse().join('/')}${v.precoFonte ? ` (${v.precoFonte})` : ''}` : `Falta: ${eco.missing.join(', ')}.`} />
            </div>
          </section>
          {msg && <p role="status" className="notice notice--water"><span />{msg}</p>}
          <div className="row"><button className="btn btn--primary" onClick={() => save(true)}>Salvar e abrir no simulador</button><button className="btn" onClick={() => save(false)}>Salvar planejamento</button></div>
          {plans.length > 0 && <section className="card" data-testid="plans"><h2>Planejamentos salvos ({plans.length})</h2><ul className="list">{(allPlans ? plans : plans.slice(0, 5)).map((p) => <li key={p.id}><button onClick={() => { f.load(p.data); setParams({ ...(/^\d{7}$/.test(p.data.municipio ?? '') ? { mun: p.data.municipio } : {}), plano: p.id }); setMsg(p.data.cultura_pendente && !isCropId(p.data.cultura_id) ? 'Planejamento reaberto. Complete a cultura.' : 'Planejamento reaberto.'); scrollTo(0, 0); }}><span>{isCropId(p.data.cultura_id) ? CROPS[p.data.cultura_id].name : `${p.data.cultura} (completar cultura)`} · {p.data.municipio_nome ?? 'Sorriso, MT'} · {p.data.area || '—'} ha</span><span className="meta-13">{new Date(p.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span></button></li>)}</ul>{!allPlans && plans.length > 5 && <div><button className="btn btn--sm" onClick={() => setAllPlans(true)}>Mostrar todos ({plans.length})</button></div>}</section>}
        </div>
        <div className="stack">
          {crop && <CapabilityTable crop={crop} mun={mun} place={place} />}
          <aside className="card" aria-labelledby="h-cob"><h2 id="h-cob">Situação científica{crop ? ` — ${CROPS[crop].name.toLowerCase()}` : ''}</h2><p className="meta">Estimativa de rendimento na escala do município. Quatro coisas diferentes: o modelo que o serviço usa, o resultado de desenvolvimento, o resultado de teste e a liberação para uso.</p>
            {crop ? <ModelStatus crop={crop} key={crop} /> : <p className="meta">Escolha a cultura para ver a situação do modelo.</p>}
            {crop === 'coffee_arabica' && <><hr className="divider" /><h3>Análise agregada: Café total MG</h3><p className="meta-13">Coorte estatística de Minas Gerais usada só em análises agregadas; não é espécie plantável e não aparece no cadastro.</p><ModelStatus crop="coffee_total_mg" /></>}
          </aside>
        </div>
      </div>
    </div>
  );
}

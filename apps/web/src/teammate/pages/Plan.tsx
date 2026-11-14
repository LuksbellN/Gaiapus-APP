import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { simulations } from '../adapters';
import { useActiveContext } from '../App';
import { SORRISO } from '../capabilities';
import { CROPS, cropIdFromName, isCoffee, isCropId, PLANTABLE, PT_NAME, type CropId, isPlainCrop } from '../catalog';
import { dDateTime, dNumeric, money, n0, n1, n2, signed } from '../format';
import { now, setState, uid, useStore } from '../store';
import { placeName } from '../context';
import { useI18n } from '../i18n';
import { choice, codesOf, legacyLabel, optionLabel, type OptionField } from '../options';
import { ErrorState, Field, Loading, Notice, Pill, Seg, Source, Stat, useAsync } from '../ui';
import { CapabilityTable, ModelStatus } from '../ui/Crops';
import { num, numError, useDraftForm } from '../ui/form';
import { economics, isPriceUnit, PRICE_UNIT_LABEL, type PriceUnit } from '../units';

const SHIFTS = ['-15', '0', '15'] as const;

export function PlanPage() {
  const { t, tn } = useI18n();
  const [params, setParams] = useSearchParams(); const ctx = useActiveContext(); const nav = useNavigate(); const plans = useStore((s) => s.plans); const [msg, setMsg] = useState(''); const [allPlans, setAllPlans] = useState(false); const fromPlan = params.get('plano');
  // Território: o da URL, senão o da propriedade em uso, senão a demonstração de Sorriso (identificada).
  const urlMun = /^\d{7}$/.test(params.get('mun') ?? '') ? params.get('mun')! : null; const mun = urlMun ?? ctx.property?.municipalityCode ?? SORRISO; const demo = !urlMun && !ctx.property;
  const place = placeName(mun, ctx);
  // Choice fields keep a stable code plus the Portuguese label read by older versions (options.ts).
  const f = useDraftForm('plano', { cultura_id: '', data: '0', area: '', irrigacao: 'Sequeiro', irrigacao_code: 'rainfed', solo: 'Não sei', solo_code: 'unknown', prioridade: 'conservacao', rendimento: '', precoUnidade: 'saca', saca: '', forma: 'Beneficiado', forma_code: 'green', preco: '', precoData: '', precoFonte: '', custo: '' });
  const v = f.v; const nl = f.locale;
  const pick = (field: OptionField, code: string) => { f.set(`${field}_code`, code); f.set(field, legacyLabel(field, code)); };
  const loadedPlan = useRef<string | null>(null);
  useEffect(() => { const p = fromPlan ? plans.find((x) => x.id === fromPlan) : null; if (p && loadedPlan.current !== p.id) { loadedPlan.current = p.id; f.load(p.data); } }, [fromPlan]); // eslint-disable-line
  // Rascunhos e planos antigos guardavam só o nome ("Soja", "Milho safrinha", "Café"). "Café" não diz a espécie: pedimos o complemento.
  const crop: CropId | null = isCropId(v.cultura_id) ? v.cultura_id : v.cultura ? cropIdFromName(v.cultura) : 'soy'; const pendingCrop = crop == null;
  const fsd = useAsync((s) => (crop === 'soy' && mun === SORRISO ? simulations.fieldShift(SORRISO, s) : Promise.resolve(null)), [crop, mun]);
  const unit: PriceUnit = isPriceUnit(v.precoUnidade) ? v.precoUnidade : 'saca'; const coffee = isCoffee(crop);
  const eco = economics({ yieldKgHa: num(v.rendimento, nl), areaHa: num(v.area, nl), price: num(v.preco, nl), priceUnit: unit, sackKg: num(v.saca, nl), costPerHa: num(v.custo, nl), priceDate: v.precoData });
  const shifts = fsd.data ? [...fsd.data.data.sensitivity.filter((s) => s.parameter === 'soy_shift_days'), { value: 0, reference_storage_at_next_sowing_mm: fsd.data.data.scenarios.reference_fallow.mean.storage_at_next_sowing_mm, difference_next_soy_establishment_deficit_mm: fsd.data.data.difference_brachiaria_minus_reference.next_soy_establishment_deficit_mm } as (typeof fsd.data.data.sensitivity)[number]].sort((a, b) => Number(a.value) - Number(b.value)) : [];
  const save = (open: boolean) => {
    if (!crop) { setMsg(t('plan.msg.chooseCrop')); return; }
    const id = uid('plano'); setState((s) => ({ plans: [{ id, createdAt: now(), data: { ...v, cultura_id: crop, cultura: PT_NAME[crop], municipio: mun, municipio_nome: place } }, ...s.plans] })); setMsg(t('plan.msg.saved'));
    if (open) nav(`/simulador?cultura=${crop}&mun=${mun}&plano=${id}`);
  };
  const shiftLabel = (value: string) => t(`plan.shift.${value === '-15' ? 'before' : value === '15' ? 'after' : 'reference'}`);
  const irrigated = choice(v, 'irrigacao') === 'irrigated';
  return (
    <div className="page">
      <div className="page-head"><div className="stack-2"><h1>{t('plan.title')}</h1><p>{t('plan.subtitle')}</p></div><Pill>{place}{demo ? ` · ${t('plan.origin.demo')}` : fromPlan ? ` · ${t('plan.origin.plan')}` : urlMun ? '' : ` · ${t('plan.origin.plot')}`}</Pill></div>
      <div className="cols">
        <div className="stack">
          <form className="card" onSubmit={(e) => { e.preventDefault(); save(false); }} aria-labelledby="h-plano"><h2 id="h-plano">{t('plan.form.title')}</h2>
            {pendingCrop && <Notice tone="warn" title={t('plan.form.pendingTitle')}>{t('plan.form.pending', { name: v.cultura })}</Notice>}
            <div className="form-grid">
              <Field label={t('crops.label')} hint={crop && !isPlainCrop(crop) ? CROPS[crop].role : undefined}>{(a) => <select className="input" {...a} name="cultura" value={crop ?? ''} onChange={(e) => f.set('cultura_id', e.target.value)}>{pendingCrop && <option value="" disabled>{t('plan.form.chooseCrop')}</option>}{PLANTABLE.map((id) => <option key={id} value={id}>{CROPS[id].name}</option>)}</select>}</Field>
              <Field label={t('plan.form.area')} error={numError(v.area, nl)}>{(a) => <input className="input" inputMode="decimal" autoComplete="off" {...a} {...f.bind('area')} />}</Field>
              <Field label={t('plan.form.irrigation')}>{(a) => <select className="input" {...a} value={choice(v, 'irrigacao')} onChange={(e) => pick('irrigacao', e.target.value)}>{codesOf('irrigacao').map((c) => <option key={c} value={c}>{optionLabel('irrigacao', c)}</option>)}</select>}</Field>
              <Field label={t('plan.form.soil')}>{(a) => <select className="input" {...a} value={choice(v, 'solo')} onChange={(e) => pick('solo', e.target.value)}>{codesOf('solo').map((c) => <option key={c} value={c}>{optionLabel('solo', c)}</option>)}</select>}</Field>
            </div>
            <Seg legend={t('plan.form.priority')} name="prioridade" value={v.prioridade} onChange={(x) => f.set('prioridade', x)} options={(['margem', 'producao', 'conservacao'] as const).map((value) => ({ value, label: t(`options.priority.${value}`) }))} />
            <p className="meta-13">{t('plan.form.priorityNote')}</p>
            {irrigated && <Notice tone="warn">{t('plan.form.irrigatedNote')}</Notice>}
            {coffee && <Notice title={t('plan.form.coffeeTitle')}>{tn('plan.form.coffee', { link: <a href="#/registros?novo=plantio">{t('nav.item.registros')}</a> })}</Notice>}
          </form>
          <section className="card" aria-labelledby="h-datas" data-testid="plan-dates"><div className="row-between"><h2 id="h-datas">{t('plan.dates.title')}</h2>{crop === 'soy' && mun === SORRISO ? <Pill tone="warn">{t('plan.dates.pill')}</Pill> : <Pill>{t('plan.dates.nonePill')}</Pill>}</div>
            {!(crop === 'soy' && mun === SORRISO) ? <Notice>{tn('plan.dates.none', { combo: <b>{t('plan.dates.combo')}</b>, crop: crop ? CROPS[crop].name : t('plan.dates.otherCrop'), place: mun !== SORRISO ? t('plan.dates.norPlace', { place }) : '' })}</Notice>
              : fsd.status === 'error' ? <ErrorState error={fsd.error} onRetry={fsd.retry} /> : !fsd.data ? <Loading /> : <>
                <fieldset><legend className="sr-only">{t('plan.dates.legend')}</legend><div className="table-wrap" tabIndex={0} role="group" aria-label={t('common.tableScroll')}><table><thead><tr><th>{t('plan.dates.choose')}</th><th>{t('plan.dates.sowing')}</th><th className="num">{t('plan.dates.reserve')}</th><th className="num">{t('plan.dates.effect')}</th></tr></thead><tbody>{shifts.map((s) => <tr key={s.value} data-highlight={String(s.value) === v.data}><td><input type="radio" name="data" aria-label={shiftLabel(String(s.value))} checked={String(s.value) === v.data} onChange={() => f.set('data', String(s.value))} style={{ width: 20, height: 20, accentColor: 'var(--action)' }} /></td><td>{shiftLabel(String(s.value))}</td><td className="num"><b>{n1(s.reference_storage_at_next_sowing_mm)}</b> {t('plan.dates.of', { cap: 55 })}</td><td className="num">{signed(s.difference_next_soy_establishment_deficit_mm, 2)}</td></tr>)}</tbody></table></div></fieldset>
                <p>{tn('plan.dates.why', { label: <b>{t('plan.dates.whyLabel')}</b>, early: n0(shifts[0].reference_storage_at_next_sowing_mm), reference: n0(shifts[1].reference_storage_at_next_sowing_mm), notRecommendation: <b>{t('plan.dates.notRecommendation')}</b> })}</p>
                <p className="meta">{tn('plan.dates.missing', { label: <b>{t('plan.dates.missingLabel')}</b> })}</p>
                <Source meta={fsd.data.meta} extra="scenario/sensitivity.csv" /></>}
          </section>
          <section className="card" aria-labelledby="h-eco" data-testid="plan-eco"><div className="row-between"><h2 id="h-eco">{t('plan.eco.title')}</h2><Pill>{t('plan.eco.pill')}</Pill></div><p className="meta">{t('plan.eco.formula')}</p>
            <div className="form-grid">
              <Field label={t('plan.eco.yield')} error={numError(v.rendimento, nl)} hint={coffee ? t('plan.eco.yieldHintCoffee') : t('plan.eco.yieldHint')}>{(a) => <input className="input" inputMode="decimal" autoComplete="off" {...a} {...f.bind('rendimento')} />}</Field>
              {coffee && <Field label={t('plan.eco.coffeeForm')} hint={t('plan.eco.coffeeFormHint')}>{(a) => <select className="input" {...a} value={choice(v, 'forma')} onChange={(e) => pick('forma', e.target.value)}>{codesOf('forma').map((c) => <option key={c} value={c}>{optionLabel('forma', c)}</option>)}</select>}</Field>}
              <Field label={t('plan.eco.unit')}>{(a) => <select className="input" {...a} {...f.bind('precoUnidade')}>{(['saca', 'kg', 't'] as PriceUnit[]).map((u) => <option key={u} value={u}>{PRICE_UNIT_LABEL[u]}</option>)}</select>}</Field>
              {unit === 'saca' && <Field label={t('plan.eco.sack')} error={numError(v.saca, nl)} hint={t('plan.eco.sackHint')}>{(a) => <input className="input" inputMode="decimal" autoComplete="off" {...a} {...f.bind('saca')} />}</Field>}
              <Field label={t('plan.eco.price', { unit: PRICE_UNIT_LABEL[unit] })} error={numError(v.preco, nl)}>{(a) => <input className="input" inputMode="decimal" autoComplete="off" {...a} {...f.bind('preco')} />}</Field>
              <Field label={t('plan.eco.priceDate')}>{(a) => <input className="input" type="date" max="2100-12-31" {...a} {...f.bind('precoData')} />}</Field>
              <Field label={t('plan.eco.priceSource')} optional>{(a) => <input className="input" autoComplete="off" {...a} {...f.bind('precoFonte')} placeholder={t('plan.eco.priceSourcePh')} />}</Field>
              <Field label={t('plan.eco.cost')} error={numError(v.custo, nl)} hint={t('plan.eco.costHint')}>{(a) => <input className="input" inputMode="decimal" autoComplete="off" {...a} {...f.bind('custo')} />}</Field>
            </div>
            <div className="grid-2" aria-live="polite">
              <Stat label={t('plan.eco.revenue')} value={eco.revenue == null ? '—' : money(eco.revenue)} note={eco.revenue != null ? `${t('plan.eco.revenueNote', { yield: n0(num(v.rendimento, nl)), area: v.area, priceKg: n2(eco.priceKg) })}${unit === 'saca' ? ` ${t('plan.eco.sackNote', { kg: v.saca })}` : unit === 't' ? ` ${t('plan.eco.tonNote')}` : ''}${coffee ? ` · ${optionLabel('forma', choice(v, 'forma'))}` : ''}` : undefined} />
              <Stat label={t('plan.eco.margin')} value={eco.margin == null ? '—' : money(eco.margin)} note={eco.margin != null ? `${t('plan.eco.marginNote', { cost: v.custo, area: v.area, date: v.precoData ? dNumeric(v.precoData) : '—' })}${v.precoFonte ? ` (${v.precoFonte})` : ''}` : t('plan.eco.missing', { list: eco.missing.map((m) => t(`plan.missing.${m}` as 'plan.missing.area')).join(', ') })} />
            </div>
          </section>
          {msg && <p role="status" className="notice notice--water"><span />{msg}</p>}
          <div className="row"><button className="btn btn--primary" onClick={() => save(true)}>{t('plan.saveOpen')}</button><button className="btn" onClick={() => save(false)}>{t('plan.save')}</button></div>
          {plans.length > 0 && <section className="card" data-testid="plans"><h2>{t('plan.saved.title', { count: plans.length })}</h2><ul className="list">{(allPlans ? plans : plans.slice(0, 5)).map((p) => <li key={p.id}><button onClick={() => { f.load(p.data); setParams({ ...(/^\d{7}$/.test(p.data.municipio ?? '') ? { mun: p.data.municipio } : {}), plano: p.id }); setMsg(p.data.cultura_pendente && !isCropId(p.data.cultura_id) ? t('plan.msg.reopenedPending') : t('plan.msg.reopened')); scrollTo(0, 0); }}><span>{isCropId(p.data.cultura_id) ? CROPS[p.data.cultura_id].name : t('plan.saved.pending', { name: p.data.cultura })} · {/^\d{7}$/.test(p.data.municipio ?? '') ? placeName(p.data.municipio, ctx) : p.data.municipio_nome ?? placeName(SORRISO)} · {p.data.area || '—'} ha</span><span className="meta-13">{dDateTime(p.createdAt)}</span></button></li>)}</ul>{!allPlans && plans.length > 5 && <div><button className="btn btn--sm" onClick={() => setAllPlans(true)}>{t('plan.saved.all', { count: plans.length })}</button></div>}</section>}
        </div>
        <div className="stack">
          {crop && <CapabilityTable crop={crop} mun={mun} place={place} />}
          <aside className="card" aria-labelledby="h-cob"><h2 id="h-cob">{crop ? t('crops.statusTitle', { crop: CROPS[crop].name }) : t('plan.status.title')}</h2><p className="meta">{t('plan.status.intro')}</p>
            {crop ? <ModelStatus crop={crop} key={crop} /> : <p className="meta">{t('plan.status.chooseCrop')}</p>}
            {crop === 'coffee_arabica' && <><hr className="divider" /><h3>{t('plan.status.cohortTitle')}</h3><p className="meta-13">{t('plan.status.cohort')}</p><ModelStatus crop="coffee_total_mg" /></>}
          </aside>
        </div>
      </div>
    </div>
  );
}

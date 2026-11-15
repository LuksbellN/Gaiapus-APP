import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Plus, Sprout, Tractor } from 'lucide-react';
import { geography, seasons, type Place } from '../adapters';
import { dFull, money, n0, n1 } from '../format';
import { isPersistent, setState, useStore, type FieldRecord, type RecordKind } from '../store';
import { Dialog, Empty, Field, LinkBtn, Notice, Pill, Stat } from '../ui';
import { num, numError, toKg, useDraftForm } from '../ui/form';
import { cropIdFromName, cropOptionLabel, isAmbiguousCropName, isCoffee, PT_NAME, RECORD_CROP_OPTIONS } from '../catalog';
import { translate, useI18n } from '../i18n';
import { choice, codesOf, legacyLabel, optionLabel, type OptionField } from '../options';

const KIND_IDS: RecordKind[] = ['plantio', 'evento', 'colheita', 'venda'];
const kindLabel = (k: RecordKind) => translate(`records.kind.${k}`);
function LocalNote() {
  const { t } = useI18n(); const ok = isPersistent();
  return <Notice tone={ok ? 'info' : 'risk'} title={ok ? t('records.local.title') : t('records.local.blockedTitle')}>{ok ? t('records.local.text') : t('records.local.blocked')}</Notice>;
}

export function Properties() {
  const { t } = useI18n();
  const [params] = useSearchParams(); const props = useStore((s) => s.properties); const plots = useStore((s) => s.plots); const active = useStore((s) => s.activePlotId);
  const pf = useDraftForm('propriedade', { name: '', municipalityCode: params.get('mun') ?? '', municipalityName: params.get('nome') ?? '', uf: params.get('uf') ?? '', areaHa: '' });
  const tf = useDraftForm('talhao', { propertyId: '', name: '', areaHa: '', soil: 'Não sei', irrigation: 'Sequeiro', polygon: '' });
  const [err, setErr] = useState<Record<string, string>>({}); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [q, setQ] = useState(''); const [res, setRes] = useState<Place[]>([]);
  useEffect(() => { let on = true; if (q.length >= 2) geography.search(q).then((r) => on && setRes(r.places.filter((x) => x.type === 'municipio' && /^\d{7}$/.test(x.code)).slice(0, 6))).catch(() => on && setRes([])); else setRes([]); return () => { on = false; }; }, [q]);
  useEffect(() => { if (params.get('mun')) { pf.set('municipalityCode', params.get('mun')!); pf.set('municipalityName', params.get('nome') ?? ''); pf.set('uf', params.get('uf') ?? ''); } }, []); // eslint-disable-line
  const saveProp = async (e: React.FormEvent) => { e.preventDefault(); const er: Record<string, string> = {}; if (!pf.v.name.trim()) er.name = t('properties.err.name'); if (!/^\d{7}$/.test(pf.v.municipalityCode)) er.mun = t('properties.err.mun'); if (numError(pf.v.areaHa, pf.locale)) er.area = numError(pf.v.areaHa, pf.locale)!; setErr(er); if (Object.keys(er).length) return; setBusy(true); const p = await seasons.saveProperty({ name: pf.v.name.trim(), municipalityCode: pf.v.municipalityCode, municipalityName: pf.v.municipalityName, uf: pf.v.uf, areaHa: num(pf.v.areaHa, pf.locale) }); setBusy(false); pf.clear(); setQ(''); tf.set('propertyId', p.id); setMsg(t('properties.msg.property', { name: p.name })); };
  const savePlot = async (e: React.FormEvent) => { e.preventDefault(); const er: Record<string, string> = {}; const pid = tf.v.propertyId || props[0]?.id; if (!pid) er.tprop = t('properties.err.propertyFirst'); if (!tf.v.name.trim()) er.tname = t('properties.err.plotName'); if (numError(tf.v.areaHa, tf.locale)) er.tarea = numError(tf.v.areaHa, tf.locale)!; else if (num(tf.v.areaHa, tf.locale) == null || num(tf.v.areaHa, tf.locale)! <= 0) er.tarea = t('properties.err.plotArea'); setErr(er); if (Object.keys(er).length) return; setBusy(true); const p = await seasons.savePlot({ propertyId: pid!, name: tf.v.name.trim(), areaHa: num(tf.v.areaHa, tf.locale), soil: tf.v.soil, irrigation: tf.v.irrigation, polygon: tf.v.polygon === 'demo_uberlandia' ? 'demo_uberlandia' : null }); setBusy(false); tf.clear(); setMsg(t('properties.msg.plot', { name: p.name })); };
  // Plot soil/irrigation keep the Portuguese label as stored value (read by older versions); the select shows the translation.
  const plotSelect = (field: 'soil' | 'irrigation', a: object) => <select className="input" {...a} value={choice({ [field]: tf.v[field] }, field) || ''} onChange={(e) => tf.set(field, legacyLabel(field, e.target.value))}>{codesOf(field).map((c) => <option key={c} value={c}>{optionLabel(field, c)}</option>)}</select>;
  return (
    <div className="page">
      <div className="page-head"><div className="stack-2"><h1>{t('nav.propertiesLong')}</h1><p>{t('properties.subtitle')}</p></div><LinkBtn to="/registros"><Tractor size={18} aria-hidden />{t('properties.toRecords')}</LinkBtn></div>
      <div data-tour="farm-local"><LocalNote /></div>
      {msg && <p role="status" className="notice notice--water"><Sprout size={18} aria-hidden /><span>{msg}</span></p>}
      {props.length === 0 ? <Empty title={t('properties.none')}>{t('properties.noneText')}</Empty> : <div className="grid-auto">{props.map((p) => <section className="card" key={p.id}><h2><MapPin size={18} aria-hidden />{p.name}</h2><p className="meta">{p.municipalityName}, {p.uf} · IBGE {p.municipalityCode}{p.areaHa ? ` · ${n1(p.areaHa)} ha` : ''}</p>
        {plots.filter((x) => x.propertyId === p.id).length === 0 ? <p className="meta">{t('properties.noPlots')}</p> : <ul className="list">{plots.filter((x) => x.propertyId === p.id).map((x) => <li key={x.id}><button aria-current={active === x.id} onClick={() => setState({ activePlotId: x.id })}><span><b>{x.name}</b><br /><span className="meta-13">{t('properties.plotLine', { area: n1(x.areaHa), irrigation: optionLabel('irrigation', x.irrigation), soil: optionLabel('soil', x.soil) })}{x.polygon ? ` · ${t('properties.demoPolygon')}` : ` · ${t('properties.noPolygon')}`}</span></span>{active === x.id ? <Pill tone="ok">{t('properties.inUse')}</Pill> : <span className="meta-13">{t('properties.use')}</span>}</button></li>)}</ul>}</section>)}</div>}
      <div className="grid-2">
        <form className="card" data-tour="farm-property-form" onSubmit={e => { void saveProp(e).catch(x => { setBusy(false); if (x.code !== 'account_changed') setMsg(translate(`errors.auth.${x.code}`)); }); }} noValidate aria-labelledby="h-prop"><h2 id="h-prop"><Plus size={18} aria-hidden />{t('properties.newProperty')}</h2>
          {pf.restored && <p className="meta-13">{t('records.form.restored')}</p>}
          <Field label={t('properties.name')} error={err.name}>{(a) => <input className="input" {...a} {...pf.bind('name')} autoComplete="off" />}</Field>
          <Field label={t('properties.municipality')} hint={pf.v.municipalityCode ? t('properties.selected', { name: pf.v.municipalityName, uf: pf.v.uf, code: pf.v.municipalityCode }) : t('properties.municipalityHint')} error={err.mun}>{(a) => <input className="input" {...a} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('properties.municipalityPh')} autoComplete="off" />}</Field>
          {res.length > 0 && <ul className="list" aria-label={t('properties.found')}>{res.map((r) => <li key={r.code}><button type="button" onClick={() => { pf.set('municipalityCode', r.code); pf.set('municipalityName', r.name); pf.set('uf', r.ufSigla); setQ(''); }}>{r.name}, {r.ufSigla}<span className="meta-13">{r.code}</span></button></li>)}</ul>}
          <Field label={t('properties.totalArea')} optional error={err.area}>{(a) => <input className="input" inputMode="decimal" {...a} {...pf.bind('areaHa')} />}</Field>
          <div><button className="btn btn--primary" disabled={busy}>{busy ? t('records.form.saving') : t('properties.saveProperty')}</button></div>
        </form>
        <form className="card" onSubmit={e => { void savePlot(e).catch(x => { setBusy(false); if (x.code !== 'account_changed') setMsg(translate(`errors.auth.${x.code}`)); }); }} noValidate aria-labelledby="h-talhao"><h2 id="h-talhao"><Plus size={18} aria-hidden />{t('properties.newPlot')}</h2>
          <Field label={t('properties.property')} error={err.tprop}>{(a) => <select className="input" {...a} {...tf.bind('propertyId')}>{props.length === 0 && <option value="">{t('properties.err.propertyFirst')}</option>}{props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</Field>
          <div className="form-grid"><Field label={t('properties.plotName')} error={err.tname}>{(a) => <input className="input" {...a} {...tf.bind('name')} autoComplete="off" />}</Field><Field label={t('plan.form.area')} error={err.tarea}>{(a) => <input className="input" inputMode="decimal" {...a} {...tf.bind('areaHa')} />}</Field></div>
          <div className="form-grid"><Field label={t('plan.form.soil')}>{(a) => plotSelect('soil', a)}</Field><Field label={t('plan.form.irrigation')}>{(a) => plotSelect('irrigation', a)}</Field></div>
          <Field label={t('properties.outline')} hint={t('properties.outlineHint')}>{(a) => <select className="input" {...a} {...tf.bind('polygon')}><option value="">{t('properties.outlineNone')}</option><option value="demo_uberlandia">{t('properties.outlineDemo')}</option></select>}</Field>
          <div><button className="btn btn--primary" disabled={busy || props.length === 0}>{t('properties.savePlot')}</button></div>
        </form>
      </div>
    </div>
  );
}

// Initial values: choice fields carry a code and the Portuguese label read by older versions (options.ts).
const INITIAL: Record<RecordKind, Record<string, string>> = {
  plantio: { cultura: PT_NAME.soy, cultura_id: 'soy', cultivar: '', prevista: '', realizada: '', area: '', sistema: 'Plantio direto', sistema_code: 'no_till', irrigacao: 'Sequeiro', irrigacao_code: 'rainfed', anterior: '', idade: '', poda: '' },
  evento: { tipo: 'Emergência', tipo_code: 'emergence', data: '', quantidade: '', unidade: '', obs: '' },
  colheita: { data: '', area: '', quantidade: '', unidade: 'saca', saca: '60', forma: 'Beneficiado', forma_code: 'green', umidade: '', qualidade: '', perdas: '', origem: 'Pesagem', origem_code: 'weighing' },
  venda: { data: '', quantidade: '', unidade: 'saca', saca: '60', preco: '', moeda: 'BRL', insumos: '', frete: '', taxas: '', situacao: 'Realizado', situacao_code: 'actual' },
};
function summary(r: FieldRecord) {
  const d = r.data; const unit = (u: string) => (['saca', 'kg', 't'].includes(u) ? translate(`options.unit.${u}`) : u);
  if (r.kind === 'plantio') return `${cropOptionLabel(d.cultura ?? '')}${d.cultivar ? ` (${d.cultivar})` : ''} · ${d.area} ha · ${d.realizada ? translate('records.summary.done') : translate('records.summary.planned')}`;
  if (r.kind === 'evento') return `${optionLabel('tipo', choice(d, 'tipo') || d.tipo)}${d.quantidade ? ` · ${d.quantidade} ${d.unidade}` : ''}${d.obs ? ` · ${d.obs}` : ''}`;
  if (r.kind === 'colheita') return `${d.quantidade} ${unit(d.unidade)}${d.unidade === 'saca' ? ` ${translate('records.summary.sackOf', { kg: d.saca })}` : ''} · ${d.area} ha${d.forma && d.cafe ? ` · ${optionLabel('forma', choice(d, 'forma') || d.forma)}` : ''}`;
  return `${d.quantidade} ${unit(d.unidade)} · ${d.preco} ${d.moeda}/${unit(d.unidade)} · ${optionLabel('situacao', choice(d, 'situacao') || d.situacao)}`;
}

export function Records() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams(); const plots = useStore((s) => s.plots); const props = useStore((s) => s.properties); const active = useStore((s) => s.activePlotId); const records = useStore((s) => s.records);
  const plot = plots.find((p) => p.id === active) ?? plots[0]; const kind = (params.get('novo') as RecordKind) || null; const [editing, setEditing] = useState<FieldRecord | null>(null); const [msg, setMsg] = useState(''); const [del, setDel] = useState<FieldRecord | null>(null);
  const mine = useMemo(() => records.filter((r) => r.plotId === plot?.id).sort((a, b) => b.event_at.localeCompare(a.event_at)), [records, plot]);
  const lastCrop = mine.find((r) => r.kind === 'plantio')?.data.cultura;
  if (!plot) return <div className="page"><div className="page-head"><h1>{t('records.title')}</h1></div><Empty title={t('records.noPlot')} action={<LinkBtn primary to="/propriedades">{t('records.noPlotAction')}</LinkBtn>}>{t('records.noPlotText')}</Empty><LocalNote /></div>;
  const open = (k: RecordKind | null) => { setEditing(null); setParams(k ? { novo: k } : {}); };
  return (
    <div className="page">
      <div className="page-head"><div className="stack-2"><h1>{t('records.title')}</h1><p>{props.find((p) => p.id === plot.propertyId)?.name} · {plot.name} · {n1(plot.areaHa)} ha</p></div>
        {plots.length > 1 && <label className="row meta">{t('records.plot')}<select className="input" style={{ width: 'auto' }} value={plot.id} onChange={(e) => setState({ activePlotId: e.target.value })}>{plots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}</div>
      <div className="row" role="group" data-tour="records-kinds" aria-label={t('records.new')}>{KIND_IDS.map((k) => <button key={k} className="btn" aria-pressed={kind === k} onClick={() => open(kind === k ? null : k)}><Plus size={18} aria-hidden />{kindLabel(k)}</button>)}</div>
      {msg && <p role="status" className="notice notice--water"><Sprout size={18} aria-hidden /><span>{msg}</span></p>}
      {kind && <RecordForm key={kind + (editing?.id ?? '')} kind={kind} plotId={plot.id} plotArea={plot.areaHa} editing={editing} crop={lastCrop} onDone={(m) => { setMsg(m); open(null); }} onCancel={() => open(null)} />}
      <section className="stack" aria-labelledby="h-hist"><h2 id="h-hist">{t('records.history')}</h2>
        {mine.length === 0 ? <Empty title={t('records.empty')}>{t('records.emptyText')}</Empty> :
          <div className="table-wrap" tabIndex={0} role="group" aria-label={t('common.tableScroll')}><table><thead><tr><th>{t('records.col.date')}</th><th>{t('records.col.type')}</th><th>{t('records.col.summary')}</th><th>{t('records.col.season')}</th><th>{t('records.col.origin')}</th><th><span className="sr-only">{t('records.col.actions')}</span></th></tr></thead><tbody>{mine.map((r) => <tr key={r.id}><td>{dFull(r.event_at)}</td><td>{kindLabel(r.kind)}</td><td style={{ whiteSpace: 'normal', minWidth: 220 }}>{summary(r)}{r.kind === 'plantio' && r.data.cultura_pendente && !r.data.cultura_id ? <> <Pill tone="warn">{t('records.completeCrop')}</Pill></> : null}</td><td>{r.cycleId.split(':')[1]}</td><td><Pill>{t('records.informed')}{r.revision > 1 ? ` · ${t('records.rev', { n: r.revision })}` : ''}</Pill></td><td><div className="row"><button className="btn btn--sm" onClick={() => { setParams({ novo: r.kind }); setEditing(r); }}>{t('records.open')}</button><button className="btn btn--sm btn--danger" onClick={() => setDel(r)}>{t('records.delete')}</button></div></td></tr>)}</tbody></table></div>}
      </section>
      <LocalNote />
      <Dialog open={!!del} onClose={() => setDel(null)} title={t('records.del.title')}><p>{del && t('records.del.text', { kind: kindLabel(del.kind), date: dFull(del.event_at) })}</p><div className="row"><button className="btn btn--danger" onClick={() => { setState((s) => ({ records: s.records.filter((x) => x.id !== del!.id) })); setMsg(t('records.del.done')); setDel(null); }}>{t('records.del.confirm')}</button><button className="btn" onClick={() => setDel(null)}>{t('common.cancel')}</button></div></Dialog>
    </div>
  );
}

function RecordForm({ kind, plotId, plotArea, editing, crop, onDone, onCancel }: { kind: RecordKind; plotId: string; plotArea: number | null; editing: FieldRecord | null; crop?: string; onDone: (m: string) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const f = useDraftForm(`registro:${kind}:${plotId}`, { ...INITIAL[kind], ...(kind !== 'evento' && plotArea ? { area: String(plotArea).replace('.', ',') } : {}) }); const [err, setErr] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [fail, setFail] = useState(''); const top = useRef<HTMLFormElement>(null);
  useEffect(() => { if (editing) { const id = cropIdFromName(editing.data.cultura); f.load(id ? { ...editing.data, cultura: PT_NAME[id] } : editing.data); } top.current?.querySelector<HTMLElement>('input,select')?.focus(); }, [editing]); // eslint-disable-line
  const v = f.v; const nl = f.locale; const coffee = isCoffee(cropIdFromName(kind === 'plantio' ? v.cultura : crop)); const unknownCrop = kind === 'plantio' && !!v.cultura && !RECORD_CROP_OPTIONS.includes(v.cultura);
  const n = (k: string) => num(v[k], nl); const nErr = (k: string) => numError(v[k], nl);
  const kg = toKg(n('quantidade'), v.unidade, n('saca')); const area = n('area'); const yieldKgHa = kind === 'colheita' && kg != null && area ? kg / area : null;
  const revenue = kind === 'venda' && n('quantidade') != null && n('preco') != null ? n('quantidade')! * n('preco')! : null; const costs = ['insumos', 'frete', 'taxas'].map((k) => n(k)); const allCosts = costs.every((c) => c != null); const margin = revenue != null && allCosts ? revenue - costs.reduce((a, c) => a! + c!, 0)! : null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); const er: Record<string, string> = {}; const need = (k: string, m: string) => { if (!v[k]?.trim()) er[k] = m; }; const number = (k: string, m: string) => { if (nErr(k)) er[k] = nErr(k)!; else if (n(k) == null || n(k)! < 0) er[k] = m; };
    if (kind === 'plantio') { if (!v.prevista && !v.realizada) er.prevista = t('records.err.plantingDate'); number('area', t('records.err.plantedArea')); if (plotArea && n('area') != null && n('area')! > plotArea) er.area = t('records.err.areaOver', { area: n1(plotArea) }); }
    if (kind === 'evento') need('data', t('records.err.date'));
    if (kind === 'colheita' || kind === 'venda') { need('data', t('records.err.date')); number('quantidade', t('records.err.quantity')); if (v.unidade === 'saca') number('saca', t('records.err.sack')); }
    if (kind === 'colheita') { number('area', t('records.err.harvestArea')); if (v.umidade && (nErr('umidade') || n('umidade') == null || n('umidade')! > 100)) er.umidade = nErr('umidade') ?? t('records.err.moisture'); }
    if (kind === 'venda') number('preco', t('records.err.price'));
    for (const k of ['quantidade', 'perdas', 'insumos', 'frete', 'taxas']) if (!er[k] && nErr(k)) er[k] = nErr(k)!;
    setErr(er); if (Object.keys(er).length) { requestAnimationFrame(() => top.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()); return; }
    setBusy(true); setFail('');
    try { await seasons.saveRecord({ id: editing?.id, kind, plotId, event_at: kind === 'plantio' ? v.realizada || v.prevista : v.data, data: { ...v, ...(coffee ? { cafe: '1' } : {}) } }); f.clear(); onDone(t(editing ? 'records.msg.updated' : 'records.msg.saved', { kind: kindLabel(kind) })); }
    catch { setFail(t('records.msg.failed')); } finally { setBusy(false); }
  };
  const I = (name: string, label: string, o: { type?: string; hint?: string; optional?: boolean; mode?: 'decimal' } = {}) => <Field label={label} hint={o.hint} optional={o.optional} error={err[name]}>{(a) => <input className="input" type={o.type ?? 'text'} inputMode={o.mode} max={o.type === 'date' ? '2100-12-31' : undefined} {...a} {...f.bind(name)} autoComplete="off" />}</Field>;
  /** Choice stored as code + Portuguese label (options.ts); the select shows the translation. */
  const C = (field: OptionField, label: string, hint?: string) => <Field label={label} hint={hint}>{(a) => <select className="input" {...a} value={choice(v, field)} onChange={(e) => { f.set(`${field}_code`, e.target.value); f.set(field, legacyLabel(field, e.target.value)); }}>{!choice(v, field) && v[field] && <option value="">{v[field]}</option>}{codesOf(field).map((c) => <option key={c} value={c}>{optionLabel(field, c)}</option>)}</select>}</Field>;
  const units = <Field label={t('records.f.unit')}>{(a) => <select className="input" {...a} {...f.bind('unidade')}>{['saca', 'kg', 't'].map((u) => <option key={u} value={u}>{translate(`options.unit.${u}`)}</option>)}</select>}</Field>;
  const cropSelect = <Field label={t('crops.label')} hint={unknownCrop && isAmbiguousCropName(v.cultura) ? t('records.f.ambiguous') : t('records.f.coverHint')}>{(a) => <select className="input" {...a} value={v.cultura} onChange={(e) => { f.set('cultura', e.target.value); f.set('cultura_id', cropIdFromName(e.target.value) ?? ''); }}>{(unknownCrop ? [v.cultura, ...RECORD_CROP_OPTIONS] : RECORD_CROP_OPTIONS).map((o) => <option key={o} value={o}>{cropOptionLabel(o)}</option>)}</select>}</Field>;
  return (
    <form className="card" data-tour="record-draft" ref={top} onSubmit={submit} noValidate aria-labelledby="h-form">
      <div className="row-between"><h2 id="h-form">{t(editing ? 'records.form.edit' : 'records.form.record', { kind: translate(`records.kindLower.${kind}`) })}</h2><span className="meta-13" role="status">{f.restored && !editing ? `${t('records.form.restored')} · ` : ''}{t('records.form.autosave')}</span></div>
      {kind === 'plantio' && <><div className="form-grid">{cropSelect}{I('cultivar', t('records.f.cultivar'), { optional: true })}{I('prevista', t('records.f.planned'), { type: 'date' })}{I('realizada', t('records.f.actual'), { type: 'date', optional: true, hint: t('records.f.actualHint') })}</div>
        <div className="form-grid">{I('area', t('records.f.plantedArea'), { mode: 'decimal' })}{C('sistema', t('records.f.system'))}{C('irrigacao', t('plan.form.irrigation'))}{I('anterior', t('records.f.previous'), { optional: true })}</div>
        {coffee && <><div className="form-grid">{I('idade', t('records.f.coffeeAge'), { mode: 'decimal', hint: t('records.f.coffeeAgeHint') })}{I('poda', t('records.f.pruning'), { type: 'date', optional: true })}</div><p className="meta-13">{t('records.f.coffeeNote')}</p></>}</>}
      {kind === 'evento' && <><div className="form-grid">{C('tipo', t('records.f.eventType'))}{I('data', t('records.f.date'), { type: 'date' })}{I('quantidade', t('records.f.quantity'), { optional: true, mode: 'decimal' })}{I('unidade', t('records.f.unit'), { optional: true, hint: t('records.f.unitHint') })}</div>
        <Field label={t('records.f.notes')} optional>{(a) => <textarea className="input" rows={2} {...a} {...f.bind('obs')} />}</Field><p className="meta-13">{t('records.f.attachments')}</p></>}
      {(kind === 'colheita' || kind === 'venda') && <div className="form-grid">{I('data', kind === 'colheita' ? t('records.f.harvestDate') : t('records.f.saleDate'), { type: 'date' })}{kind === 'colheita' && I('area', t('records.f.harvestArea'), { mode: 'decimal' })}{I('quantidade', kind === 'colheita' ? t('records.f.harvested') : t('records.f.sold'), { mode: 'decimal' })}{units}{v.unidade === 'saca' && I('saca', t('plan.eco.sack'), { mode: 'decimal', hint: t('records.f.sackHint') })}{coffee && C('forma', t('plan.eco.coffeeForm'), t('records.f.coffeeFormHint'))}</div>}
      {kind === 'colheita' && <><div className="form-grid">{I('umidade', t('records.f.moisture'), { optional: true, mode: 'decimal' })}{I('qualidade', t('records.f.quality'), { optional: true })}{I('perdas', t('records.f.losses'), { optional: true, mode: 'decimal' })}{C('origem', t('records.f.source'))}</div>
        <div className="card card--flat" aria-live="polite"><Stat label={t('records.f.yieldCalc')} value={yieldKgHa == null ? '—' : n0(yieldKgHa)} unit="kg/ha" note={yieldKgHa == null ? t('records.f.yieldMissing') : `${n0(kg)} kg ÷ ${n1(area)} ha${v.unidade === 'saca' ? ` · ${t('records.f.sacksPerHa', { n: n1(yieldKgHa / n('saca')!) })}` : ''}`} /></div></>}
      {kind === 'venda' && <><div className="form-grid">{I('preco', t('records.f.pricePer', { unit: translate(`options.unit.${v.unidade}`) }), { mode: 'decimal' })}<Field label={t('records.f.currency')}>{(a) => <select className="input" {...a} {...f.bind('moeda')}>{['BRL', 'USD'].map((c) => <option key={c}>{c}</option>)}</select>}</Field>{C('situacao', t('records.f.status'))}</div><div className="form-grid">{I('insumos', t('records.f.inputs'), { optional: true, mode: 'decimal' })}{I('frete', t('records.f.freight'), { optional: true, mode: 'decimal' })}{I('taxas', t('records.f.taxes'), { optional: true, mode: 'decimal' })}</div>
        <div className="card card--flat grid-2" aria-live="polite"><Stat label={t('plan.eco.revenue')} value={revenue == null ? '—' : money(revenue, v.moeda)} note={revenue == null ? t('records.f.revenueMissing') : `${v.quantidade} ${translate(`options.unit.${v.unidade}`)} × ${v.preco} ${v.moeda}`} /><Stat label={t('plan.eco.margin')} value={margin == null ? '—' : money(margin, v.moeda)} note={margin == null ? t('records.f.marginMissing') : t('records.f.marginNote')} /></div></>}
      {fail && <Notice tone="risk">{fail}</Notice>}
      <div className="row" data-tour="record-save"><button className="btn btn--primary" disabled={busy}>{busy ? t('records.form.saving') : editing ? t('records.form.saveChanges') : t('records.form.save', { kind: translate(`records.kindLower.${kind}`) })}</button><button type="button" className="btn" onClick={onCancel}>{t('records.form.close')}</button>{!editing && <button type="button" className="btn btn--ghost" onClick={() => f.clear()}>{t('records.form.clear')}</button>}</div>
      <p className="meta-13">{t('records.form.audit')} <Link to="/conta">{t('records.form.consent')}</Link></p>
    </form>
  );
}

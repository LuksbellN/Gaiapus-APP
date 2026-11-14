import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Plus, Sprout, Tractor } from 'lucide-react';
import { geography, seasons, type Place } from '../adapters';
import { dFull, money, n0, n1 } from '../format';
import { isPersistent, setState, useStore, type FieldRecord, type RecordKind } from '../store';
import { Dialog, Empty, Field, LinkBtn, Notice, Pill, Stat } from '../ui';
import { num, numError, toKg, useDraftForm } from '../ui/form';
import { cropIdFromName, CROPS, isAmbiguousCropName, isCoffee, RECORD_CROP_OPTIONS } from '../catalog';

const KINDS: Record<RecordKind, string> = { plantio: 'Plantio', evento: 'Manejo ou evento', colheita: 'Colheita', venda: 'Venda e custos' };
const LocalNote = () => <Notice tone={isPersistent() ? 'info' : 'risk'} title={isPersistent() ? 'Modo local.' : 'Armazenamento indisponível.'}>{isPersistent() ? 'Os registros ficam salvos só neste aparelho e navegador. A sincronização com a conta depende do serviço de backend.' : 'Este navegador bloqueou o armazenamento local; o que você preencher será perdido ao fechar a página.'}</Notice>;

export function Properties() {
  const [params] = useSearchParams(); const props = useStore((s) => s.properties); const plots = useStore((s) => s.plots); const active = useStore((s) => s.activePlotId);
  const pf = useDraftForm('propriedade', { name: '', municipalityCode: params.get('mun') ?? '', municipalityName: params.get('nome') ?? '', uf: params.get('uf') ?? '', areaHa: '' });
  const tf = useDraftForm('talhao', { propertyId: '', name: '', areaHa: '', soil: 'Não sei', irrigation: 'Sequeiro', polygon: '' });
  const [err, setErr] = useState<Record<string, string>>({}); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [q, setQ] = useState(''); const [res, setRes] = useState<Place[]>([]);
  useEffect(() => { let on = true; if (q.length >= 2) geography.search(q).then((r) => on && setRes(r.filter((x) => x.type === 'municipio').slice(0, 6))); else setRes([]); return () => { on = false; }; }, [q]);
  useEffect(() => { if (params.get('mun')) { pf.set('municipalityCode', params.get('mun')!); pf.set('municipalityName', params.get('nome') ?? ''); pf.set('uf', params.get('uf') ?? ''); } }, []); // eslint-disable-line
  const saveProp = async (e: React.FormEvent) => { e.preventDefault(); const er: Record<string, string> = {}; if (!pf.v.name.trim()) er.name = 'Dê um nome à propriedade.'; if (!/^\d{7}$/.test(pf.v.municipalityCode)) er.mun = 'Escolha o município na busca.'; if (numError(pf.v.areaHa)) er.area = numError(pf.v.areaHa)!; setErr(er); if (Object.keys(er).length) return; setBusy(true); const p = await seasons.saveProperty({ name: pf.v.name.trim(), municipalityCode: pf.v.municipalityCode, municipalityName: pf.v.municipalityName, uf: pf.v.uf, areaHa: num(pf.v.areaHa) }); setBusy(false); pf.clear(); setQ(''); tf.set('propertyId', p.id); setMsg(`Propriedade "${p.name}" salva. Agora cadastre um talhão.`); };
  const savePlot = async (e: React.FormEvent) => { e.preventDefault(); const er: Record<string, string> = {}; const pid = tf.v.propertyId || props[0]?.id; if (!pid) er.tprop = 'Cadastre uma propriedade primeiro.'; if (!tf.v.name.trim()) er.tname = 'Dê um nome ao talhão.'; if (numError(tf.v.areaHa)) er.tarea = numError(tf.v.areaHa)!; else if (num(tf.v.areaHa) == null || num(tf.v.areaHa)! <= 0) er.tarea = 'Informe a área em hectares.'; setErr(er); if (Object.keys(er).length) return; setBusy(true); const t = await seasons.savePlot({ propertyId: pid!, name: tf.v.name.trim(), areaHa: num(tf.v.areaHa), soil: tf.v.soil, irrigation: tf.v.irrigation, polygon: tf.v.polygon === 'demo_uberlandia' ? 'demo_uberlandia' : null }); setBusy(false); tf.clear(); setMsg(`Talhão "${t.name}" salvo.`); };
  return (
    <div className="page">
      <div className="page-head"><div className="stack-2"><h1>Propriedades e talhões</h1><p>Cadastre onde você planta para registrar a safra e acompanhar água e clima do seu município.</p></div><LinkBtn to="/registros"><Tractor size={18} aria-hidden />Ir para registros</LinkBtn></div>
      <LocalNote />
      {msg && <p role="status" className="notice notice--water"><Sprout size={18} aria-hidden /><span>{msg}</span></p>}
      {props.length === 0 ? <Empty title="Nenhuma propriedade cadastrada">Comece pelo formulário abaixo. Leva menos de um minuto.</Empty> : <div className="grid-auto">{props.map((p) => <section className="card" key={p.id}><h2><MapPin size={18} aria-hidden />{p.name}</h2><p className="meta">{p.municipalityName}, {p.uf} · IBGE {p.municipalityCode}{p.areaHa ? ` · ${n1(p.areaHa)} ha` : ''}</p>
        {plots.filter((t) => t.propertyId === p.id).length === 0 ? <p className="meta">Sem talhões ainda.</p> : <ul className="list">{plots.filter((t) => t.propertyId === p.id).map((t) => <li key={t.id}><button aria-current={active === t.id} onClick={() => setState({ activePlotId: t.id })}><span><b>{t.name}</b><br /><span className="meta-13">{n1(t.areaHa)} ha · {t.irrigation} · solo: {t.soil}{t.polygon ? ' · polígono demonstrativo' : ' · sem polígono'}</span></span>{active === t.id ? <Pill tone="ok">Em uso</Pill> : <span className="meta-13">Usar</span>}</button></li>)}</ul>}</section>)}</div>}
      <div className="grid-2">
        <form className="card" onSubmit={e => { void saveProp(e).catch(x => { setBusy(false); if (x.code !== 'account_changed') setMsg(x.message); }); }} noValidate aria-labelledby="h-prop"><h2 id="h-prop"><Plus size={18} aria-hidden />Nova propriedade</h2>
          {pf.restored && <p className="meta-13">Rascunho recuperado.</p>}
          <Field label="Nome da propriedade" error={err.name}>{(a) => <input className="input" {...a} {...pf.bind('name')} autoComplete="off" />}</Field>
          <Field label="Município" hint={pf.v.municipalityCode ? `Selecionado: ${pf.v.municipalityName}, ${pf.v.uf} · IBGE ${pf.v.municipalityCode}` : 'Digite o nome e escolha na lista (MG e MT nesta edição).'} error={err.mun}>{(a) => <input className="input" {...a} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: Sorriso" autoComplete="off" />}</Field>
          {res.length > 0 && <ul className="list" aria-label="Municípios encontrados">{res.map((r) => <li key={r.code}><button type="button" onClick={() => { pf.set('municipalityCode', r.code); pf.set('municipalityName', r.name); pf.set('uf', r.ufSigla); setQ(''); }}>{r.name}, {r.ufSigla}<span className="meta-13">{r.code}</span></button></li>)}</ul>}
          <Field label="Área total (ha)" optional error={err.area}>{(a) => <input className="input" inputMode="decimal" {...a} {...pf.bind('areaHa')} />}</Field>
          <div><button className="btn btn--primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar propriedade'}</button></div>
        </form>
        <form className="card" onSubmit={e => { void savePlot(e).catch(x => { setBusy(false); if (x.code !== 'account_changed') setMsg(x.message); }); }} noValidate aria-labelledby="h-talhao"><h2 id="h-talhao"><Plus size={18} aria-hidden />Novo talhão</h2>
          <Field label="Propriedade" error={err.tprop}>{(a) => <select className="input" {...a} {...tf.bind('propertyId')}>{props.length === 0 && <option value="">Cadastre uma propriedade primeiro</option>}{props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</Field>
          <div className="form-grid"><Field label="Nome do talhão" error={err.tname}>{(a) => <input className="input" {...a} {...tf.bind('name')} autoComplete="off" />}</Field><Field label="Área (ha)" error={err.tarea}>{(a) => <input className="input" inputMode="decimal" {...a} {...tf.bind('areaHa')} />}</Field></div>
          <div className="form-grid"><Field label="Solo">{(a) => <select className="input" {...a} {...tf.bind('soil')}>{['Não sei', 'Arenoso', 'Médio', 'Argiloso'].map((o) => <option key={o}>{o}</option>)}</select>}</Field><Field label="Irrigação">{(a) => <select className="input" {...a} {...tf.bind('irrigation')}>{['Sequeiro', 'Irrigado'].map((o) => <option key={o}>{o}</option>)}</select>}</Field></div>
          <Field label="Contorno do talhão" hint="O desenho do contorno no mapa ainda não está disponível. Sem polígono, as análises ficam na escala do município.">{(a) => <select className="input" {...a} {...tf.bind('polygon')}><option value="">Sem polígono por enquanto</option><option value="demo_uberlandia">Usar recorte demonstrativo de Uberlândia</option></select>}</Field>
          <div><button className="btn btn--primary" disabled={busy || props.length === 0}>Salvar talhão</button></div>
        </form>
      </div>
    </div>
  );
}

const INITIAL: Record<RecordKind, Record<string, string>> = {
  plantio: { cultura: 'Soja', cultivar: '', prevista: '', realizada: '', area: '', sistema: 'Plantio direto', irrigacao: 'Sequeiro', anterior: '', idade: '', poda: '' },
  evento: { tipo: 'Emergência', data: '', quantidade: '', unidade: '', obs: '' },
  colheita: { data: '', area: '', quantidade: '', unidade: 'saca', saca: '60', forma: 'Beneficiado', umidade: '', qualidade: '', perdas: '', origem: 'Pesagem' },
  venda: { data: '', quantidade: '', unidade: 'saca', saca: '60', preco: '', moeda: 'BRL', insumos: '', frete: '', taxas: '', situacao: 'Realizado' },
};
const summary = (r: FieldRecord) => r.kind === 'plantio' ? `${r.data.cultura}${r.data.cultivar ? ` (${r.data.cultivar})` : ''} · ${r.data.area} ha · ${r.data.realizada ? 'realizado' : 'previsto'}` : r.kind === 'evento' ? `${r.data.tipo}${r.data.quantidade ? ` · ${r.data.quantidade} ${r.data.unidade}` : ''}${r.data.obs ? ` · ${r.data.obs}` : ''}` : r.kind === 'colheita' ? `${r.data.quantidade} ${r.data.unidade}${r.data.unidade === 'saca' ? ` de ${r.data.saca} kg` : ''} em ${r.data.area} ha${r.data.forma && r.data.cafe ? ` · café ${r.data.forma.toLowerCase()}` : ''}` : `${r.data.quantidade} ${r.data.unidade} a ${r.data.preco} ${r.data.moeda}/${r.data.unidade} · ${r.data.situacao.toLowerCase()}`;

export function Records() {
  const [params, setParams] = useSearchParams(); const plots = useStore((s) => s.plots); const props = useStore((s) => s.properties); const active = useStore((s) => s.activePlotId); const records = useStore((s) => s.records);
  const plot = plots.find((p) => p.id === active) ?? plots[0]; const kind = (params.get('novo') as RecordKind) || null; const [editing, setEditing] = useState<FieldRecord | null>(null); const [msg, setMsg] = useState(''); const [del, setDel] = useState<FieldRecord | null>(null);
  const mine = useMemo(() => records.filter((r) => r.plotId === plot?.id).sort((a, b) => b.event_at.localeCompare(a.event_at)), [records, plot]);
  const lastCrop = mine.find((r) => r.kind === 'plantio')?.data.cultura;
  if (!plot) return <div className="page"><div className="page-head"><h1>Registros da safra</h1></div><Empty title="Cadastre um talhão para começar" action={<LinkBtn primary to="/propriedades">Cadastrar propriedade e talhão</LinkBtn>}>Plantio, manejo, colheita e venda ficam ligados a um talhão.</Empty><LocalNote /></div>;
  const open = (k: RecordKind | null) => { setEditing(null); setParams(k ? { novo: k } : {}); };
  return (
    <div className="page">
      <div className="page-head"><div className="stack-2"><h1>Registros da safra</h1><p>{props.find((p) => p.id === plot.propertyId)?.name} · {plot.name} · {n1(plot.areaHa)} ha</p></div>
        {plots.length > 1 && <label className="row meta">Talhão<select className="input" style={{ width: 'auto' }} value={plot.id} onChange={(e) => setState({ activePlotId: e.target.value })}>{plots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}</div>
      <div className="row" role="group" aria-label="Novo registro">{(Object.keys(KINDS) as RecordKind[]).map((k) => <button key={k} className="btn" aria-pressed={kind === k} onClick={() => open(kind === k ? null : k)}><Plus size={18} aria-hidden />{KINDS[k]}</button>)}</div>
      {msg && <p role="status" className="notice notice--water"><Sprout size={18} aria-hidden /><span>{msg}</span></p>}
      {kind && <RecordForm key={kind + (editing?.id ?? '')} kind={kind} plotId={plot.id} plotArea={plot.areaHa} editing={editing} crop={lastCrop} onDone={(m) => { setMsg(m); open(null); }} onCancel={() => open(null)} />}
      <section className="stack" aria-labelledby="h-hist"><h2 id="h-hist">Histórico</h2>
        {mine.length === 0 ? <Empty title="Nenhum registro neste talhão">Comece pelo plantio. Você pode registrar uma data prevista e completar depois.</Empty> :
          <div className="table-wrap" tabIndex={0} role="group" aria-label="Tabela; role para os lados se não couber na tela"><table><thead><tr><th>Data</th><th>Tipo</th><th>Resumo</th><th>Safra</th><th>Origem</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>{mine.map((r) => <tr key={r.id}><td>{dFull(r.event_at)}</td><td>{KINDS[r.kind]}</td><td style={{ whiteSpace: 'normal', minWidth: 220 }}>{summary(r)}{r.kind === 'plantio' && r.data.cultura_pendente && !r.data.cultura_id ? <> <Pill tone="warn">Completar cultura</Pill></> : null}</td><td>{r.cycleId.split(':')[1]}</td><td><Pill>Informado{r.revision > 1 ? ` · rev. ${r.revision}` : ''}</Pill></td><td><div className="row"><button className="btn btn--sm" onClick={() => { setParams({ novo: r.kind }); setEditing(r); }}>Abrir</button><button className="btn btn--sm btn--danger" onClick={() => setDel(r)}>Excluir</button></div></td></tr>)}</tbody></table></div>}
      </section>
      <LocalNote />
      <Dialog open={!!del} onClose={() => setDel(null)} title="Excluir este registro?"><p>{del && `${KINDS[del.kind]} de ${dFull(del.event_at)}. Esta ação não pode ser desfeita.`}</p><div className="row"><button className="btn btn--danger" onClick={() => { setState((s) => ({ records: s.records.filter((x) => x.id !== del!.id) })); setMsg('Registro excluído.'); setDel(null); }}>Excluir registro</button><button className="btn" onClick={() => setDel(null)}>Cancelar</button></div></Dialog>
    </div>
  );
}

function RecordForm({ kind, plotId, plotArea, editing, crop, onDone, onCancel }: { kind: RecordKind; plotId: string; plotArea: number | null; editing: FieldRecord | null; crop?: string; onDone: (m: string) => void; onCancel: () => void }) {
  const f = useDraftForm(`registro:${kind}:${plotId}`, { ...INITIAL[kind], ...(kind !== 'evento' && plotArea ? { area: String(plotArea).replace('.', ',') } : {}) }); const [err, setErr] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [fail, setFail] = useState(''); const top = useRef<HTMLFormElement>(null);
  useEffect(() => { if (editing) { const id = cropIdFromName(editing.data.cultura); f.load(id ? { ...editing.data, cultura: CROPS[id].name } : editing.data); } top.current?.querySelector<HTMLElement>('input,select')?.focus(); }, [editing]); // eslint-disable-line
  const v = f.v; const coffee = isCoffee(cropIdFromName(kind === 'plantio' ? v.cultura : crop)); const unknownCrop = kind === 'plantio' && !!v.cultura && !RECORD_CROP_OPTIONS.includes(v.cultura);
  const kg = toKg(num(v.quantidade), v.unidade, num(v.saca)); const area = num(v.area); const yieldKgHa = kind === 'colheita' && kg != null && area ? kg / area : null;
  const revenue = kind === 'venda' && num(v.quantidade) != null && num(v.preco) != null ? num(v.quantidade)! * num(v.preco)! : null; const costs = ['insumos', 'frete', 'taxas'].map((k) => num(v[k])); const allCosts = costs.every((c) => c != null); const margin = revenue != null && allCosts ? revenue - costs.reduce((a, c) => a! + c!, 0)! : null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); const er: Record<string, string> = {}; const need = (k: string, m: string) => { if (!v[k]?.trim()) er[k] = m; }; const number = (k: string, m: string) => { if (numError(v[k])) er[k] = numError(v[k])!; else if (num(v[k]) == null || num(v[k])! < 0) er[k] = m; };
    if (kind === 'plantio') { if (!v.prevista && !v.realizada) er.prevista = 'Informe a data prevista ou a realizada.'; number('area', 'Informe a área plantada em hectares.'); if (plotArea && num(v.area) != null && num(v.area)! > plotArea) er.area = `A área plantada não pode passar da área do talhão (${n1(plotArea)} ha).`; }
    if (kind === 'evento') need('data', 'Informe a data.');
    if (kind === 'colheita' || kind === 'venda') { need('data', 'Informe a data.'); number('quantidade', 'Informe a quantidade.'); if (v.unidade === 'saca') number('saca', 'Informe o peso da saca em kg.'); }
    if (kind === 'colheita') { number('area', 'Informe a área colhida em hectares.'); if (v.umidade && (numError(v.umidade) || num(v.umidade) == null || num(v.umidade)! > 100)) er.umidade = numError(v.umidade) ?? 'Umidade entre 0 e 100%.'; }
    if (kind === 'venda') number('preco', 'Informe o preço por unidade.');
    for (const k of ['quantidade', 'perdas', 'insumos', 'frete', 'taxas']) if (!er[k] && numError(v[k])) er[k] = numError(v[k])!;
    setErr(er); if (Object.keys(er).length) { requestAnimationFrame(() => top.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()); return; }
    setBusy(true); setFail('');
    try { await seasons.saveRecord({ id: editing?.id, kind, plotId, event_at: kind === 'plantio' ? v.realizada || v.prevista : v.data, data: { ...v, ...(coffee ? { cafe: '1' } : {}) } }); f.clear(); onDone(`${KINDS[kind]} ${editing ? 'atualizado' : 'salvo'}.`); }
    catch { setFail('Não foi possível salvar agora. Seu rascunho continua guardado neste aparelho; tente de novo.'); } finally { setBusy(false); }
  };
  const I = (name: string, label: string, o: { type?: string; hint?: string; optional?: boolean; mode?: 'decimal' } = {}) => <Field label={label} hint={o.hint} optional={o.optional} error={err[name]}>{(a) => <input className="input" type={o.type ?? 'text'} inputMode={o.mode} max={o.type === 'date' ? '2100-12-31' : undefined} {...a} {...f.bind(name)} autoComplete="off" />}</Field>;
  const S = (name: string, label: string, opts: string[], hint?: string) => <Field label={label} hint={hint}>{(a) => <select className="input" {...a} {...f.bind(name)}>{opts.map((o) => <option key={o}>{o}</option>)}</select>}</Field>;
  return (
    <form className="card" ref={top} onSubmit={submit} noValidate aria-labelledby="h-form">
      <div className="row-between"><h2 id="h-form">{editing ? 'Editar' : 'Registrar'} {KINDS[kind].toLowerCase()}</h2><span className="meta-13" role="status">{f.restored && !editing ? 'Rascunho recuperado · ' : ''}Rascunho salvo automaticamente neste aparelho</span></div>
      {kind === 'plantio' && <><div className="form-grid">{S('cultura', 'Cultura', unknownCrop ? [v.cultura, ...RECORD_CROP_OPTIONS] : RECORD_CROP_OPTIONS, unknownCrop && isAmbiguousCropName(v.cultura) ? 'Este registro antigo não diz a espécie ou a safra. Escolha a opção certa; não adivinhamos.' : 'Braquiária é cobertura do solo: sem estimativa de rendimento.')}{I('cultivar', 'Cultivar ou variedade', { optional: true })}{I('prevista', 'Data prevista', { type: 'date' })}{I('realizada', 'Data realizada', { type: 'date', optional: true, hint: 'Deixe em branco se ainda não plantou.' })}</div>
        <div className="form-grid">{I('area', 'Área plantada (ha)', { mode: 'decimal' })}{S('sistema', 'Sistema', ['Plantio direto', 'Convencional', 'Cultivo mínimo'])}{S('irrigacao', 'Irrigação', ['Sequeiro', 'Irrigado'])}{I('anterior', 'Cultura anterior', { optional: true })}</div>
        {coffee && <><div className="form-grid">{I('idade', 'Idade do cafezal (anos)', { mode: 'decimal', hint: 'Zero para implantação nova.' })}{I('poda', 'Última poda', { type: 'date', optional: true })}</div><p className="meta-13">Café é perene: a implantação não equivale a um ciclo até a primeira colheita. A espécie fica registrada pela cultura escolhida.</p></>}</>}
      {kind === 'evento' && <><div className="form-grid">{S('tipo', 'O que aconteceu', ['Emergência', 'Floração', 'Irrigação', 'Fertilização', 'Poda', 'Praga ou doença', 'Dano (granizo, geada, seca)', 'Análise de solo', 'Outro'])}{I('data', 'Data', { type: 'date' })}{I('quantidade', 'Quantidade', { optional: true, mode: 'decimal' })}{I('unidade', 'Unidade', { optional: true, hint: 'Ex.: mm, kg/ha, L/ha' })}</div>
        <Field label="Observação" optional>{(a) => <textarea className="input" rows={2} {...a} {...f.bind('obs')} />}</Field><p className="meta-13">Fotos e laudos poderão ser anexados quando o armazenamento do backend estiver ativo.</p></>}
      {(kind === 'colheita' || kind === 'venda') && <div className="form-grid">{I('data', kind === 'colheita' ? 'Data da colheita' : 'Data da venda', { type: 'date' })}{kind === 'colheita' && I('area', 'Área colhida (ha)', { mode: 'decimal' })}{I('quantidade', kind === 'colheita' ? 'Quantidade colhida' : 'Quantidade vendida', { mode: 'decimal' })}{S('unidade', 'Unidade', ['saca', 'kg', 't'])}{v.unidade === 'saca' && I('saca', 'Peso da saca (kg)', { mode: 'decimal', hint: 'Informe o peso usado; 60 kg é o mais comum.' })}{coffee && S('forma', 'Forma do café', ['Cereja', 'Coco', 'Beneficiado'], 'A quantidade vale para esta forma; não convertemos entre formas.')}</div>}
      {kind === 'colheita' && <><div className="form-grid">{I('umidade', 'Umidade (%)', { optional: true, mode: 'decimal' })}{I('qualidade', 'Qualidade ou classificação', { optional: true })}{I('perdas', 'Perdas estimadas (%)', { optional: true, mode: 'decimal' })}{S('origem', 'De onde vem o número', ['Pesagem', 'Romaneio do armazém', 'Estimativa própria'])}</div>
        <div className="card card--flat" aria-live="polite"><Stat label="Produtividade calculada com os valores acima" value={yieldKgHa == null ? '—' : n0(yieldKgHa)} unit="kg/ha" note={yieldKgHa == null ? 'Preencha quantidade, unidade (com peso da saca) e área colhida.' : `${n0(kg)} kg ÷ ${n1(area)} ha${v.unidade === 'saca' ? ` · ${n1(yieldKgHa / num(v.saca)!)} sacas/ha` : ''}`} /></div></>}
      {kind === 'venda' && <><div className="form-grid">{I('preco', `Preço por ${v.unidade}`, { mode: 'decimal' })}{S('moeda', 'Moeda', ['BRL', 'USD'])}{S('situacao', 'Situação', ['Realizado', 'Previsto'])}</div><div className="form-grid">{I('insumos', 'Custo de insumos e operações', { optional: true, mode: 'decimal' })}{I('frete', 'Frete', { optional: true, mode: 'decimal' })}{I('taxas', 'Taxas e impostos', { optional: true, mode: 'decimal' })}</div>
        <div className="card card--flat grid-2" aria-live="polite"><Stat label="Receita bruta" value={revenue == null ? '—' : money(revenue, v.moeda)} note={revenue == null ? 'Preencha quantidade e preço.' : `${v.quantidade} ${v.unidade} × ${v.preco} ${v.moeda}`} /><Stat label="Margem" value={margin == null ? '—' : money(margin, v.moeda)} note={margin == null ? 'Só é calculada com insumos, frete e taxas preenchidos (use 0 se não houve).' : 'Receita menos os três custos informados.'} /></div></>}
      {fail && <Notice tone="risk">{fail}</Notice>}
      <div className="row"><button className="btn btn--primary" disabled={busy}>{busy ? 'Salvando…' : editing ? 'Salvar alterações' : `Salvar ${KINDS[kind].toLowerCase()}`}</button><button type="button" className="btn" onClick={onCancel}>Fechar sem salvar</button>{!editing && <button type="button" className="btn btn--ghost" onClick={() => f.clear()}>Limpar rascunho</button>}</div>
      <p className="meta-13">Guardamos a data do evento, a data do registro e cada revisão. <Link to="/conta">Uso em pesquisa só com seu consentimento.</Link></p>
    </form>
  );
}

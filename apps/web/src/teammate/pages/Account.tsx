import { useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { account } from '../adapters';
import { resetAll, useStore } from '../store';
import { Dialog, Field, LinkBtn, Notice, Pill, useAsync } from '../ui';
import { supabase } from '../../features/auth/client';
import { backend } from '../adapters/http';

const Local = () => <Notice tone="warn" title="Modo local.">Propriedades, registros e planos continuam neste aparelho. A autenticação usa o serviço de contas; esses registros ainda não são sincronizados pelo backend.</Notice>;
function Sign({ mode }: { mode: 'entrar' | 'cadastro' }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const nav = useNavigate(); const errRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (err) errRef.current?.focus(); }, [err]);
  const go = async (e: React.FormEvent) => { e.preventDefault(); setErr(''); setMsg(''); if (mode === 'cadastro' && !name.trim()) { setErr('Informe seu nome.'); return; } setBusy(true); try {
    if (mode === 'cadastro') { await account.signUp(name.trim(), email.trim(), password); setPassword(''); setMsg('Confira seu e-mail para confirmar o cadastro. Abra o link neste mesmo navegador.'); }
    else { await account.signIn(name.trim(), email.trim(), password); setPassword(''); nav('/conta'); }
  } catch (x) { setErr((x as Error).message); } finally { setBusy(false); } };
  return <div className="page" style={{ maxWidth: 520 }}><h1>{mode === 'entrar' ? 'Entrar' : 'Criar conta'}</h1>
    {!supabase && <Notice tone="warn" title="Contas indisponíveis.">Configure o Supabase para entrar. A exploração e os registros locais continuam disponíveis sem conta.</Notice>}
    <form className="card" onSubmit={go}>{mode === 'cadastro' && <Field label="Seu nome">{(a) => <input className="input" autoComplete="name" required {...a} value={name} onChange={(e) => setName(e.target.value)} />}</Field>}
      <Field label="E-mail">{(a) => <input className="input" type="email" autoComplete="email" required {...a} value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
      <Field label="Senha" hint={mode === 'cadastro' ? 'Pelo menos 8 caracteres. A confirmação do e-mail é obrigatória.' : undefined}>{(a) => <input className="input" type="password" autoComplete={mode === 'cadastro' ? 'new-password' : 'current-password'} required minLength={mode === 'cadastro' ? 8 : 1} {...a} value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
      {err && <p role="alert" ref={errRef} tabIndex={-1} className="notice notice--risk" data-testid="form-error"><span />{err}</p>}
      <div className="row"><button className="btn btn--primary" disabled={busy || !supabase}>{busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}</button><LinkBtn to="/explorar">Continuar sem conta</LinkBtn></div>
      {msg && <p role="status" className="meta">{msg}</p>}
      {supabase && <div><button className="btn btn--sm" type="button" disabled={busy || !email.trim()} onClick={async () => { setBusy(true); setErr(''); try { await account.resend(email.trim()); setMsg('Se houver um cadastro aguardando confirmação, você receberá um novo e-mail. Abra o link mais recente neste navegador.'); } catch(x) { setErr((x as Error).message); } finally { setBusy(false); } }}>Reenviar confirmação</button></div>}
    </form>
    <p className="meta">{mode === 'entrar' ? <>Primeira vez? <Link to="/conta/cadastro">Criar conta</Link> · <Link to="/conta/recuperar">Recuperar acesso</Link></> : <>Já tem conta? <Link to="/conta">Entrar</Link></>}</p></div>;
}
function Recover() {
 const [email,setEmail]=useState(''); const [sent,setSent]=useState(false); const [err,setErr]=useState(''); const [busy,setBusy]=useState(false);
 return <div className="page" style={{maxWidth:520}}><h1>Recuperar acesso</h1><form className="card" onSubmit={async e=>{e.preventDefault();setBusy(true);setErr('');try{await account.recover(email.trim());setSent(true);}catch(x){setErr((x as Error).message);}finally{setBusy(false);}}}><Field label="E-mail da conta">{a=><input className="input" type="email" autoComplete="email" required {...a} value={email} onChange={e=>setEmail(e.target.value)} />}</Field>{err && <p role="alert" className="notice notice--risk" data-testid="form-error"><span />{err}</p>}<div><button className="btn btn--primary" disabled={busy || !supabase}>{busy?'Aguarde…':'Pedir recuperação'}</button></div>{!supabase && <Notice>O serviço de contas ainda não foi configurado neste ambiente.</Notice>}{sent && <p role="status" className="notice"><span />Se este e-mail estiver cadastrado, você receberá um link de recuperação. Abra-o neste mesmo navegador.</p>}</form><p className="meta"><Link to="/conta">Voltar</Link></p></div>;
}
function Profile() {
  const s = useStore((x) => x.session)!; const profile = useAsync(() => backend.me(), [s.userId]); const counts = useStore((x) => `${x.properties.length} propriedade(s), ${x.plots.length} talhão(ões), ${x.records.length} registro(s)`); const [ask, setAsk] = useState(false); const [msg, setMsg] = useState('');
  const exportJson = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([account.exportData()], { type: 'application/json' })); a.download = 'gaiapus-meus-dados.json'; a.click(); URL.revokeObjectURL(a.href); setMsg('Arquivo gerado. Nome e e-mail não entram na exportação.'); };
  return <div className="page" style={{ maxWidth: 760 }}><div className="page-head"><div className="stack-2"><h1>{s.name}</h1><p>{s.email}</p></div><Pill tone="ok">Conta conectada</Pill></div><Local />{profile.status === 'error' && <Notice tone="warn">Sua conta está conectada, mas o perfil da API está indisponível. <button className="btn btn--sm" onClick={profile.retry}>Tentar de novo</button></Notice>}
    <section className="card"><h2>Seus dados</h2><p>{counts} neste aparelho.</p><div className="row"><LinkBtn to="/propriedades">Propriedades e talhões</LinkBtn><LinkBtn to="/registros">Registros da safra</LinkBtn><button className="btn" onClick={exportJson}>Exportar meus dados</button></div>{msg && <p role="status" className="meta">{msg}</p>}</section>
    <section className="card"><h2>Uso em pesquisa</h2><p>Separado do uso básico do aplicativo. Com seu consentimento, colheitas registradas e revisadas poderão ajudar a treinar e validar modelos, sem identidade nem localização privada.</p>
      <label className="check"><input type="checkbox" checked={s.researchConsent} onChange={(e) => account.setConsent(e.target.checked).catch(x => { if (x.code !== 'account_changed') setMsg(x.message); })} /><span><b>Autorizo o uso dos meus registros em pesquisa</b><br /><span className="meta-13">{s.consentAt ? `${s.researchConsent ? 'Autorizado' : 'Revogado'} em ${new Date(s.consentAt).toLocaleString('pt-BR')}` : 'Você pode revogar a qualquer momento.'}</span></span></label>
      <p className="meta-13">Esta preferência é local. Registros de campo não são enviados para pesquisa por esta versão, com ou sem consentimento.</p></section>
    <div className="row"><button className="btn" onClick={() => account.signOut().catch(x => setMsg((x as Error).message))}>Sair</button><button className="btn btn--danger" onClick={() => setAsk(true)}>Apagar todos os dados deste aparelho</button></div>
    <Dialog open={ask} onClose={() => setAsk(false)} title="Apagar todos os dados locais?"><p>Propriedades, talhões, registros, planejamentos e rascunhos deste aparelho serão apagados. Não é possível desfazer.</p><div className="row"><button className="btn btn--danger" onClick={() => { resetAll(); setAsk(false); }}>Apagar tudo</button><button className="btn" onClick={() => setAsk(false)}>Cancelar</button></div></Dialog></div>;
}
export function AccountPage() { const s = useStore((x) => x.session); return <Routes><Route index element={s ? <Profile /> : <Sign mode="entrar" />} /><Route path="cadastro" element={<Sign mode="cadastro" />} /><Route path="recuperar" element={<Recover />} /></Routes>; }

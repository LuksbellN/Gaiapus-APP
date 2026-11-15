import { useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { account } from '../adapters';
import { resetAll, useStore } from '../store';
import { Dialog, Field, LinkBtn, Notice, Pill, useAsync } from '../ui';
import { supabase } from '../../features/auth/client';
import { backend } from '../adapters/http';
import { dDateTime } from '../format';
import { useI18n, type MessageKey } from '../i18n';
import { LanguageSelect } from '../ui/LanguageSelect';

const AUTH_CODES = ['signin_failed', 'signup_failed', 'reset_failed', 'resend_failed', 'signout_failed', 'identity_unavailable', 'account_changed'];
/** Authentication errors are shown by code in the current language; unknown errors keep their message. */
function useAuthError() {
  const { t } = useI18n();
  return (x: unknown) => { const code = (x as { code?: string })?.code; return code && AUTH_CODES.includes(code) ? t(`errors.auth.${code}` as MessageKey) : (x as Error)?.message ?? t('errors.generic'); };
}
function Local() { const { t } = useI18n(); return <Notice tone="warn" title={t('account.local.title')}>{t('account.local.text')}</Notice>; }
function Sign({ mode }: { mode: 'entrar' | 'cadastro' }) {
  const { t } = useI18n(); const authError = useAuthError();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const nav = useNavigate(); const errRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (err) errRef.current?.focus(); }, [err]);
  const go = async (e: React.FormEvent) => { e.preventDefault(); setErr(''); setMsg(''); if (mode === 'cadastro' && !name.trim()) { setErr(t('account.err.name')); return; } setBusy(true); try {
    if (mode === 'cadastro') { await account.signUp(name.trim(), email.trim(), password); setPassword(''); setMsg(t('account.msg.checkEmail')); }
    else { await account.signIn(name.trim(), email.trim(), password); setPassword(''); nav('/conta'); }
  } catch (x) { setErr(authError(x)); } finally { setBusy(false); } };
  return <div className="page" style={{ maxWidth: 520 }}><div className="row-between"><h1>{mode === 'entrar' ? t('account.signIn') : t('account.signUp')}</h1><LanguageSelect id="idioma-conta" /></div>
    {!supabase && <Notice tone="warn" title={t('account.unavailableTitle')}>{t('account.unavailable')}</Notice>}
    <form className="card" onSubmit={go}>{mode === 'cadastro' && <Field label={t('account.name')}>{(a) => <input className="input" autoComplete="name" required {...a} value={name} onChange={(e) => setName(e.target.value)} />}</Field>}
      <Field label={t('account.email')}>{(a) => <input className="input" type="email" autoComplete="email" required spellCheck={false} {...a} value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
      <Field label={t('account.password')} hint={mode === 'cadastro' ? t('account.passwordHint') : undefined}>{(a) => <input className="input" type="password" autoComplete={mode === 'cadastro' ? 'new-password' : 'current-password'} required minLength={mode === 'cadastro' ? 8 : 1} {...a} value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
      {err && <p role="alert" ref={errRef} tabIndex={-1} className="notice notice--risk" data-testid="form-error"><span />{err}</p>}
      <div className="row"><button className="btn btn--primary" disabled={busy || !supabase}>{busy ? t('account.wait') : mode === 'entrar' ? t('account.signIn') : t('account.signUp')}</button><LinkBtn to="/explorar">{t('account.continueWithout')}</LinkBtn></div>
      {msg && <p role="status" className="meta">{msg}</p>}
      {supabase && <div><button className="btn btn--sm" type="button" disabled={busy || !email.trim()} onClick={async () => { setBusy(true); setErr(''); try { await account.resend(email.trim()); setMsg(t('account.msg.resent')); } catch (x) { setErr(authError(x)); } finally { setBusy(false); } }}>{t('account.resend')}</button></div>}
    </form>
    <p className="meta">{mode === 'entrar' ? <>{t('account.firstTime')} <Link to="/conta/cadastro">{t('account.signUp')}</Link> · <Link to="/conta/recuperar">{t('account.recover')}</Link></> : <>{t('account.haveAccount')} <Link to="/conta">{t('account.signIn')}</Link></>}</p></div>;
}
function Recover() {
  const { t } = useI18n(); const authError = useAuthError();
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  return <div className="page" style={{ maxWidth: 520 }}><h1>{t('account.recover')}</h1><form className="card" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await account.recover(email.trim()); setSent(true); } catch (x) { setErr(authError(x)); } finally { setBusy(false); } }}><Field label={t('account.recoverEmail')}>{(a) => <input className="input" type="email" autoComplete="email" required spellCheck={false} {...a} value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>{err && <p role="alert" className="notice notice--risk" data-testid="form-error"><span />{err}</p>}<div><button className="btn btn--primary" disabled={busy || !supabase}>{busy ? t('account.wait') : t('account.requestRecovery')}</button></div>{!supabase && <Notice>{t('errors.auth.identity_unavailable')}</Notice>}{sent && <p role="status" className="notice"><span />{t('account.msg.recoverySent')}</p>}</form><p className="meta"><Link to="/conta">{t('account.back')}</Link></p></div>;
}
function Profile() {
  const { t } = useI18n(); const authError = useAuthError();
  const s = useStore((x) => x.session)!; const profile = useAsync(() => backend.me(), [s.userId]); const counts = useStore((x) => `${x.properties.length}|${x.plots.length}|${x.records.length}`).split('|'); const [ask, setAsk] = useState(false); const [msg, setMsg] = useState('');
  const exportJson = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([account.exportData()], { type: 'application/json' })); a.download = 'gaiapus-meus-dados.json'; a.click(); URL.revokeObjectURL(a.href); setMsg(t('account.msg.exported')); };
  return <div className="page" style={{ maxWidth: 760 }}><div className="page-head"><div className="stack-2"><h1>{s.name}</h1><p>{s.email}</p></div><Pill tone="ok">{t('account.connected')}</Pill></div><Local />{profile.status === 'error' && <Notice tone="warn">{t('account.profileDown')} <button className="btn btn--sm" onClick={profile.retry}>{t('common.retry')}</button></Notice>}
    <section className="card"><h2>{t('account.prefs')}</h2><div className="row-between"><span>{t('lang.label')}</span><LanguageSelect id="idioma-perfil" /></div><p className="meta-13">{t('account.prefsNote')}</p></section>
    <section className="card"><h2>{t('account.data')}</h2><p>{t('account.counts', { p: counts[0], t: counts[1], r: counts[2] })}</p><div className="row"><LinkBtn to="/propriedades">{t('nav.propertiesLong')}</LinkBtn><LinkBtn to="/registros">{t('records.title')}</LinkBtn><button className="btn" onClick={exportJson}>{t('account.export')}</button></div>{msg && <p role="status" className="meta">{msg}</p>}</section>
    <section className="card"><h2>{t('account.research.title')}</h2><p>{t('account.research.text')}</p>
      <label className="check"><input type="checkbox" checked={s.researchConsent} onChange={(e) => account.setConsent(e.target.checked).catch((x) => { if (x.code !== 'account_changed') setMsg(authError(x)); })} /><span><b>{t('account.research.consent')}</b><br /><span className="meta-13">{s.consentAt ? t(s.researchConsent ? 'account.research.granted' : 'account.research.revoked', { date: dDateTime(s.consentAt) }) : t('account.research.revocable')}</span></span></label>
      <p className="meta-13">{t('account.research.local')}</p></section>
    <div className="row"><button className="btn" onClick={() => account.signOut().catch((x) => setMsg(authError(x)))}>{t('account.signOut')}</button><button className="btn btn--danger" onClick={() => setAsk(true)}>{t('account.deleteAll')}</button></div>
    <Dialog open={ask} onClose={() => setAsk(false)} title={t('account.del.title')}><p>{t('account.del.text')}</p><div className="row"><button className="btn btn--danger" onClick={() => { resetAll(); setAsk(false); }}>{t('account.del.confirm')}</button><button className="btn" onClick={() => setAsk(false)}>{t('common.cancel')}</button></div></Dialog></div>;
}
export function AccountPage() { const s = useStore((x) => x.session); return <Routes><Route index element={s ? <Profile /> : <Sign mode="entrar" />} /><Route path="cadastro" element={<Sign mode="cadastro" />} /><Route path="recuperar" element={<Recover />} /></Routes>; }

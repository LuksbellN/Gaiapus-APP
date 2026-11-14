import { useState, type FormEvent } from 'react';
import { supabase } from './client';
import { authRedirect } from './urls';
import { useAuthSession } from './useAuthSession';

export function AuthPanel() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset' | 'resend'>('signin');
  const session = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (!supabase) return <div className="notice" role="status">O acesso por e-mail ainda não está configurado neste ambiente. Você pode continuar explorando os dados públicos sem cadastro.</div>;
  const auth = supabase.auth;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      if (mode === 'resend') {
        const { error } = await auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: authRedirect('callback') } });
        if (error) throw error;
        setMessage('Se houver um cadastro aguardando confirmação, você receberá um novo e-mail. Abra o link mais recente neste navegador.');
      } else if (mode === 'reset') {
        const { error } = await auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirect('recovery') });
        if (error) throw error;
        setMessage('Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha. Abra-o neste mesmo navegador.');
      } else if (mode === 'signup') {
        sessionStorage.setItem('gaiapus.auth.return', location.pathname + location.search);
        const { error } = await auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: authRedirect('callback') } });
        if (error) throw error;
        setPassword('');
        setMessage('Confira seu e-mail para confirmar o cadastro. Abra o link neste mesmo navegador. Após a confirmação, você poderá entrar.');
      } else {
        const { error } = await auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setPassword(''); setMessage('Você entrou na sua conta.');
      }
    } catch {
      setMessage(mode === 'signin' ? 'Não foi possível entrar. Confira e-mail e senha e confirme seu e-mail antes de tentar novamente.' : 'Não foi possível enviar o e-mail. Aguarde um momento e tente novamente.');
    } finally { setBusy(false); }
  }

  return <div className="auth-panel">
    {session ? <>
      <p>Conectado como <strong>{session.user.email}</strong>.</p>
      <p>Seus dados públicos continuam disponíveis para exploração.</p>
      <button className="primary-button" disabled={busy} onClick={async () => {
        setBusy(true);
        try { const { error } = await auth.signOut(); if (error) throw error; setMessage('Você saiu da conta.'); }
        catch { setMessage('Não foi possível sair. Tente novamente.'); }
        finally { setBusy(false); }
      }}>Sair da conta</button>
    </> : <>
      <p>{mode === 'signup' ? 'Crie sua conta e confirme seu e-mail.' : mode === 'reset' ? 'Receba um link seguro para criar uma nova senha.' : mode === 'resend' ? 'Receba um novo link de confirmação do cadastro.' : 'Entre na sua conta Gaiapus.'}</p>
      <form className="auth-form" onSubmit={submit}>
        <label>E-mail<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /></label>
        {(mode === 'signin' || mode === 'signup') && <label>Senha<input required type="password" minLength={mode === 'signup' ? 8 : 1} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></label>}
        {mode === 'signup' && <small>Use pelo menos 8 caracteres. A confirmação do e-mail é obrigatória.</small>}
        <button className="primary-button" disabled={busy}>{busy ? 'Aguarde…' : mode === 'signup' ? 'Criar conta' : mode === 'reset' || mode === 'resend' ? 'Enviar link' : 'Entrar'}</button>
      </form>
      <div className="auth-actions">
        {(['signin', 'signup', 'reset'] as const).filter(item => item !== mode).map(item => <button className="text-button" key={item} disabled={busy} onClick={() => { setMode(item); setMessage(''); setPassword(''); }}>{item === 'signin' ? 'Já tenho conta' : item === 'signup' ? 'Criar conta' : 'Esqueci minha senha'}</button>)}
        {mode === 'signin' && <button className="text-button" disabled={busy} onClick={() => { setMode('resend'); setMessage(''); setPassword(''); }}>Reenviar confirmação</button>}
      </div>
    </>}
    {message && <p className="notice" role="status">{message}</p>}
  </div>;
}

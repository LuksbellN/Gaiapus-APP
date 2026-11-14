import { useEffect, useState, type FormEvent } from 'react';

import { exchangeEmailCode, supabase } from './client';
import { callbackProblem, safeReturnPath } from './urls';
import { canResumeRecovery, clearRecovery, rememberRecovery } from './recovery';

export function AuthPage({ recovery }: { recovery: boolean }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'done'>('loading');
  const [message, setMessage] = useState('Verificando seu link…');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [emailUrl] = useState(() => new URL(location.href));
  const [returnPath] = useState(() => safeReturnPath(sessionStorage.getItem('gaiapus.auth.return') ?? '/#/explorar'));

  useEffect(() => {
    const url = emailUrl;
    const problem = !supabase ? 'O acesso por e-mail ainda não está configurado neste ambiente.' : callbackProblem(url);
    const code = url.searchParams.get('code');
    let active = true;
    // Remove codes and provider errors from browser history immediately.
    history.replaceState(null, '', location.pathname);
    if (problem || !code) {
      if (recovery && supabase && !code && !url.hash && !url.searchParams.has('error')) {
        void supabase.auth.getSession().then(({ data, error }) => {
          if (!active) return;
          const valid = !error && canResumeRecovery(data.session);
          setStatus(valid ? 'ready' : 'error');
          setMessage(valid ? 'Escolha uma nova senha para sua conta.' : problem ?? 'Solicite um novo link de recuperação.');
        }).catch(() => { if (active) { setStatus('error'); setMessage('Não foi possível recuperar a sessão. Solicite um novo link.'); } });
      } else { setStatus('error'); setMessage(problem ?? 'Link inválido.'); }
      return () => { active = false; };
    }
    void exchangeEmailCode(code).then(session => {
      if (!active) return;
      if (recovery) rememberRecovery(session);
      setStatus(recovery ? 'ready' : 'done');
      setMessage(recovery ? 'Escolha uma nova senha para sua conta.' : 'E-mail confirmado. Sua conta está conectada.');
      sessionStorage.removeItem('gaiapus.auth.return');
    }).catch(() => {
      if (!active) return;
      setStatus('error');
      setMessage('Não foi possível validar este link. Ele pode ter expirado, já ter sido usado ou ter sido aberto em outro navegador. Solicite um novo e-mail.');
    });
    return () => { active = false; };
  }, [recovery, emailUrl]);

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) { setMessage('As senhas precisam ser iguais.'); return; }
    setBusy(true);
    try {
      const result = await supabase!.auth.updateUser({ password });
      if (result.error) throw result.error;
      clearRecovery();
      setPassword(''); setConfirm(''); setStatus('done'); setMessage('Sua senha foi atualizada.');
    } catch { setMessage('Não foi possível atualizar a senha. Use uma senha diferente, com pelo menos 8 caracteres, e tente novamente.'); }
    finally { setBusy(false); }
  }

  return <main className="page" style={{ maxWidth: 520 }}><section className="card" aria-labelledby="auth-title">

    <h1 id="auth-title">{recovery ? 'Recuperar acesso' : 'Confirmar e-mail'}</h1>
    <p role="status">{message}</p>
    {status === 'ready' && <form className="stack" onSubmit={updatePassword}>
      <label>Nova senha<input className="input" autoComplete="new-password" type="password" required minLength={8} value={password} disabled={busy} onChange={e => setPassword(e.target.value)} /></label>
      <label>Confirmar nova senha<input className="input" autoComplete="new-password" type="password" required minLength={8} value={confirm} disabled={busy} onChange={e => setConfirm(e.target.value)} /></label>
      <button className="btn btn--primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar nova senha'}</button>
    </form>}
    {status === 'error' && supabase && <div className="row"><a className="btn" href="/#/conta/recuperar">Pedir novo link</a><a className="btn" href="/#/conta">Entrar ou reenviar confirmação</a></div>}
    <a className="btn" href={returnPath}>Voltar à exploração</a>
  </section></main>;
}

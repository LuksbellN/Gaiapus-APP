import { useEffect, useState, type FormEvent } from 'react';

import { exchangeEmailCode, supabase } from './client';
import { callbackProblemKey, safeReturnPath } from './urls';
import { canResumeRecovery, clearRecovery, rememberRecovery } from './recovery';
import { useI18n, type MessageKey } from '../../teammate/i18n';
import { LanguageSelect } from '../../teammate/ui/LanguageSelect';

// The PKCE flow is unchanged; only the visible text is a message key, so switching language re-renders it.
export function AuthPage({ recovery }: { recovery: boolean }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'done'>('loading');
  const [message, setMessage] = useState<MessageKey>('auth.checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [emailUrl] = useState(() => new URL(location.href));
  const [returnPath] = useState(() => safeReturnPath(sessionStorage.getItem('gaiapus.auth.return') ?? '/#/explorar'));

  useEffect(() => {
    const url = emailUrl;
    const problem: MessageKey | null = !supabase ? 'auth.notConfigured' : callbackProblemKey(url);
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
          setMessage(valid ? 'auth.choosePassword' : problem ?? 'auth.requestNew');
        }).catch(() => { if (active) { setStatus('error'); setMessage('auth.sessionFailed'); } });
      } else { setStatus('error'); setMessage(problem ?? 'auth.invalid'); }
      return () => { active = false; };
    }
    void exchangeEmailCode(code).then(session => {
      if (!active) return;
      if (recovery) rememberRecovery(session);
      setStatus(recovery ? 'ready' : 'done');
      setMessage(recovery ? 'auth.choosePassword' : 'auth.confirmed');
      sessionStorage.removeItem('gaiapus.auth.return');
    }).catch(() => {
      if (!active) return;
      setStatus('error');
      setMessage('auth.validateFailed');
    });
    return () => { active = false; };
  }, [recovery, emailUrl]);

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) { setMessage('auth.mismatch'); return; }
    setBusy(true);
    try {
      const result = await supabase!.auth.updateUser({ password });
      if (result.error) throw result.error;
      clearRecovery();
      setPassword(''); setConfirm(''); setStatus('done'); setMessage('auth.updated');
    } catch { setMessage('auth.updateFailed'); }
    finally { setBusy(false); }
  }

  return <main className="page" style={{ maxWidth: 520 }}><section className="card" aria-labelledby="auth-title">
    <div className="row-between"><h1 id="auth-title">{recovery ? t('auth.titleRecovery') : t('auth.titleConfirm')}</h1><LanguageSelect id="idioma-auth" /></div>
    <p role="status">{t(message)}</p>
    {status === 'ready' && <form className="stack" onSubmit={updatePassword}>
      <label>{t('auth.newPassword')}<input className="input" autoComplete="new-password" type="password" required minLength={8} value={password} disabled={busy} onChange={e => setPassword(e.target.value)} /></label>
      <label>{t('auth.confirmPassword')}<input className="input" autoComplete="new-password" type="password" required minLength={8} value={confirm} disabled={busy} onChange={e => setConfirm(e.target.value)} /></label>
      <button className="btn btn--primary" disabled={busy}>{busy ? t('auth.saving') : t('auth.save')}</button>
    </form>}
    {status === 'error' && supabase && <div className="row"><a className="btn" href="/#/conta/recuperar">{t('auth.newLink')}</a><a className="btn" href="/#/conta">{t('auth.signInOrResend')}</a></div>}
    <a className="btn" href={returnPath}>{t('auth.backToExplore')}</a>
  </section></main>;
}

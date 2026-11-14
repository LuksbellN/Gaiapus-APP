import type { Session as SupabaseSession } from '@supabase/supabase-js';
import { supabase } from '../../features/auth/client';
import { authRedirect } from '../../features/auth/urls';
import { activateAccount, getState, setState } from '../store';
import { backend } from './http';
import { AdapterError } from './core';

export function syncSession(session: SupabaseSession | null) {
  const user = session?.user;
  if (!user || !user.email_confirmed_at) { activateAccount(null); return; }
  activateAccount({ userId: user.id, name: user.user_metadata.display_name || user.email?.split('@')[0] || 'Minha conta', email: user.email ?? '', researchConsent: false, consentAt: null });
  // Fetch profile outside onAuthStateChange's lock and discard late responses after logout/account switching.
  void backend.me().then(me => {
    if (getState().session?.userId !== user.id || !me.profile.display_name) return;
    setState({ session: { ...getState().session!, name: me.profile.display_name } });
  }).catch(() => { /* The account page shows API availability separately; identity remains Supabase-owned. */ });
}

export async function initializeSessionBridge() {
  if (!supabase) { activateAccount(null); return; }
  const { data } = await supabase.auth.getSession();
  syncSession(data.session);
  supabase.auth.onAuthStateChange((_event, session) => { setTimeout(() => syncSession(session), 0); });
}

function configured() {
  if (!supabase) throw new AdapterError('identity_unavailable', 503, 'O serviço de contas ainda não foi configurado neste ambiente.');
  return supabase.auth;
}
export const authAccount = {
  async signIn(_name: string, email: string, password: string) {
    const { data, error } = await configured().signInWithPassword({ email, password });
    if (error) throw new AdapterError('signin_failed', 401, 'Confira e-mail e senha. Confirme seu e-mail antes de entrar.');
    syncSession(data.session);
  },
  async signUp(name: string, email: string, password: string) {
    sessionStorage.setItem('gaiapus.auth.return', '/#/conta');
    const { error } = await configured().signUp({ email, password, options: { emailRedirectTo: authRedirect('callback'), data: { display_name: name } } });
    if (error) throw new AdapterError('signup_failed', 400, 'Não foi possível criar a conta. Confira os dados e tente novamente.');
  },
  async recover(email: string) {
    const { error } = await configured().resetPasswordForEmail(email, { redirectTo: authRedirect('recovery') });
    if (error) throw new AdapterError('reset_failed', 400, 'Não foi possível enviar o link. Aguarde e tente novamente.');
  },
  async resend(email: string) {
    const { error } = await configured().resend({ type: 'signup', email, options: { emailRedirectTo: authRedirect('callback') } });
    if (error) throw new AdapterError('resend_failed', 400, 'Não foi possível reenviar o link. Aguarde e tente novamente.');
  },
  async signOut() {
    const { error } = await configured().signOut();
    if (error) throw new AdapterError('signout_failed', 400, 'Não foi possível sair. Tente novamente.');
    activateAccount(null);
  },
};

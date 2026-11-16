import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const { exchange, update, getSession } = vi.hoisted(() => ({ exchange: vi.fn(), update: vi.fn(), getSession: vi.fn() }));
vi.mock('./client', () => ({ completeEmailLink: exchange, supabase: { auth: { updateUser: update, getSession } } }));
vi.mock('./AuthPanel', () => ({ AuthPanel: () => <p>Solicite outro link</p> }));
import { AuthPage } from './AuthPage';
import { rememberRecovery } from './recovery';
import type { Session } from '@supabase/supabase-js';

describe('email callback screens', () => {
  beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });
  it('handles StrictMode and removes the code from browser history', async () => {
    history.replaceState(null, '', '/auth/callback?code=one-use');
    exchange.mockResolvedValue({ user: { id: 'user' } });
    render(<StrictMode><AuthPage recovery={false} /></StrictMode>);
    expect(await screen.findByText('E-mail confirmado. Sua conta está conectada.')).toBeInTheDocument();
    expect(location.search).toBe('');
    expect(exchange).toHaveBeenCalledWith(expect.objectContaining({ search: '?code=one-use' }), false);
  });
  it('does not expose password updates for missing or expired codes', async () => {
    history.replaceState(null, '', '/auth/recovery#error=access_denied');
    render(<AuthPage recovery />);
    expect(await screen.findByText(/expirou/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
    expect(exchange).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
  it('accepts implicit signup links and strips tokens from browser history', async () => {
    history.replaceState(null, '', '/auth/callback#access_token=access&refresh_token=refresh&type=signup');
    exchange.mockResolvedValue({ user: { id: 'user' } });
    render(<AuthPage recovery={false} />);
    expect(await screen.findByText('E-mail confirmado. Sua conta está conectada.')).toBeInTheDocument();
    expect(exchange).toHaveBeenCalledWith(expect.objectContaining({ hash: '#access_token=access&refresh_token=refresh&type=signup' }), false);
    expect(location.hash).toBe('');
  });
  it('requires matching passwords after a successful recovery exchange', async () => {
    history.replaceState(null, '', '/auth/recovery?code=recover');
    exchange.mockResolvedValue({ user: { id: 'user' } });
    update.mockResolvedValue({ error: null });
    render(<AuthPage recovery />);
    const password = await screen.findByLabelText('Nova senha');
    fireEvent.change(password, { target: { value: 'new-password-123' } });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'different-123' } });
    fireEvent.click(screen.getByText('Salvar nova senha'));
    expect(await screen.findByText('As senhas precisam ser iguais.')).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'new-password-123' } });
    fireEvent.click(screen.getByText('Salvar nova senha'));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ password: 'new-password-123' }));
    expect(await screen.findByText('Sua senha foi atualizada.')).toBeInTheDocument();
  });
  it('keeps password fields hidden when the exchange is rejected', async () => {
    history.replaceState(null, '', '/auth/recovery?code=used');
    exchange.mockRejectedValue(new Error('expired'));
    render(<AuthPage recovery />);
    expect(await screen.findByText(/Não foi possível validar/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
  });
  it('restores the password form on refresh only for the verified recovery session', async () => {
    const session = { user: { id: 'user' }, expires_at: 123 } as Session;
    rememberRecovery(session);
    getSession.mockResolvedValue({ data: { session }, error: null });
    history.replaceState(null, '', '/auth/recovery');
    render(<AuthPage recovery />);
    expect(await screen.findByLabelText('Nova senha')).toBeInTheDocument();
    expect(exchange).not.toHaveBeenCalled();
  });
});

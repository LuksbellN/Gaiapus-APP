import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const { signup, reset, signin, resend } = vi.hoisted(() => ({ signup: vi.fn(), reset: vi.fn(), signin: vi.fn(), resend: vi.fn() }));
vi.mock('./client', () => ({ supabase: { auth: {
  getSession: async () => ({ data: { session: null } }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  signUp: signup, resetPasswordForEmail: reset, signInWithPassword: signin, resend,
} } }));
import { AuthPanel } from './AuthPanel';
beforeEach(() => { vi.clearAllMocks(); history.replaceState(null, '', '/?area=123'); });
it('sends signup confirmation to the registered callback and preserves exploration', async () => {
  signup.mockResolvedValue({ error: null });
  render(<AuthPanel />);
  fireEvent.click(screen.getByText('Criar conta'));
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'test@example.com' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password-123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
  await waitFor(() => expect(signup).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password-123', options: { emailRedirectTo: `${location.origin}/auth/callback` } }));
  expect(sessionStorage.getItem('gaiapus.auth.return')).toBe('/?area=123');
  expect(await screen.findByText(/Confira seu e-mail/)).toBeInTheDocument();
});
it('sends reset emails to recovery and uses a neutral account-existence message', async () => {
  reset.mockResolvedValue({ error: null });
  render(<AuthPanel />);
  fireEvent.click(screen.getByText('Esqueci minha senha'));
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'test@example.com' } });
  fireEvent.click(screen.getByText('Enviar link'));
  await waitFor(() => expect(reset).toHaveBeenCalledWith('test@example.com', { redirectTo: `${location.origin}/auth/recovery` }));
  expect(await screen.findByText(/Se este e-mail estiver cadastrado/)).toBeInTheDocument();
});
it('lets an expired confirmation link be replaced', async () => {
  resend.mockResolvedValue({ error: null });
  render(<AuthPanel />);
  fireEvent.click(screen.getByText('Reenviar confirmação'));
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'test@example.com' } });
  fireEvent.click(screen.getByText('Enviar link'));
  await waitFor(() => expect(resend).toHaveBeenCalledWith({ type: 'signup', email: 'test@example.com', options: { emailRedirectTo: `${location.origin}/auth/callback` } }));
  expect(await screen.findByText(/cadastro aguardando confirmação/)).toBeInTheDocument();
});

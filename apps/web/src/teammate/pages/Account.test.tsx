import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
const { signIn, signUp, resend } = vi.hoisted(() => ({ signIn: vi.fn(), signUp: vi.fn(), resend: vi.fn() }));
vi.mock('../../features/auth/client', () => ({ supabase: { auth: {} }, currentAccessToken: () => null }));
vi.mock('../adapters', async (orig) => ({ ...(await orig<typeof import('../adapters')>()), account: { signIn, signUp, resend, recover: vi.fn() } }));
import { AccountPage } from './Account';

it('falha de login aparece como erro do formulário, com foco, e não marca o e-mail como inválido (D-16)', async () => {
  signIn.mockRejectedValue(Object.assign(new Error('Confira e-mail e senha. Confirme seu e-mail antes de entrar.'), { code: 'signin_failed' }));
  render(<MemoryRouter initialEntries={['/']}><AccountPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'x' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  const alert = await screen.findByTestId('form-error');
  expect(alert).toHaveTextContent('Confira e-mail e senha');
  await waitFor(() => expect(alert).toHaveFocus());
  expect(screen.getByLabelText('E-mail')).not.toHaveAttribute('aria-invalid');
});

it('replaces successful signup with a focused email confirmation and resend cooldown', async () => {
  signUp.mockResolvedValue(undefined);
  render(<MemoryRouter initialEntries={['/cadastro']}><AccountPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password-123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
  const heading = await screen.findByRole('heading', { name: 'Confira seu e-mail' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(screen.getByRole('status')).toHaveTextContent('ana@example.com');
  expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Reenviar em/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Corrigir e-mail' }));
  expect(screen.getByLabelText('Senha')).toHaveValue('');
});

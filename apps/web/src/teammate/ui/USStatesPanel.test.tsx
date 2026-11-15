import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { LocationSummary } from '../adapters/locations';
import { loadUSStates } from '../geo/usStates';
import { USStatesPanel } from './USStatesPanel';

const items = [{ id: 'US:fips:19169', country: 'US', admin1_code: 'US-IA', admin1_name: 'Iowa', code: '19169', scheme: 'fips', name: 'Story County' }] as LocationSummary[];
const defaults = { stateCode: null, items, loading: false, error: null, retry: vi.fn(), locationsLoading: false, locationsError: null, retryLocations: vi.fn(), onPick: vi.fn() };
it('lists every state, searches and selects Iowa, and keeps the existing county link', async () => {
  render(<USStatesPanel {...defaults} states={await loadUSStates()} />);
  expect(within(screen.getByTestId('us-state-list')).getAllByRole('button')).toHaveLength(51);
  fireEvent.change(screen.getByLabelText('Buscar estado americano'), { target: { value: 'Iowa' } });
  const button = within(screen.getByTestId('us-state-list')).getByRole('button');
  fireEvent.click(button);
  expect(defaults.onPick).toHaveBeenCalledWith('US-IA');
  expect(screen.getByRole('link', { name: /Story County/ })).toHaveAttribute('href', '#/municipio?id=US%3Afips%3A19169');
});
it('distinguishes unavailable data from a catalog error', async () => {
  const props = { ...defaults, states: await loadUSStates(), stateCode: 'US-CA' };
  const { rerender } = render(<USStatesPanel {...props} />);
  expect(screen.getByText('Ainda não há dados agrícolas publicados para este estado.')).toBeVisible();
  expect(screen.queryByText('Story County')).not.toBeInTheDocument();
  rerender(<USStatesPanel {...props} locationsError={new Error('offline')} />);
  expect(screen.queryByText('Ainda não há dados agrícolas publicados para este estado.')).not.toBeInTheDocument();
  expect(screen.getByText(/Não foi possível consultar os dados dos condados/)).toBeVisible();
});

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

it('with county boundaries loaded, lists every county of the state: published ones first, the rest selectable', async () => {
  const { loadUSCounties } = await import('../geo/usStates');
  const counties = await loadUSCounties('US-IA');
  const onPickCounty = vi.fn();
  render(<USStatesPanel {...defaults} states={await loadUSStates()} stateCode="US-IA" counties={counties} onPickCounty={onPickCounty} />);
  const list = screen.getByTestId('us-county-list');
  const rows = within(list).getAllByRole('listitem');
  expect(rows).toHaveLength(99);
  expect(rows[0]).toHaveTextContent('Story');
  expect(rows[0]).toHaveTextContent('Dados agrícolas');
  expect(rows[1]).not.toHaveTextContent('Dados agrícolas');
  fireEvent.change(screen.getByLabelText('Buscar condado'), { target: { value: 'Polk' } });
  fireEvent.click(within(screen.getByTestId('us-county-list')).getByRole('button', { name: /Polk/ }));
  expect(onPickCounty).toHaveBeenCalledWith('US:fips:19153');
});

it('a county without data says so; a county with data links to its place screen', async () => {
  const { loadUSCounties } = await import('../geo/usStates');
  const counties = await loadUSCounties('US-IA');
  const props = { ...defaults, states: await loadUSStates(), stateCode: 'US-IA', counties, onPickCounty: vi.fn() };
  const { rerender } = render(<USStatesPanel {...props} countyCode="US:fips:19153" />);
  expect(screen.getByTestId('us-county-detail')).toHaveTextContent('Polk');
  expect(screen.getByTestId('us-county-detail')).toHaveTextContent('Ainda não há dados agrícolas publicados para este condado');
  rerender(<USStatesPanel {...props} countyCode="US:fips:19169" />);
  expect(within(screen.getByTestId('us-county-detail')).getByRole('link')).toHaveAttribute('href', '#/municipio?id=US%3Afips%3A19169');
});


it('separates geographic boundary, agricultural data and scenario runs; none implies a validated model', async () => {
  const { loadUSCounties } = await import('../geo/usStates');
  const counties = await loadUSCounties('US-IA');
  const props = { ...defaults, states: await loadUSStates(), stateCode: 'US-IA', counties, onPickCounty: vi.fn(), extraCovered: ['US:fips:19153'] };
  const { rerender } = render(<USStatesPanel {...props} />);
  const rows = within(screen.getByTestId('us-county-list')).getAllByRole('listitem');
  expect(rows[0]).toHaveTextContent('Dados agrícolas'); // Story: published location core
  expect(rows[1]).toHaveTextContent('Polk');
  expect(rows[1]).toHaveTextContent('Cenários');          // Polk: only a published scenario run
  expect(rows[1]).not.toHaveTextContent('Dados agrícolas');
  rerender(<USStatesPanel {...props} countyCode="US:fips:19153" />);
  const detail = screen.getByTestId('us-county-detail');
  expect(detail).toHaveTextContent('Limite geográfico: disponível');
  expect(detail).toHaveTextContent('Dados agrícolas: não publicados');
  expect(detail).toHaveTextContent('Cenários de planejamento: publicados');
  expect(detail).toHaveTextContent('não significa ter todos os produtos nem um modelo de IA validado');
  expect(within(detail).queryByRole('link')).toBeNull();
  rerender(<USStatesPanel {...props} countyCode="US:fips:19001" />);
  expect(screen.getByTestId('us-county-detail')).toHaveTextContent('Cenários de planejamento: não publicados');
});

it('names the boundary vintage and warns that it may differ from current limits', async () => {
  const { loadUSCounties } = await import('../geo/usStates');
  render(<USStatesPanel {...defaults} states={await loadUSStates()} stateCode="US-IA" counties={await loadUSCounties('US-IA')} onPickCounty={vi.fn()} />);
  expect(screen.getByTestId('us-county-source')).toHaveTextContent('2017');
  expect(screen.getByTestId('us-county-source')).toHaveTextContent('Connecticut');
});

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Country } from '../adapters';
import { mockCatalog } from '../geo/catalog-mock.test-helper';
import { resetCoverageIndexForTest } from '../geo/coverageIndex';
import { Explore } from './Explore';

vi.mock('../../features/auth/client', () => ({ currentAccessToken: () => null }));
vi.mock('../adapters', () => ({
  countryName: (country: Country) => country.names['pt-BR'],
  geography: {
    countries: async () => ({ data: countries, meta }),
    states: async () => ({ data: { type: 'FeatureCollection', features: [
      { properties: { code: '31', sigla: 'MG', name: 'Minas Gerais' } },
      { properties: { code: '51', sigla: 'MT', name: 'Mato Grosso' } },
    ] }, meta }),
    municipalities: async () => ({ data: { type: 'FeatureCollection', features: [
      { properties: { code: '3106200', name: 'Belo Horizonte' } },
    ] }, meta }),
  },
  coverage: { get: async (code: string) => ({ data: { code, level: 'sem_analise', products: [], missing: [] }, meta }) },
  imagery: { series: vi.fn() },
}));
vi.mock('../adapters/locations', () => ({ locations: { list: async () => [
  { id: 'US:fips:19169', country: 'US', admin1_code: 'US-IA', admin1_name: 'Iowa', code: '19169', scheme: 'fips', name: 'Story County', centroid: [-93.47, 42.04] },
] } }));
vi.mock('../adapters/simulations', () => ({ simulations: { capabilities: async () => ({ places: [] }) } }));
vi.mock('../map/ExplorerMap', async () => {
  const { forwardRef } = await import('react');
  return { default: forwardRef(() => null) };
});

const meta = { kind: 'publicacao', source: 'Geography fixture' };
const country = (code: string, a2: string, name: string): Country => ({
  code, a2, names: { 'pt-BR': name, en: name, es: name, fr: name, de: name },
  aliases: [name, code], continent: 'South America', bbox: [[-80, -55], [-30, 10]],
});
const countries = [country('BR', 'BR', 'Brasil'), country('USA', 'US', 'Estados Unidos'), country('ARG', 'AR', 'Argentina')];

function NavigationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output data-testid="current-route">{location.pathname}{location.search}</output><button onClick={() => navigate(-1)}>Browser back</button></>;
}
const open = (query: string) => render(<MemoryRouter initialEntries={[`/explorar${query}`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Explore /><NavigationProbe /></MemoryRouter>);
const routeParams = () => new URL(screen.getByTestId('current-route').textContent!, 'https://gaiapus.test').searchParams;

async function expectCountryChoice() {
  await waitFor(() => expect(within(screen.getByRole('list', { name: 'Países' })).getAllByRole('button')).toHaveLength(2));
  const list = within(screen.getByRole('list', { name: 'Países' }));
  expect(list.getByRole('button', { name: /Brasil/ })).toBeVisible();
  expect(list.getByRole('button', { name: /Estados Unidos/ })).toBeVisible();
  expect(list.queryByRole('button', { name: /Argentina/ })).not.toBeInTheDocument();
  expect(document.querySelector('.crumbs [aria-current]')).toHaveTextContent('Mundo');
  expect(screen.queryByTestId('with-data')).not.toBeInTheDocument();
  expect(screen.queryByTestId('abroad-list')).not.toBeInTheDocument();
  expect(screen.queryByText('Story County')).not.toBeInTheDocument();
  expect(routeParams().get('dados')).toBe('1');
  for (const key of ['pais', 'uf', 'mun']) expect(routeParams().has(key)).toBe(false);
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));
  resetCoverageIndexForTest();
  mockCatalog();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('regions with data navigation', () => {
  it.each(['?pais=ARG', '?pais=BR&uf=31&mun=3106200'])('opens countries first from %s', async (query) => {
    open(query);
    fireEvent.click(await screen.findByRole('button', { name: 'Ver regiões com dados' }));
    await expectCountryChoice();
  });

  it('returns from Brazil to the world when enabling regions with data', async () => {
    open('?pais=BR');
    fireEvent.click(await screen.findByRole('button', { name: /^Regiões com dados/ }));
    await expectCountryChoice();
  });

  it('opens a shared data link at the country choice, then shows only Brazilian places after selecting Brazil', async () => {
    open('?dados=1');
    await expectCountryChoice();
    fireEvent.click(within(screen.getByRole('list', { name: 'Países' })).getByRole('button', { name: /Brasil/ }));
    const places = await screen.findByTestId('with-data');
    for (const name of ['Sorriso', 'Uberlândia', 'Barreiras', 'Rio Verde']) expect(places).toHaveTextContent(name);
    expect(screen.queryByText('Story County')).not.toBeInTheDocument();
    expect(screen.queryByTestId('abroad-list')).not.toBeInTheDocument();
    expect(routeParams().get('pais')).toBe('BR');
    expect(routeParams().get('dados')).toBe('1');
  });

  it('restores all countries when hidden and restores the data filter with browser back', async () => {
    open('?dados=1');
    await expectCountryChoice();
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar regiões com dados' }));
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Países' })).getAllByRole('button')).toHaveLength(3));
    expect(within(screen.getByRole('list', { name: 'Países' })).getByRole('button', { name: /Argentina/ })).toBeVisible();
    expect(routeParams().has('dados')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
    await expectCountryChoice();
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import daily from '../data/sorriso-daily.json';
import projection from '../data/fixtures/water-soy-5107925-N10.json';
vi.mock('../../features/auth/client', () => ({ supabase: { auth: {} }, currentAccessToken: () => null }));
vi.mock('../adapters', async (orig) => ({
  ...(await orig<typeof import('../adapters')>()),
  weather: {
    dailySeries: async () => ({ data: daily, meta: { kind: 'fixture', source: daily.source } }),
    waterProjection: async () => ({ data: projection, meta: { kind: 'fixture', source: 'Open-Meteo' } }),
  },
  crops: { yieldEstimate: () => new Promise(() => {}) },
}));
import { Simulator } from './Simulator';

window.matchMedia ??= ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const open = (query: string) => render(<MemoryRouter initialEntries={[`/simulador${query ? `${query}&modo=historico` : '?modo=historico'}`]}><Simulator /></MemoryRouter>);
const panel = () => screen.getByRole('complementary', { name: 'Indicadores no dia selecionado' });

it('field view stays the default; the profile view is an alternative over the same day', async () => {
  open('?dia=60');
  expect(await screen.findByRole('radio', { name: 'Talhão' })).toBeChecked();
  expect(screen.queryByTestId('profile-2d')).toBeNull();
  const before = within(panel()).getByText('Água no dia').closest('.card')!.textContent;
  fireEvent.click(screen.getByRole('radio', { name: 'Perfil do solo' }));
  const profile = await screen.findByTestId('profile-2d');
  // Same day, same numbers: switching the view recalculates nothing.
  expect(within(panel()).getByText('Água no dia').closest('.card')!.textContent).toBe(before);
  const scen = daily.scenarios.reference_fallow; const i = scen.agricultural_year.indexOf('2020/2021') + 59;
  expect(profile).toHaveAttribute('data-date', scen.date[i]);
  expect(Number(profile.getAttribute('data-water'))).toBe(scen.available_water_fraction[i]);
});

it('the published bucket has no root depth: profile shows the root-zone mean and says why there are no roots', async () => {
  open('?vista=perfil');
  const profile = await screen.findByTestId('profile-2d');
  // The bucket gives no root depth: roots are illustrative (no centimetres), probes stay absent.
  expect(within(profile).getByTestId('roots')).toHaveAttribute('data-root-source', 'illustrative');
  expect(within(profile).queryByTestId('probe')).toBeNull();
  expect(screen.getByText(/único reservatório/)).toBeInTheDocument();
  expect(screen.getAllByText(/Ilustração do cenário/).length).toBeGreaterThan(0);
});

it('the Gaiapus stake can be shown or hidden; its electrodes carry no per-depth reading from a single bucket', async () => {
  open('?vista=perfil&dia=60');
  const profile = await screen.findByTestId('profile-2d');
  const toggle = screen.getByRole('checkbox', { name: /Mostrar a estaca/ });
  expect(toggle).toBeChecked();
  expect(within(profile).getByTestId('device')).toBeInTheDocument();
  expect(within(profile).getAllByTestId('electrode')).toHaveLength(2);
  expect(within(profile).getAllByText(/sem leitura por camada/)).toHaveLength(2);
  expect(within(profile).getByText(/LED · modelo/)).toBeInTheDocument();
  expect(within(profile).getAllByTestId('ruler-tick').map((t) => t.textContent)).toEqual(['0 cm', '15 cm', '40 cm', '100 cm', '150 cm']);
  const before = within(panel()).getByText('Água no dia').closest('.card')!.textContent;
  fireEvent.click(toggle);
  expect(within(screen.getByTestId('profile-2d')).queryByTestId('device')).toBeNull();
  expect(within(screen.getByTestId('profile-2d')).queryAllByTestId('ruler-tick')).toHaveLength(0);
  expect(within(panel()).getByText('Água no dia').closest('.card')!.textContent).toBe(before);
});

it('roots grow along the timeline, come back identical, can be hidden, and are absent on bare fallow', async () => {
  const segs = async (dia: number) => { const v = open(`?vista=perfil&dia=${dia}&semwebgl=1`); const n = Number((await screen.findByTestId('roots')).getAttribute('data-segments')); v.unmount(); return n; };
  const d20 = await segs(20), d70 = await segs(70), back = await segs(20);
  expect(d70).toBeGreaterThan(d20);
  expect(back).toBe(d20);
  const v = open('?vista=perfil&dia=70');
  const roots = await screen.findByTestId('roots');
  expect(roots).toHaveAttribute('data-root-architecture', 'taproot');
  expect(within(screen.getByTestId('profile-2d')).queryByText(/cm · modelada/)).toBeNull();
  expect(screen.getByRole('checkbox', { name: 'Solo em corte' })).toBeChecked();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar raízes' }));
  expect(screen.queryByTestId('roots')).toBeNull();
  v.unmount();
  open('?vista=perfil&dia=300');
  await screen.findByTestId('profile-2d');
  expect(screen.queryByTestId('roots')).toBeNull(); // 2021-07-31: bare fallow after the maize harvest
});

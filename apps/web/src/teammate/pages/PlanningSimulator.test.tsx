// Season planning 2027/2028 over the REAL pinned regional publication (apps/api/public/publications/future-simulation-v1).
import { fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';

// Vitest runs from apps/web; jsdom gives import.meta.url a non-file scheme.
const ROOT = join(process.cwd(), '..', 'api', 'public', 'publications', 'future-simulation-v1');
const json = (p: string) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const index = json('index.json'), catalog = json('catalog.json');
const runOf = (id: string) => json(`runs/${id}/run.json`);
const seriesOf = (id: string) => {
  const full = JSON.parse(gunzipSync(readFileSync(join(ROOT, 'runs', id, 'series.json.gz'))).toString('utf8')); const rep = runOf(id).representative;
  const pick = (role: 'central' | 'dry' | 'wet') => ({ ...full.members.find((m: { member_id: string }) => m.member_id === rep[role]), role });
  return { run_id: id, dates: full.dates, capacity_mm: full.capacity_mm, day_kind: full.day_kind, bands: full.bands, members: [pick('central'), pick('dry'), pick('wet')], full_members_artifact: index.publications.find((p: any) => p.run_id === id).artifacts[1] };
};
vi.mock('../../features/auth/client', () => ({ supabase: { auth: {} }, currentAccessToken: () => null }));
vi.mock('../adapters/simulations', () => ({
  simulations: {
    capabilities: async (q: { location_id?: string } = {}) => ({ ...catalog, places: catalog.places.filter((p: any) => !q.location_id || p.location_id === q.location_id) }),
    regional: async (q: { location_id?: string; crop_id?: string }) => ({ as_of: index.as_of, items: index.publications.filter((p: any) => (!q.location_id || p.location_id === q.location_id) && (!q.crop_id || p.crops.includes(q.crop_id))) }),
    run: async (id: string) => runOf(id),
    series: async (id: string) => seriesOf(id),
  },
}));
import { Simulator } from './Simulator';

window.matchMedia ??= ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
const open = (query: string) => render(<MemoryRouter initialEntries={[`/simulador${query}`]}><Simulator /></MemoryRouter>);
const dayCard = () => screen.getByTestId('planning-day');

it('Uberlândia soy 2027: calculated run, cursor at sowing, day labelled with cycle day and weather origin', async () => {
  open('?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
  expect(await screen.findByRole('heading', { level: 1, name: /Planejamento da safra — Soja em Uberlândia/ })).toBeInTheDocument();
  expect(await screen.findByRole('radio', { name: '2027' })).toBeChecked();
  const run = runOf(index.publications.find((p: any) => p.location_id === 'BR:ibge:3170206' && p.plan_id === 'soy').run_id);
  const season = run.seasons.find((s: any) => s.crop_id === 'soy' && s.harvest_year === 2027);
  const profile = await screen.findByTestId('profile-2d');
  expect(profile).toHaveAttribute('data-date', season.sowing_date);
  expect(dayCard()).toHaveTextContent(`dia 1 do ciclo de ${season.cycle_days}`);
  expect(dayCard()).toHaveTextContent('Cenário climatológico');
  expect(screen.getByTestId('planning-run')).toHaveTextContent(run.run_id);
  expect(screen.getByTestId('planning-yield')).toHaveTextContent('2022–2024');
});

it('observed days are shared by every trajectory; scenario days differ', async () => {
  open('?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1&dia=60');
  const w = (await screen.findByTestId('profile-2d')).getAttribute('data-water');
  expect(dayCard()).toHaveTextContent('Observado');
  fireEvent.click(screen.getByRole('radio', { name: 'Mais seca' }));
  expect(screen.getByTestId('profile-2d').getAttribute('data-water')).toBe(w);
});

it('switching the climate trajectory updates panel and scene of the same day together', async () => {
  // Default cursor = sowing, inside the climatological scenario (observed days are identical across members by construction).
  open('?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
  const before = (await screen.findByTestId('profile-2d')).getAttribute('data-water');
  const date = screen.getByTestId('profile-2d').getAttribute('data-date');
  const panelBefore = dayCard().textContent;
  fireEvent.click(screen.getByRole('radio', { name: 'Mais seca' }));
  expect(screen.getByTestId('profile-2d')).toHaveAttribute('data-date', date!);
  expect(screen.getByTestId('profile-2d').getAttribute('data-water')).not.toBe(before);
  expect(dayCard().textContent).not.toBe(panelBefore);
});

it('changing the harvest year moves to that season sowing; 2028 seasons exist', async () => {
  open('?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
  await screen.findByTestId('profile-2d');
  fireEvent.click(screen.getByRole('radio', { name: '2028' }));
  expect(screen.getByTestId('profile-2d')).toHaveAttribute('data-date', '2027-11-05');
  expect(screen.getByTestId('planning-season')).toHaveTextContent('2027/2028');
});

it('crops without engine keep a reason; places without runs list where planning exists', async () => {
  open('?modo=planejamento&mun=3170206&cultura=coffee_arabica');
  expect(await screen.findByTestId('planning-unavailable')).toHaveTextContent('cultura perene ainda sem motor próprio');
  open('?modo=planejamento&mun=5300108&cultura=soy');
  expect(await screen.findByText(/Lugares com planejamento: .*Sorriso/)).toBeInTheDocument();
});

it('maize2 comes from the soy→maize2 rotation run with the recorded calendar rule', async () => {
  open('?modo=planejamento&mun=5107925&cultura=maize2&safra=2027&vista=perfil&semwebgl=1');
  expect(await screen.findByTestId('planning-calendar-rule')).toHaveTextContent('2027-01-28');
  expect(within(screen.getByTestId('planning-run')).getByText(/soy>maize2/)).toBeInTheDocument();
});

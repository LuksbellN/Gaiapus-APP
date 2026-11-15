// Season planning for US counties (publication subset Story IA + Sumner KS) next to the pinned Brazilian publication:
// one run per harvest year, yield-only results (2026 post-harvest, Kansas 2027 in season) without a fabricated daily series.
import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';

const BR = join(process.cwd(), '..', 'api', 'public', 'publications', 'future-simulation-v1');
const US = join(process.cwd(), '..', '..', 'packages', 'contracts', 'fixtures', 'us-simulation-v2');
const json = (root: string, p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const catalogs = [json(BR, 'catalog.json'), json(US, 'catalog.json')], indexes = [json(BR, 'index.json'), json(US, 'index.json')];
const publications = indexes.flatMap((i) => i.publications);
const rootOf = (id: string) => (indexes[1].publications.some((p: any) => p.run_id === id) ? US : BR);
const runOf = (id: string) => json(rootOf(id), `runs/${id}/run.json`);
vi.mock('../../features/auth/client', () => ({ supabase: { auth: {} }, currentAccessToken: () => null }));
vi.mock('../adapters/simulations', () => ({
  simulations: {
    capabilities: async () => ({ ...catalogs[0], harvest_years: [2026, 2027, 2028], places: catalogs.flatMap((c) => c.places) }),
    regional: async (q: { location_id?: string }) => ({ as_of: indexes[0].as_of, items: publications.filter((p: any) => !q.location_id || p.location_id === q.location_id) }),
    run: async (id: string) => runOf(id),
    series: async (id: string) => {
      const full = JSON.parse(gunzipSync(readFileSync(join(rootOf(id), 'runs', id, 'series.json.gz'))).toString('utf8')); const rep = runOf(id).representative;
      const pick = (role: 'central' | 'dry' | 'wet') => ({ ...full.members.find((m: { member_id: string }) => m.member_id === rep[role]), role });
      return { run_id: id, dates: full.dates, capacity_mm: full.capacity_mm, day_kind: full.day_kind, bands: full.bands, members: [pick('central'), pick('dry'), pick('wet')], full_members_artifact: publications.find((p: any) => p.run_id === id).artifacts[1] };
    },
  },
}));
import { Simulator } from './Simulator';

window.matchMedia ??= ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
const open = (query: string) => render(<MemoryRouter initialEntries={[`/simulador${query}`]}><Simulator /></MemoryRouter>);
const storyRun = (year: number) => publications.find((p: any) => p.location_id === 'US:fips:19169' && p.plan_id === 'us_soy' && p.harvest_years[0] === year).run_id;

it('a US county opens the run of the chosen harvest year, never another year of the same place', async () => {
  open('?modo=planejamento&local=US:fips:19169&cultura=soy&safra=2028&vista=perfil&semwebgl=1');
  expect(await screen.findByTestId('planning-run')).toHaveTextContent(storyRun(2028));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Soja em Story County');
  expect(screen.getByLabelText('País')).toHaveValue('US');
  expect(screen.getByLabelText('Estado')).toHaveValue('IA');
  expect(screen.getByTestId('planning-season')).toHaveTextContent('Dias com estresse na fase reprodutiva');
  const yieldCard = screen.getByTestId('planning-yield');
  expect(yieldCard).toHaveTextContent('kg/ha');
  expect(yieldCard).toHaveTextContent(/situação científica/);
  expect(yieldCard).toHaveTextContent('não para um talhão');
  expect(within(screen.getByLabelText('Cultura')).getByRole('option', { name: 'Milho (grão)' })).toBeEnabled();
});

it('2027 and 2028 of the same county are different runs', async () => {
  const first = open('?modo=planejamento&local=US:fips:19169&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
  expect(await screen.findByTestId('planning-run')).toHaveTextContent(storyRun(2027));
  first.unmount();
  open('?modo=planejamento&local=US:fips:19169&cultura=soy&safra=2028&vista=perfil&semwebgl=1');
  expect(await screen.findByTestId('planning-run')).toHaveTextContent(storyRun(2028));
  expect(storyRun(2027)).not.toBe(storyRun(2028));
});

it('2026 shows the post-harvest yield estimate and no daily simulation', async () => {
  open('?modo=planejamento&local=US:fips:19169&cultura=soy&safra=2026');
  const only = await screen.findByTestId('planning-yield-only');
  expect(only).toHaveTextContent('Rendimento estimado, sem simulação diária');
  expect(only).toHaveTextContent('pós-colheita');
  expect(within(only).getByTestId('planning-yield')).toHaveTextContent('Estimativa pós-colheita, antes da divulgação oficial');
  expect(screen.queryByTestId('planning-day')).toBeNull();
  expect(screen.queryByTestId('planning-period')).toBeNull();
  expect(screen.getByRole('radio', { name: '2028' })).toBeEnabled();
});

it('Kansas winter wheat 2027 has a yield issued during the season, without a daily water balance', async () => {
  open('?modo=planejamento&local=US:fips:20191&cultura=wheat_winter&safra=2027');
  const only = await screen.findByTestId('planning-yield-only');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Trigo de inverno em Sumner County');
  expect(only).toHaveTextContent('fonte de dados indisponível');
  expect(within(only).getByTestId('planning-yield')).toHaveTextContent('Emitido durante a safra');
  expect(within(only).getByTestId('planning-yield')).toHaveTextContent(/Entre os cenários de clima/);
});

it('without a year in the address, a county opens on the first year that has the daily simulation', async () => {
  open('?modo=planejamento&local=US:fips:20191&cultura=wheat_winter&vista=perfil&semwebgl=1');
  expect(await screen.findByTestId('planning-day')).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: '2028' })).toBeChecked();
});

// Season planning for US counties (publication subset Story IA + Sumner KS) next to the pinned Brazilian publication:
// one run per harvest year, yield-only results (2026 post-harvest, Kansas 2027 in season) without a fabricated daily series.
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';

const BR = join(process.cwd(), '..', 'api', 'public', 'publications', 'future-simulation-v1');
const US = join(process.cwd(), '..', '..', 'packages', 'contracts', 'fixtures', 'us-simulation-v2');
const json = (root: string, p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const catalogs = [json(BR, 'catalog.json'), json(US, 'catalog.json')], indexes = [json(BR, 'index.json'), json(US, 'index.json')];
const publications = indexes.flatMap((i) => i.publications);
const rootOf = (id: string) => (indexes[1].publications.some((p: any) => p.run_id === id) ? US : BR);
const runOf = (id: string) => json(rootOf(id), `runs/${id}/run.json`);
// Slow network: a request waits for its gate ("regional:<location id>", "run:<run id>", "series:<run id>") before answering.
const gates = new Map<string, Promise<void>>();
const hold = (key: string) => { let release = () => {}; gates.set(key, new Promise<void>((r) => { release = r; })); return () => { gates.delete(key); release(); }; };
vi.mock('../../features/auth/client', () => ({ supabase: { auth: {} }, currentAccessToken: () => null }));
vi.mock('../adapters/simulations', () => ({
  simulations: {
    capabilities: async () => ({ ...catalogs[0], harvest_years: [2026, 2027, 2028], places: catalogs.flatMap((c) => c.places) }),
    regional: async (q: { location_id?: string }) => (await gates.get(`regional:${q.location_id}`), { as_of: indexes[0].as_of, items: publications.filter((p: any) => !q.location_id || p.location_id === q.location_id) }),
    run: async (id: string) => (await gates.get(`run:${id}`), runOf(id)),
    series: async (id: string) => {
      await gates.get(`series:${id}`);
      const full = JSON.parse(gunzipSync(readFileSync(join(rootOf(id), 'runs', id, 'series.json.gz'))).toString('utf8')); const rep = runOf(id).representative;
      const pick = (role: 'central' | 'dry' | 'wet') => ({ ...full.members.find((m: { member_id: string }) => m.member_id === rep[role]), role });
      return { run_id: id, dates: full.dates, capacity_mm: full.capacity_mm, day_kind: full.day_kind, bands: full.bands, members: [pick('central'), pick('dry'), pick('wet')], full_members_artifact: publications.find((p: any) => p.run_id === id).artifacts[1] };
    },
  },
}));
import { Simulator } from './Simulator';

window.matchMedia ??= ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
let go: (to: string) => void = () => {};
function Nav() { const navigate = useNavigate(); go = (to) => { void navigate(to); }; return null; }
const open = (query: string) => render(<MemoryRouter initialEntries={[`/simulador${query}`]}><Nav /><Simulator /></MemoryRouter>);
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

// Identity under a slow network: the title, the run and the series on screen always belong to the same place and harvest year.
const brRun = (code: string, year: number) => publications.find((p: any) => p.location_id === `BR:ibge:${code}` && p.crops.join() === 'soy' && p.harvest_years.includes(year)).run_id;
afterEach(() => gates.clear());
const SLOW = { timeout: 8000 }; // three full runs are read from disk in one test; the default second is too short on a busy machine
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });
const shown = () => screen.queryByTestId('planning-run')?.textContent ?? '';
it('changing place while answers are late never shows the previous run under the new title', async () => {
  const story28 = storyRun(2028), story27 = storyRun(2027), uber27 = brRun('3170206', 2027);
  open('?modo=planejamento&local=US:fips:19169&cultura=soy&safra=2028&vista=perfil&semwebgl=1');
  expect(await screen.findByTestId('planning-run')).toHaveTextContent(story28);

  const releaseList = hold('regional:BR:ibge:3170206');
  act(() => go('/simulador?modo=planejamento&local=BR:ibge:3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1'));
  await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Soja em Uberlândia'));
  await settle();
  expect(shown()).not.toContain(story28);
  expect(shown()).not.toContain(story27);
  expect(screen.queryByTestId('planning-day')).toBeNull();
  expect(screen.getByRole('status')).toHaveTextContent(/Carregando/);

  // The list arrives, the run and the series of the new place are still on their way: nothing of Story is drawn meanwhile.
  const releaseRun = hold(`run:${uber27}`), releaseSeries = hold(`series:${uber27}`);
  releaseList(); await settle();
  expect(shown()).toBe('');
  releaseRun(); await settle();
  expect(shown()).toBe(''); // run without its series is not a result yet

  // Back to Story before the series of Uberlândia arrives; the late answer is ignored.
  act(() => go('/simulador?modo=planejamento&local=US:fips:19169&cultura=soy&safra=2028&vista=perfil&semwebgl=1'));
  releaseSeries(); await settle();
  await waitFor(() => expect(shown()).toContain(story28));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Soja em Story County');
  expect(shown()).not.toContain(uber27);
});

it('changing the harvest year waits for the run of that year', async () => {
  const story28 = storyRun(2028), story27 = storyRun(2027);
  open('?modo=planejamento&local=US:fips:19169&cultura=soy&safra=2028&vista=perfil&semwebgl=1');
  expect(await screen.findByTestId('planning-run', undefined, SLOW)).toHaveTextContent(story28);
  const release = hold(`series:${story27}`);
  act(() => go('/simulador?modo=planejamento&local=US:fips:19169&cultura=soy&safra=2027&vista=perfil&semwebgl=1'));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Carregando/), SLOW); // the state itself, not a fixed pause
  await settle();
  expect(shown()).not.toContain(story28);
  expect(screen.queryByTestId('planning-season')).toBeNull();
  release();
  await waitFor(() => expect(shown()).toContain(story27), SLOW);
  expect(screen.getByTestId('planning-season')).toHaveTextContent('2027');
});

it('Brazil → US → Brazil keeps each place with its own run; an unknown place never falls back to Sorriso', async () => {
  open('?modo=planejamento&local=BR:ibge:3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
  expect(await screen.findByTestId('planning-run', undefined, SLOW)).toHaveTextContent(brRun('3170206', 2027));
  act(() => go('/simulador?modo=planejamento&local=US:fips:19169&cultura=soy&safra=2027&vista=perfil&semwebgl=1'));
  await waitFor(() => expect(shown()).toContain(storyRun(2027)), SLOW);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Soja em Story County');
  act(() => go('/simulador?modo=planejamento&local=BR:ibge:3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1'));
  await waitFor(() => expect(shown()).toContain(brRun('3170206', 2027)), SLOW);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Soja em Uberlândia');
  act(() => go('/simulador?modo=planejamento&local=US:fips:99999&cultura=soy&safra=2027'));
  expect(await screen.findByTestId('planning-unavailable', undefined, SLOW)).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent('Sorriso');
  expect(shown()).toBe('');
}, 20000); // three full runs are read from disk; the default 5 s is too short on a busy machine

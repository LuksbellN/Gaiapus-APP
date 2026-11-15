// Season planning 2027/2028 over the REAL pinned regional publication (apps/api/public/publications/future-simulation-v1).
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

// ── Journey: region → crop → season, without editing the address ─────────────────────────────────────────────────
it('the simulator opens on season planning by default, with place and crop pickers and a way to past seasons', async () => {
  open('');
  await screen.findByTestId('planning-day');
  expect(screen.getByRole('heading', { level: 1, name: /Planejamento da safra — Soja em Sorriso/ })).toBeInTheDocument();
  expect(screen.getByLabelText('Cultura')).toHaveValue('soy');
  expect(screen.getByLabelText('Lugar')).toHaveValue('BR:ibge:5107925');
  expect(screen.getByRole('link', { name: /Safras passadas/ })).toHaveAttribute('href', expect.stringContaining('modo=historico'));
  expect(screen.getByRole('link', { name: /Safra futura/ })).toHaveAttribute('aria-current', 'page');
});

it('choosing another place and crop from the pickers opens that calculated run', async () => {
  open('?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
  await screen.findByTestId('planning-day');
  fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'GO' } });
  await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Soja em Rio Verde/));
  await screen.findByTestId('planning-day');
  fireEvent.change(screen.getByLabelText('Cultura'), { target: { value: 'maize2' } });
  await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Milho 2ª safra \(safrinha\) em Rio Verde/));
  const rotation = index.publications.find((p: any) => p.location_id === 'BR:ibge:5218805' && p.plan_id === 'soy>maize2').run_id;
  expect(await screen.findByTestId('planning-run')).toHaveTextContent(rotation);
  // Crops without an engine stay listed, disabled, with the reason one click away.
  expect(within(screen.getByLabelText('Cultura')).getByRole('option', { name: /Arroz/ })).toBeDisabled();
  expect(screen.getByTestId('planning-crops-missing')).toHaveTextContent(/arroz inundado/i);
});

it('opens on the chosen season window; the whole run stays one click away with warm-up and fallow explained', async () => {
  open('?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
  const period = await screen.findByTestId('planning-period');
  const run = runOf(index.publications.find((p: any) => p.location_id === 'BR:ibge:3170206' && p.plan_id === 'soy').run_id);
  const season = run.seasons.find((s: any) => s.crop_id === 'soy' && s.harvest_year === 2027);
  const shift = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
  expect(period).toHaveAttribute('data-from', shift(season.sowing_date, -30));
  expect(period).toHaveAttribute('data-to', shift(season.expected_harvest_date, 14));
  expect(screen.queryByTestId('planning-warmup')).toBeNull();
  fireEvent.click(screen.getByRole('radio', { name: 'Execução inteira' }));
  expect(screen.getByTestId('planning-period')).toHaveAttribute('data-from', run.simulation_start);
  expect(screen.getByTestId('planning-warmup')).toHaveTextContent(/solo exposto/);
  // A link to a day outside the season (warm-up) opens the whole run, so the day is not silently moved.
});

it('a link to a warm-up day opens the whole run instead of moving the day', async () => {
  open('?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1&dia=60');
  expect(await screen.findByTestId('planning-period')).toHaveAttribute('data-from', '2025-01-01');
  expect(screen.getByRole('radio', { name: 'Execução inteira' })).toBeChecked();
});

it('explains what a climate trajectory is, naming the source year of the one on screen', async () => {
  open('?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
  const help = await screen.findByTestId('planning-member-help');
  const run = runOf(index.publications.find((p: any) => p.location_id === 'BR:ibge:3170206' && p.plan_id === 'soy').run_id);
  expect(help).toHaveTextContent(`${run.ensemble.members} anos reais`);
  expect(help).toHaveTextContent(run.representative.central.replace(/^a/, ''));
  fireEvent.click(screen.getByRole('radio', { name: 'Mais seca' }));
  expect(screen.getByTestId('planning-member-help')).toHaveTextContent(run.representative.dry.replace(/^a/, ''));
});

it('compares the calculated crops of the place by water supply, stating it is not a recommendation', async () => {
  open('?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
  const card = await screen.findByTestId('planning-compare');
  expect(await within(card).findByRole('link', { name: /Milho 2ª safra/ })).toBeInTheDocument();
  const items = within(card).getAllByRole('listitem');
  expect(items.map((li) => li.getAttribute('data-crop'))).toEqual(['soy', 'maize2']);
  // Per climate member: ETa ÷ ETc of the cycle; the card shows the median of those ratios (not the ratio of the published medians).
  const expected = (crop: string) => {
    const pub = index.publications.find((p: any) => p.location_id === 'BR:ibge:3170206' && p.crops[p.crops.length - 1] === crop);
    const season = runOf(pub.run_id).seasons.find((x: any) => x.crop_id === crop && x.harvest_year === 2027);
    const ratios = Object.values(season.members as Record<string, any>).map((m) => m.crop_eta_mm / m.crop_etc_mm).sort((a, b) => a - b);
    expect(ratios).toHaveLength(22);
    return Math.round(((ratios[10] + ratios[11]) / 2) * 100);
  };
  for (const li of items) {
    const crop = li.getAttribute('data-crop')!;
    expect(li.querySelector('[data-metric="supply"]')).toHaveTextContent(new RegExp(`^${expected(crop)}\\s?%$`));
    expect(li.querySelector('[data-metric="stress"]')).toHaveTextContent(/^\d+$/);
    expect(li.querySelector('[data-metric="stress-repro"]')).toHaveTextContent(/^\d+$/);
    expect(within(li).getByTestId('compare-calendar')).toHaveTextContent(/Semeadura em .* ciclo de \d+ dias/);
    expect(li).toHaveTextContent('Dias com estresse (ciclo inteiro)');
    expect(li).toHaveTextContent('Dias com estresse na fase reprodutiva');
  }
  expect(within(card).getAllByText('Maior atendimento hídrico')).toHaveLength(1);
  expect(card).not.toHaveTextContent(/Melhor/);
  expect(card).toHaveTextContent(/não indica maior rendimento/);
  expect(card).toHaveTextContent(/não é recomendação/i);
  expect(within(card).getByRole('link', { name: /Milho 2ª safra/ })).toHaveAttribute('href', expect.stringContaining('cultura=maize2'));
});

it('a place with one calculated crop says there is nothing to compare', async () => {
  open('?modo=planejamento&mun=2903201&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
  expect(await screen.findByTestId('planning-compare')).toHaveTextContent(/Só Soja está calculada/);
});

it('on a phone the configuration and the indicators are reachable through tabs', async () => {
  const spy = vi.spyOn(window, 'matchMedia').mockImplementation(((q: string) => ({ matches: q.includes('max-width: 760px'), media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia);
  try {
    open('?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
    await screen.findByTestId('planning-day');
    const tabs = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(tabs).toEqual(['Campo', 'Indicadores', 'Configurar']);
    fireEvent.click(screen.getByRole('tab', { name: 'Configurar' }));
    expect(document.querySelector('.sim')).toHaveAttribute('data-tab', 'configurar');
  } finally { spy.mockRestore(); }
});

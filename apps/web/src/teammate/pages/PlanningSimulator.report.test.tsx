// Automatic technical report in the season planning, over the REAL pinned publication: opening a succeeded run
// ensures its report once, in the language on screen, without a click; moving the day, the trajectory or the
// view asks for nothing; no scientific read is repeated to write the report.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReportGenerationResult, ReportRepresentation } from '@gaiapus/contracts';

const ROOT = join(process.cwd(), '..', 'api', 'public', 'publications', 'future-simulation-v1');
const REPORTS = join(process.cwd(), '..', 'api', 'data', 'report-publications', 'future-simulation-v1');
const json = (p: string) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const index = json('index.json'), catalog = json('catalog.json');
const runOf = (id: string) => json(`runs/${id}/run.json`);
const seriesOf = (id: string) => {
  const full = JSON.parse(gunzipSync(readFileSync(join(ROOT, 'runs', id, 'series.json.gz'))).toString('utf8')); const rep = runOf(id).representative;
  const pick = (role: 'central' | 'dry' | 'wet') => ({ ...full.members.find((m: { member_id: string }) => m.member_id === rep[role]), role });
  return { run_id: id, dates: full.dates, capacity_mm: full.capacity_mm, day_kind: full.day_kind, bands: full.bands, members: [pick('central'), pick('dry'), pick('wet')], full_members_artifact: index.publications.find((p: { run_id: string }) => p.run_id === id).artifacts[1] };
};
const pinned = JSON.parse(readFileSync(join(REPORTS, 'index.json'), 'utf8')).reports as { run_id: string; report_id: string }[];
const representationOf = (runId: string, locale: string): ReportRepresentation => {
  const stored = JSON.parse(readFileSync(join(REPORTS, 'reports', pinned.find((r) => r.run_id === runId)!.report_id, 'report.json'), 'utf8')) as ReportRepresentation;
  return { ...stored, resolved_locale: locale as ReportRepresentation['resolved_locale'], report_id: locale === 'en' ? stored.report_id : `rep_${'d'.repeat(32)}` };
};

const science = vi.hoisted(() => ({ capabilities: vi.fn(), regional: vi.fn(), run: vi.fn(), series: vi.fn() }));
const reports = vi.hoisted(() => ({ ensure: vi.fn(), get: vi.fn(), markdown: vi.fn(), exportUrl: vi.fn() }));
vi.mock('../../features/auth/client', () => ({ supabase: { auth: {} }, currentAccessToken: () => null }));
vi.mock('../adapters/simulations', () => ({ simulations: science }));
vi.mock('../adapters/simulation-reports', () => ({ simulationReports: reports }));
import { Simulator } from './Simulator';
import { setLocale } from '../i18n';
import { setPrefs } from '../prefs';

window.matchMedia ??= ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
const open = (query: string) => render(<MemoryRouter initialEntries={[`/simulador${query}`]}><Simulator /></MemoryRouter>);
const print = vi.fn();
const UBERLANDIA_SOY = index.publications.find((p: { location_id: string; plan_id: string }) => p.location_id === 'BR:ibge:3170206' && p.plan_id === 'soy').run_id as string;
const succeeded = (runId: string, locale: string): ReportGenerationResult => { const representation = representationOf(runId, locale); return { state: 'succeeded', report_id: representation.report_id, run_id: runId, reused: true,
  locale_resolution: { requested_locale: locale, resolved_locale: representation.resolved_locale, fallback_reason: null }, representation, links: { json: 'j', html: 'h', md: 'm' }, error: null }; };

beforeEach(() => {
  setPrefs({ locale: 'pt-BR' });
  science.capabilities.mockReset().mockImplementation(async (q: { location_id?: string } = {}) => ({ ...catalog, places: catalog.places.filter((p: { location_id: string }) => !q.location_id || p.location_id === q.location_id) }));
  science.regional.mockReset().mockImplementation(async (q: { location_id?: string }) => ({ as_of: index.as_of, items: index.publications.filter((p: { location_id: string }) => !q.location_id || p.location_id === q.location_id) }));
  science.run.mockReset().mockImplementation(async (id: string) => runOf(id));
  science.series.mockReset().mockImplementation(async (id: string) => seriesOf(id));
  reports.ensure.mockReset().mockImplementation(async (runId: string, options: { locale: string }) => succeeded(runId, options.locale));
  for (const mock of [reports.get, reports.markdown, reports.exportUrl]) mock.mockReset();
  print.mockClear();
  vi.stubGlobal('print', print);
});
afterEach(() => { vi.unstubAllGlobals(); });

it('opening a succeeded run ensures its report once, in the language on screen, and offers it next to the run', async () => {
  open('?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
  const entry = await screen.findByTestId('planning-report');
  const link = await within(entry).findByRole('link', { name: 'Abrir relatório técnico' });
  expect(reports.ensure).toHaveBeenCalledTimes(1);
  expect(reports.ensure.mock.calls[0]!.slice(0, 2)).toEqual([UBERLANDIA_SOY, { locale: 'pt-BR', scope: { kind: 'run' } }]);
  expect(link).toHaveAttribute('href', `#/relatorio?run=${UBERLANDIA_SOY}&local=BR:ibge:3170206&cultura=soy&safra=2027`);
  expect(entry).toHaveTextContent('Execução completa — 2 safras');
  expect(entry).toHaveTextContent('Português');
  expect(within(entry).getByRole('status')).toHaveTextContent('Relatório técnico pronto.');
  // The entry sits with the run information on a wide screen.
  expect(screen.getByTestId('planning-run').parentElement).toContainElement(entry);
  // Nothing was printed, downloaded or fetched as an export, and the focus did not move to the report.
  expect(print).not.toHaveBeenCalled();
  expect(reports.markdown).not.toHaveBeenCalled();
  expect(entry.contains(document.activeElement)).toBe(false);
});

it('the day, the trajectory, the view and the harvest year of the same run ask for no new report and no new science', async () => {
  open('?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
  await within(await screen.findByTestId('planning-report')).findByRole('link', { name: 'Abrir relatório técnico' });
  const scienceCalls = () => [science.run.mock.calls.length, science.series.mock.calls.length];
  const before = scienceCalls();
  fireEvent.click(screen.getByRole('button', { name: 'Avançar 1 dia' }));
  fireEvent.click(screen.getByRole('button', { name: '+1 semana' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Mais seca' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Talhão' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Execução inteira' }));
  await waitFor(() => expect(screen.getByTestId('planning-warmup')).toBeInTheDocument());
  expect(reports.ensure).toHaveBeenCalledTimes(1);
  expect(scienceCalls()).toEqual(before);
  // 2028 of this place is another season of the same run: same report, the link only carries the season on screen.
  fireEvent.click(screen.getByRole('radio', { name: '2028' }));
  await waitFor(() => expect(within(screen.getByTestId('planning-report')).getByRole('link', { name: 'Abrir relatório técnico' })).toHaveAttribute('href', expect.stringContaining('safra=2028')));
  // (The crop comparison panel reads its sibling run again when the year changes; that read is its own, not the report's.)
  expect(reports.ensure).toHaveBeenCalledTimes(1);
  expect(science.series.mock.calls.length).toBe(before[1]);
});

it('changing the language asks for that language; another run asks for its own report; old answers are dropped', async () => {
  const pending: { runId: string; locale: string; resolve: (r: ReportGenerationResult) => void; signal: AbortSignal }[] = [];
  reports.ensure.mockImplementation((runId: string, options: { locale: string }, signal: AbortSignal) => new Promise((resolve) => { pending.push({ runId, locale: options.locale, resolve, signal }); }));
  open('?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
  await waitFor(() => expect(pending.length).toBe(1));
  expect(within(screen.getByTestId('planning-report')).getByRole('status')).toHaveTextContent('Preparando o relatório técnico desta simulação…');
  act(() => setLocale('en'));
  await waitFor(() => expect(pending.length).toBe(2));
  expect([pending[0]!.signal.aborted, pending[1]!.locale, pending[1]!.runId]).toEqual([true, 'en', UBERLANDIA_SOY]);
  // Another crop of the place is another run: its own request, and the previous one is abandoned.
  fireEvent.change(screen.getByLabelText('Crop'), { target: { value: 'maize2' } });
  await waitFor(() => expect(pending.length).toBe(3));
  const rotation = index.publications.find((p: { location_id: string; plan_id: string }) => p.location_id === 'BR:ibge:3170206' && p.plan_id === 'soy>maize2').run_id as string;
  expect([pending[1]!.signal.aborted, pending[2]!.runId, pending[2]!.locale]).toEqual([true, rotation, 'en']);
  // The two abandoned answers arrive late, in any order: neither may show.
  await act(async () => { pending[1]!.resolve(succeeded(UBERLANDIA_SOY, 'en')); pending[0]!.resolve(succeeded(UBERLANDIA_SOY, 'pt-BR')); });
  expect(within(screen.getByTestId('planning-report')).queryByRole('link')).not.toBeInTheDocument();
  await act(async () => { pending[2]!.resolve(succeeded(rotation, 'en')); });
  const link = await within(screen.getByTestId('planning-report')).findByRole('link', { name: 'Open technical report' });
  expect(link).toHaveAttribute('href', expect.stringContaining(`run=${rotation}`));
  expect(screen.getByTestId('planning-report')).toHaveTextContent('Whole run — 4 crop seasons');
});

it('a failed report does not disturb the simulation and can be retried alone', async () => {
  reports.ensure.mockResolvedValueOnce({ state: 'failed', report_id: `rep_${'e'.repeat(32)}`, run_id: UBERLANDIA_SOY, reused: false, locale_resolution: null, representation: null, links: null, error: { code: 'report_generation_failed', attempts: 1 } });
  open('?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
  const entry = await screen.findByTestId('planning-report');
  expect(await within(entry).findByText(/Não foi possível preparar o relatório técnico\. A simulação não foi afetada\./)).toBeInTheDocument();
  // The simulation is all there.
  expect(screen.getByTestId('planning-day')).toHaveTextContent('dia 1 do ciclo');
  expect(screen.getByTestId('planning-season')).toBeInTheDocument();
  const calls = [science.run.mock.calls.length, science.series.mock.calls.length];
  fireEvent.click(within(entry).getByRole('button', { name: 'Tentar o relatório de novo' }));
  expect(await within(entry).findByRole('link', { name: 'Abrir relatório técnico' })).toBeInTheDocument();
  expect(reports.ensure).toHaveBeenCalledTimes(2);
  expect([science.run.mock.calls.length, science.series.mock.calls.length]).toEqual(calls);
});

it('a place without a calculated run asks for no report', async () => {
  open('?modo=planejamento&mun=3170206&cultura=coffee_arabica');
  expect(await screen.findByTestId('planning-unavailable')).toBeInTheDocument();
  expect(screen.queryByTestId('planning-report')).not.toBeInTheDocument();
  expect(reports.ensure).not.toHaveBeenCalled();
});

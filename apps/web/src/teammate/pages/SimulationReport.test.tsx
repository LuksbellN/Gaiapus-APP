// Reading page of a technical report, over a REAL representation precomputed by the API for the pinned Uberlândia
// run (apps/api/data/report-publications). The page shows what the API rendered: it formats and computes nothing.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReportGenerationResult, ReportRepresentation, ReportScope } from '@gaiapus/contracts';

const RUN = 'sim_fd61ab4118a4e32398a12156';
const ROOT = join(process.cwd(), '..', 'api', 'data', 'report-publications', 'future-simulation-v1');
const entry = JSON.parse(readFileSync(join(ROOT, 'index.json'), 'utf8')).reports.find((r: { run_id: string }) => r.run_id === RUN);
const english = JSON.parse(readFileSync(join(ROOT, 'reports', entry.report_id, 'report.json'), 'utf8')) as ReportRepresentation;
const markdown = readFileSync(join(ROOT, 'reports', entry.report_id, 'report.md'), 'utf8');
/** The same facts as another representation: only identity, language and title differ (enough for the page). */
const variant = (locale: ReportRepresentation['resolved_locale'], id: string, title: string): ReportRepresentation => ({ ...english, report_id: id, resolved_locale: locale, document: { ...english.document, lang: locale, title } });
const portuguese = variant('pt-BR', `rep_${'b'.repeat(32)}`, 'Relatório técnico de simulação — Uberlândia');
const result = (representation: ReportRepresentation, extra: Partial<ReportGenerationResult> = {}): ReportGenerationResult => ({ state: 'succeeded', report_id: representation.report_id, run_id: RUN, reused: true,
  locale_resolution: { requested_locale: representation.resolved_locale, resolved_locale: representation.resolved_locale, fallback_reason: null }, representation,
  links: { json: 'j', html: `/v1/simulations/${RUN}/report?report_id=${representation.report_id}&format=html`, md: 'm' }, error: null, ...extra });

const api = vi.hoisted(() => ({ ensure: vi.fn(), get: vi.fn(), markdown: vi.fn(), exportUrl: vi.fn((run: string, id: string, format: string) => `/v1/simulations/${run}/report?report_id=${id}&format=${format}`) }));
vi.mock('../../features/auth/client', () => ({ supabase: { auth: {} }, currentAccessToken: () => null }));
vi.mock('../adapters/simulation-reports', () => ({ simulationReports: api }));
import { SimulationReport } from './SimulationReport';
import { setLocale } from '../i18n';
import { setPrefs } from '../prefs';

window.matchMedia ??= ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
let where = '';
function Where() { const l = useLocation(); where = l.pathname + l.search; return null; }
const open = (query: string) => render(<MemoryRouter initialEntries={[`/relatorio${query}`]}><SimulationReport /><Where /></MemoryRouter>);
const print = vi.fn();
const byLocale = (locale: string) => (locale === 'pt-BR' ? portuguese : locale === 'en' ? english : variant(locale as ReportRepresentation['resolved_locale'], `rep_${'c'.repeat(32)}`, `Report in ${locale}`));

beforeEach(() => {
  setPrefs({ locale: 'pt-BR' });
  for (const mock of Object.values(api)) mock.mockClear();
  api.ensure.mockReset().mockImplementation(async (_run: string, options: { locale: string }) => result(byLocale(options.locale)));
  api.get.mockReset().mockResolvedValue(result(english, { locale_resolution: null }));
  api.markdown.mockReset().mockResolvedValue(markdown);
  print.mockClear();
  vi.stubGlobal('print', print);
});
afterEach(() => { vi.unstubAllGlobals(); });

it('a run in the address gets its report without any click, in the language the app is rendering', async () => {
  open(`?run=${RUN}`);
  expect(await screen.findByRole('heading', { level: 1, name: portuguese.document.title })).toBeInTheDocument();
  expect(api.ensure).toHaveBeenCalledTimes(1);
  expect(api.ensure.mock.calls[0]!.slice(0, 2)).toEqual([RUN, { locale: 'pt-BR', scope: { kind: 'run' } }]);
  expect(api.get).not.toHaveBeenCalled();
  // Nothing is printed, downloaded or copied by itself.
  expect(print).not.toHaveBeenCalled();
  expect(api.markdown).not.toHaveBeenCalled();
  expect(screen.getByTestId('report-meta')).toHaveTextContent('Português');
  expect(screen.getByTestId('report-meta')).toHaveTextContent(english.template_version);
  expect(screen.getByRole('status')).toHaveTextContent('Relatório pronto');
});

it('shows the document as received: language, heading order, tables with headers and charts with text alternatives', async () => {
  setPrefs({ locale: 'en' });
  open(`?run=${RUN}`);
  const article = await screen.findByTestId('report-document');
  expect(article).toHaveAttribute('lang', 'en');
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(english.document.sections.map(s => s.title));
  // Summary first, readable without opening anything.
  const summary = within(screen.getByTestId('report-section-summary'));
  expect(summary.getByText(/Among the 4 crop seasons of this report, second-season maize 2027 has the largest median/)).toBeInTheDocument();
  expect(summary.getByText(/21 of 22 scenarios \(95\.5%\)/)).toBeInTheDocument();
  expect(summary.getByText(/Soil water storage capacity was assumed to be/)).toBeInTheDocument();
  // Technical sections are collapsed on screen and open with their heading button.
  const toggle = screen.getByRole('button', { name: 'Results by crop and season' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('table', { name: /Seasonal statistics across the scenarios — soybean 2026\/2027/ })).not.toBeInTheDocument();
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const table = screen.getByRole('table', { name: /Seasonal statistics across the scenarios — soybean 2026\/2027/ });
  expect(within(table).getAllByRole('columnheader').map(h => h.textContent)).toEqual(['Indicator', 'Unit', 'P10', 'P50 (median)', 'P90', 'Scenarios (n)']);
  const deficit = within(table).getByRole('rowheader', { name: 'Crop evapotranspiration deficit (ETc − ETa)' }).closest('tr')!;
  expect(within(deficit).getAllByRole('cell').map(c => c.textContent)).toEqual(['mm', '<0.1', '13.2', '74.8', '22']);
  fireEvent.click(screen.getByRole('button', { name: 'Supporting charts' }));
  const charts = within(screen.getByTestId('report-section-charts')).getAllByRole('img');
  expect(charts).toHaveLength(8);
  expect(charts[0]).toHaveAccessibleName(/Soil water storage — soybean 2026\/2027/);
  expect(charts[0]).toHaveAccessibleDescription(/three whole scenarios/);
  expect(within(screen.getByTestId('report-section-charts')).getByRole('table', { name: /Seasonal deficit of the three trajectories — soybean 2026\/2027/ })).toBeInTheDocument();
  // Section status is words, not only colour.
  expect(within(screen.getByTestId('report-section-yield_economics')).getByText('partial')).toBeInTheDocument();
});

it('exports the representation on screen and prints only when asked', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  open(`?run=${RUN}`);
  await screen.findByTestId('report-document');
  fireEvent.click(screen.getByRole('button', { name: 'Copiar em Markdown' }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(markdown));
  expect(api.markdown.mock.calls[0]!.slice(0, 2)).toEqual([RUN, portuguese.report_id]);
  expect(await screen.findByText('Markdown copiado')).toBeInTheDocument();
  const download = screen.getByRole('link', { name: 'Baixar Markdown' });
  expect(download).toHaveAttribute('href', `/v1/simulations/${RUN}/report?report_id=${portuguese.report_id}&format=md`);
  expect(download).toHaveAttribute('download', `${portuguese.report_id}.md`);
  expect(screen.getByRole('link', { name: /HTML/ })).toHaveAttribute('href', `/v1/simulations/${RUN}/report?report_id=${portuguese.report_id}&format=html`);
  expect(print).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Imprimir ou salvar em PDF' }));
  expect(print).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/O PDF é salvo pelo diálogo de impressão do navegador/)).toBeInTheDocument();
});

it('a quick language change never lets the older answer replace the current one, and exports follow the report shown', async () => {
  const pending: Record<string, (value: ReportGenerationResult) => void> = {};
  const signals: Record<string, AbortSignal> = {};
  api.ensure.mockImplementation((_run: string, options: { locale: string }, signal: AbortSignal) => new Promise(resolve => { pending[options.locale] = resolve; signals[options.locale] = signal; }));
  open(`?run=${RUN}`);
  await waitFor(() => expect(pending['pt-BR']).toBeDefined());
  act(() => setLocale('en'));
  await waitFor(() => expect(pending.en).toBeDefined());
  expect(signals['pt-BR']!.aborted).toBe(true);
  // English answers first; the Portuguese answer arrives late and must be ignored.
  await act(async () => { pending.en!(result(english)); });
  expect(await screen.findByRole('heading', { level: 1, name: english.document.title })).toBeInTheDocument();
  await act(async () => { pending['pt-BR']!(result(portuguese)); });
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(english.document.title);
  expect(screen.getByTestId('report-document')).toHaveAttribute('lang', 'en');
  expect(screen.getByRole('link', { name: 'Download Markdown' })).toHaveAttribute('href', expect.stringContaining(english.report_id));
  expect(api.ensure).toHaveBeenCalledTimes(2);
});

it('the scope is explicit: whole run by default, the selected season only when chosen', async () => {
  open(`?run=${RUN}&cultura=soy&safra=2027`);
  await screen.findByTestId('report-document');
  expect(api.ensure.mock.calls[0]![1]).toEqual({ locale: 'pt-BR', scope: { kind: 'run' } });
  expect(screen.getByRole('radio', { name: 'Execução completa' })).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: /Safra selecionada/ }));
  await waitFor(() => expect(api.ensure).toHaveBeenCalledTimes(2));
  expect(api.ensure.mock.calls[1]![1]).toEqual({ locale: 'pt-BR', scope: { kind: 'season', crop_id: 'soy', harvest_year: 2027 } satisfies ReportScope });
  expect(where).toContain('escopo=safra');
  // Parameters of the simulator screen (day, trajectory, view) are not part of the report.
  open(`?run=${RUN}&dia=77&membro=dry&vista=perfil&tema=light`);
  await waitFor(() => expect(api.ensure).toHaveBeenCalledTimes(3));
  expect(api.ensure.mock.calls[2]![1]).toEqual({ locale: 'pt-BR', scope: { kind: 'run' } });
  expect(screen.queryByRole('radio', { name: /Safra selecionada/ })).toBeInTheDocument();
});

it('a failed report says so, keeps the way back to the simulation and retries only the report', async () => {
  api.ensure.mockResolvedValueOnce(result(portuguese, { state: 'failed', representation: null, links: null, error: { code: 'report_generation_failed', attempts: 1 } }));
  open(`?run=${RUN}&cultura=soy&safra=2027`);
  expect(await screen.findByText(/Não foi possível preparar o relatório técnico/)).toBeInTheDocument();
  expect(screen.getByText(/A simulação não foi afetada/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Voltar à simulação' })).toHaveAttribute('href', expect.stringContaining('#/simulador?modo=planejamento'));
  fireEvent.click(screen.getByRole('button', { name: 'Tentar o relatório de novo' }));
  expect(await screen.findByTestId('report-document')).toBeInTheDocument();
  expect(api.ensure).toHaveBeenCalledTimes(2);
});

it('a saved report in another language is shown as such, with the app language one click away', async () => {
  open(`?run=${RUN}&rel=${english.report_id}`);
  expect(await screen.findByRole('heading', { level: 1, name: english.document.title })).toBeInTheDocument();
  expect(api.get.mock.calls[0]!.slice(0, 2)).toEqual([RUN, english.report_id]);
  expect(api.ensure).not.toHaveBeenCalled();
  expect(screen.getByTestId('report-document')).toHaveAttribute('lang', 'en');
  expect(screen.getByTestId('report-language-notice')).toHaveTextContent('Este relatório salvo está em English; o aplicativo está em Português.');
  fireEvent.click(screen.getByRole('link', { name: 'Abrir em Português' }));
  expect(await screen.findByRole('heading', { level: 1, name: portuguese.document.title })).toBeInTheDocument();
  expect(where).not.toContain('rel=');
  expect(api.ensure.mock.calls[0]![1]).toEqual({ locale: 'pt-BR', scope: { kind: 'run' } });
});

it('a fallback to English is announced instead of mixing languages', async () => {
  api.ensure.mockResolvedValue(result(english, { locale_resolution: { requested_locale: 'pt-BR', resolved_locale: 'en', fallback_reason: 'catalog_unavailable' } }));
  open(`?run=${RUN}`);
  await screen.findByTestId('report-document');
  expect(screen.getByTestId('report-language-notice')).toHaveTextContent('O relatório não está disponível em Português agora; ele é mostrado em English.');
});

it('without a valid run in the address nothing is requested', async () => {
  open('?run=../../secret');
  expect(await screen.findByText(/Nenhuma simulação foi indicada/)).toBeInTheDocument();
  expect(api.ensure).not.toHaveBeenCalled();
  expect(screen.getByRole('link', { name: /Abrir o planejamento da safra/ })).toBeInTheDocument();
});

// Review focus 3: the chosen language and the rendered language differ while a catalogue loads (or when it fails).
it('while the chosen language is still loading nothing is requested in the fallback language; the report follows what is rendered', async () => {
  open(`?run=${RUN}`);
  await screen.findByTestId('report-document');
  expect(api.ensure.mock.calls.map((c) => c[1].locale)).toEqual(['pt-BR']);
  // French is loaded on demand: for a moment the app renders English while "fr" is the choice.
  act(() => setLocale('fr'));
  expect(api.ensure.mock.calls.map((c) => c[1].locale)).toEqual(['pt-BR']);
  expect(screen.queryByTestId('report-document')).not.toBeInTheDocument();
  await waitFor(() => expect(api.ensure.mock.calls.map((c) => c[1].locale)).toEqual(['pt-BR', 'fr']));
  expect(await screen.findByRole('heading', { level: 1, name: 'Report in fr' })).toBeInTheDocument();
  expect(document.querySelector('[data-testid="report-document"]')).toHaveAttribute('lang', 'fr');
});

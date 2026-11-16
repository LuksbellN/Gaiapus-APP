// Review focus of the plan: the chosen language and the rendered language differ while a catalogue loads, and stay
// different when it fails to load. The report follows what is rendered, and asks for nothing in between.
// The language state is driven directly here so each step is deterministic.
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { ReportGenerationResult } from '@gaiapus/contracts';

const RUN = 'sim_fd61ab4118a4e32398a12156';
const language = vi.hoisted(() => ({ current: { locale: 'pt-BR', chosen: 'pt-BR', loading: false, failed: false }, listeners: new Set<() => void>() }));
const api = vi.hoisted(() => ({ ensure: vi.fn(), get: vi.fn() }));
vi.mock('../i18n', async () => {
  const React = await import('react');
  return { useI18n: () => { const [, force] = React.useState(0); React.useEffect(() => { const f = () => force((n) => n + 1); language.listeners.add(f); return () => { language.listeners.delete(f); }; }, []); return language.current; } };
});
vi.mock('../adapters/simulation-reports', () => ({ simulationReports: api }));
import { useSimulationReport } from './useSimulationReport';

const setLanguage = (next: Partial<typeof language.current>) => act(() => { language.current = { ...language.current, ...next }; language.listeners.forEach((f) => f()); });
const answer = (locale: string): ReportGenerationResult => ({ state: 'succeeded', report_id: `rep_${'a'.repeat(32)}`, run_id: RUN, reused: true, locale_resolution: { requested_locale: locale, resolved_locale: locale as 'en', fallback_reason: null },
  representation: { resolved_locale: locale } as ReportGenerationResult['representation'], links: null, error: null });
function Probe({ run = RUN, saved = null as string | null }) {
  const report = useSimulationReport({ runId: run, scope: { kind: 'run' }, reportId: saved });
  return <output data-testid="state">{report.status}:{report.status === 'ready' ? report.result.representation.resolved_locale : '-'}</output>;
}
const locales = () => api.ensure.mock.calls.map((call) => call[1].locale);

beforeEach(() => {
  language.current = { locale: 'pt-BR', chosen: 'pt-BR', loading: false, failed: false };
  api.ensure.mockReset().mockImplementation(async (_run: string, options: { locale: string }) => answer(options.locale));
  api.get.mockReset().mockImplementation(async () => answer('en'));
});

it('waits while the chosen catalogue loads, then asks once in the language that is rendered', async () => {
  render(<Probe />);
  await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready:pt-BR'));
  // French was chosen; its catalogue is still loading, so the interface renders English for now.
  setLanguage({ chosen: 'fr', locale: 'en', loading: true });
  expect(screen.getByTestId('state')).toHaveTextContent('loading:-');
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(locales()).toEqual(['pt-BR']);
  setLanguage({ locale: 'fr', loading: false });
  await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready:fr'));
  expect(locales()).toEqual(['pt-BR', 'fr']);
});

it('when the chosen catalogue fails, the interface stays in English and the report is asked in English, not in the choice', async () => {
  render(<Probe />);
  await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready:pt-BR'));
  setLanguage({ chosen: 'de', locale: 'en', loading: true });
  setLanguage({ loading: false, failed: true });
  await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready:en'));
  expect(locales()).toEqual(['pt-BR', 'en']);
  // A later successful load switches the interface, and the report with it.
  setLanguage({ locale: 'de', failed: false });
  await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready:de'));
  expect(locales()).toEqual(['pt-BR', 'en', 'de']);
});

it('an answer for a language that is no longer rendered is dropped, and its request was aborted', async () => {
  const pending: { locale: string; resolve: (r: ReportGenerationResult) => void; signal: AbortSignal }[] = [];
  api.ensure.mockImplementation((_run: string, options: { locale: string }, signal: AbortSignal) => new Promise((resolve) => { pending.push({ locale: options.locale, resolve, signal }); }));
  render(<Probe />);
  await waitFor(() => expect(pending.length).toBe(1));
  setLanguage({ chosen: 'en', locale: 'en' });
  await waitFor(() => expect(pending.length).toBe(2));
  expect(pending[0]!.signal.aborted).toBe(true);
  await act(async () => { pending[0]!.resolve(answer('pt-BR')); });
  expect(screen.getByTestId('state')).toHaveTextContent('loading:-');
  await act(async () => { pending[1]!.resolve(answer('en')); });
  expect(screen.getByTestId('state')).toHaveTextContent('ready:en');
});

it('a saved report keeps its own language: it is read by id and does not wait for or follow the interface', async () => {
  language.current = { locale: 'en', chosen: 'fr', loading: true, failed: false };
  render(<Probe saved={`rep_${'b'.repeat(32)}`} />);
  await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready:en'));
  expect(api.get).toHaveBeenCalledTimes(1);
  setLanguage({ locale: 'fr', loading: false });
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect([api.get.mock.calls.length, api.ensure.mock.calls.length]).toEqual([1, 0]);
});

it('no run, no request', async () => {
  render(<Probe run={null as unknown as string} />);
  expect(screen.getByTestId('state')).toHaveTextContent('idle:-');
  expect(api.ensure).not.toHaveBeenCalled();
});

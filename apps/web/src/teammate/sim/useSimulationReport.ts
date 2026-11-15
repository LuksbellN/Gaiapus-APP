// Makes sure the technical report of a run exists in the language the app is actually rendering, without any
// click. One request per (run, scope, language): a change of any of them aborts the previous request, and an
// answer is only ever shown under the identity it was asked for. Nothing here touches the scientific adapters.
import { useEffect, useState } from 'react';
import type { ReportGenerationResult, ReportScope } from '@gaiapus/contracts';
import { simulationReports } from '../adapters/simulation-reports';
import { useI18n } from '../i18n';
import type { Locale } from '../i18n/locale';
import { reportRequestKey } from './report-model';

export type ReportView =
  | { status: 'idle' | 'loading'; key: string | null }
  | { status: 'ready'; key: string; result: ReportGenerationResult & { representation: NonNullable<ReportGenerationResult['representation']> } }
  | { status: 'failed'; key: string; result: ReportGenerationResult }
  | { status: 'error'; key: string; error: unknown };

type Source = { runId: string | null; scope: ReportScope; reportId?: string | null };

export function useSimulationReport({ runId, scope, reportId = null }: Source): ReportView & { locale: Locale; retry: () => void } {
  // `locale` is the language on screen; while a chosen catalogue is still loading the request waits, so a report
  // is never asked in English and shown under an interface that is about to become French.
  const { locale, loading } = useI18n();
  const [view, setView] = useState<ReportView>({ status: 'idle', key: null });
  const [attempt, setAttempt] = useState(0);
  // A saved representation keeps its own language: it is read by id and does not follow the interface.
  const key = runId ? (reportId ? `${runId}|saved|${reportId}` : reportRequestKey(runId, scope, locale)) : null;
  const waiting = !reportId && loading;

  useEffect(() => {
    if (!runId || !key) { setView({ status: 'idle', key: null }); return; }
    setView({ status: 'loading', key });
    if (waiting) return;
    const controller = new AbortController();
    const asked = key;
    (reportId ? simulationReports.get(runId, reportId, controller.signal) : simulationReports.ensure(runId, { locale, scope }, controller.signal)).then((result) => {
      if (controller.signal.aborted) return;
      const { representation } = result;
      if (result.state === 'succeeded' && representation && result.run_id === runId) setView({ status: 'ready', key: asked, result: { ...result, representation } });
      else setView({ status: 'failed', key: asked, result });
    }).catch((error: unknown) => { if (!controller.signal.aborted && (error as Error)?.name !== 'AbortError') setView({ status: 'error', key: asked, error }); });
    return () => controller.abort();
  // `key` already holds everything that identifies the request (run, scope and language, or the saved report id).
  }, [key, waiting, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // The state held may belong to the previous identity for one render: never expose it as the current one.
  const current: ReportView = view.key === key ? view : { status: key ? 'loading' : 'idle', key };
  return { ...current, locale, retry: () => setAttempt((n) => n + 1) };
}

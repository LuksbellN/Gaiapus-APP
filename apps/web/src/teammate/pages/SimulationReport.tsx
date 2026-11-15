// Reading page of the technical report of a future-planning simulation (#/relatorio?run=<run id>).
// The report is ensured automatically in the language the app is rendering; nothing is printed, downloaded or
// copied without a click. The page shows the document the API rendered and exports exactly the representation
// on screen (its id and its language), whatever happens to the interface language afterwards.
import './SimulationReport.css';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Copy, Download, FileText, Link2, Printer } from 'lucide-react';
import type { ReportSection } from '@gaiapus/contracts';
import { simulationReports } from '../adapters/simulation-reports';
import { CROPS, isCropId } from '../catalog';
import { dFull } from '../format';
import { useI18n } from '../i18n';
import { LOCALE_LABEL } from '../i18n/locale';
import { reportHref, reportIdOf, reportPath, reportPlaceOf, reportRunOf, reportScopeOf, reportSeasonOf, simulationHref } from '../sim/report-model';
import { useSimulationReport } from '../sim/useSimulationReport';
import { ErrorState, Notice, Pill, Seg } from '../ui';
import { ReportDocument } from '../ui/ReportDocument';

export function SimulationReport() {
  const { t, locale } = useI18n();
  const [params, setParams] = useSearchParams();
  const runId = reportRunOf(params), reportId = reportIdOf(params), scope = reportScopeOf(params), season = reportSeasonOf(params), local = reportPlaceOf(params);
  const report = useSimulationReport({ runId, scope, reportId });
  const [feedback, setFeedback] = useState<string | null>(null);
  // Feedback of an action belongs to the report it was taken on.
  useEffect(() => { setFeedback(null); }, [report.key]);

  const back = simulationHref(params);
  const cropLabel = (id: string) => (isCropId(id) ? CROPS[id].name : id === 'maize' || id === 'wheat_winter' ? t(`sim.planning.cropNames.${id}`) : id);
  const address = (extra: { scope?: 'run' | 'season'; reportId?: string | null } = {}) => ({ run: runId!, season, local, scope: extra.scope ?? (scope.kind === 'season' ? 'season' as const : 'run' as const), reportId: extra.reportId ?? null });

  if (!runId) {
    return (
      <div className="page report"><h1>{t('report.title')}</h1>
        <Notice tone="warn">{t('report.missingRun')} <a href="#/simulador?modo=planejamento">{t('report.openPlanning')}</a></Notice>
      </div>
    );
  }

  const ready = report.status === 'ready' ? report.result : null;
  const representation = ready?.representation ?? null;
  // A failure is announced by its own alert below; the status line never repeats it.
  const statusText = feedback ?? (report.status === 'ready' ? t('report.ready') : report.status === 'failed' || report.status === 'error' ? '' : t('report.preparing'));
  const sectionStatus = (section: ReportSection) => (section.status === 'available' ? null : <Pill tone={section.status === 'unavailable' ? 'risk' : 'warn'}>{t(`report.sectionStatus.${section.status}`)}</Pill>);
  const copyMarkdown = async () => {
    if (!representation) return;
    try { await navigator.clipboard.writeText(await simulationReports.markdown(runId, representation.report_id)); setFeedback(t('report.mdCopied')); }
    catch { setFeedback(t('report.copyFailed')); }
  };
  const copyLink = async () => {
    if (!representation) return;
    try { await navigator.clipboard.writeText(`${location.origin}${location.pathname}${reportHref(address({ reportId: representation.report_id }))}`); setFeedback(t('report.linkCopied')); }
    catch { setFeedback(t('report.copyFailed')); }
  };
  const reportLanguage = representation ? LOCALE_LABEL[representation.resolved_locale] : '', appLanguage = LOCALE_LABEL[locale];
  const otherLanguage = !!representation && representation.resolved_locale !== locale;

  return (
    <div className="page report" data-state={report.status}>
      <header className="report__header">
        <p className="report__back"><a href={back}>{t('report.backToSimulation')}</a></p>
        <h1>{representation ? representation.document.title : t('report.title')}</h1>
        {representation && <p className="report__subtitle">{representation.document.subtitle}</p>}
      </header>

      <div className="report__bar">
        {season && !reportId && <Seg legend={t('report.scopeLegend')} name="escopo" value={scope.kind === 'season' ? 'season' : 'run'}
          onChange={(v) => setParams((prev) => { const next = new URLSearchParams(prev); if (v === 'season') next.set('escopo', 'safra'); else next.delete('escopo'); return next; }, { replace: true })}
          options={[{ value: 'run', label: t('report.scopeRun') }, { value: 'season', label: t('report.scopeSeason', { crop: cropLabel(season.crop_id), year: season.harvest_year }) }]} />}
        {representation && (
          <div className="report__actions" role="group" aria-label={t('report.actions')}>
            <button type="button" className="btn" onClick={() => window.print()}><Printer size={18} aria-hidden />{t('report.print')}</button>
            <button type="button" className="btn" onClick={() => void copyMarkdown()}><Copy size={18} aria-hidden />{t('report.copyMd')}</button>
            <a className="btn" href={simulationReports.exportUrl(runId, representation.report_id, 'md')} download={`${representation.report_id}.md`}><Download size={18} aria-hidden />{t('report.downloadMd')}</a>
            <a className="btn" href={simulationReports.exportUrl(runId, representation.report_id, 'html')} target="_blank" rel="noopener noreferrer"><FileText size={18} aria-hidden />{t('report.openHtml')}</a>
            <button type="button" className="btn" onClick={() => void copyLink()}><Link2 size={18} aria-hidden />{t('report.copyLink')}</button>
          </div>
        )}
      </div>

      <p className="meta report__status" role="status" aria-live="polite">{statusText}</p>
      {representation && <p className="meta-13 report__meta" data-testid="report-meta">{t('report.meta', { language: reportLanguage, date: dFull(representation.generated_at), version: representation.template_version })} · {t('report.printHint')}</p>}

      {representation && otherLanguage && (
        <div data-testid="report-language-notice" className="report__notice">
          {reportId
            ? <Notice>{t('report.savedLanguage', { reportLanguage, appLanguage })} <Link to={reportPath(address())}>{t('report.openInAppLanguage', { appLanguage })}</Link></Notice>
            : <Notice tone="warn">{t('report.fallback', { reportLanguage, appLanguage })}</Notice>}
        </div>
      )}

      {report.status === 'loading' || report.status === 'idle' ? <div className="stack-2" aria-hidden>{[88, 74, 60, 46].map((w) => <div key={w} className="skeleton" style={{ height: 22, width: `${w}%` }} />)}</div> : null}
      {report.status === 'failed' && (
        <div className="notice notice--risk" role="alert"><div className="stack-2"><span><strong>{t('report.failed')}</strong> {t('report.simulationIntact')}</span>
          <div className="row"><button type="button" className="btn btn--sm" onClick={report.retry}>{t('report.retry')}</button></div></div></div>
      )}
      {report.status === 'error' && <div className="stack-2"><ErrorState error={report.error} onRetry={report.retry} /><p className="meta">{t('report.simulationIntact')}{reportId ? <> <Link to={reportPath(address())}>{t('report.openCurrent')}</Link></> : null}</p></div>}
      {representation && <ReportDocument document={representation.document} status={sectionStatus} />}
    </div>
  );
}

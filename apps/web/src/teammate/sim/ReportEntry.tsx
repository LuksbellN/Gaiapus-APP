// "Technical report" next to the run information of the season planning. It only shows the state of the report
// that is ensured automatically for the run on screen and links to the reading page: it never opens, prints,
// downloads or moves the focus by itself, and a failure here leaves the simulation as it is.
import { dFull } from '../format';
import { useI18n } from '../i18n';
import { LOCALE_LABEL } from '../i18n/locale';
import type { ReportView } from './useSimulationReport';

export function ReportEntry({ view, seasons, href, onRetry }: { view: ReportView; seasons: number; href: string; onRetry: () => void }) {
  const { t } = useI18n();
  const representation = view.status === 'ready' ? view.result.representation : null;
  const broken = view.status === 'failed' || view.status === 'error';
  return (
    <div className="card card--flat" data-testid="planning-report" data-state={view.status}>
      <h2 className="h3">{t('report.entry.title')}</h2>
      <p className="meta-13" role="status" aria-live="polite">{representation ? t('report.entry.ready') : broken ? t('report.entry.failed') : t('report.entry.preparing')}</p>
      {representation && <>
        <p className="meta-13">{t('report.entry.scope', { count: seasons })} · {t('report.meta', { language: LOCALE_LABEL[representation.resolved_locale], date: dFull(representation.generated_at), version: representation.template_version })}</p>
        <div><a className="btn btn--sm" href={href} data-testid="open-report">{t('report.entry.open')}</a></div>
      </>}
      {broken && <div><button type="button" className="btn btn--sm" onClick={onRetry}>{t('report.retry')}</button></div>}
    </div>
  );
}

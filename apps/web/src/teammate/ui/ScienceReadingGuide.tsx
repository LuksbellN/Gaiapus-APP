// How to read the water numbers: reference demand, crop need, simulated use, deficit, reserve and the scale of the weather source.
import { useI18n, type MessageKey } from '../i18n';

const TERMS = ['et0', 'etc', 'eta', 'deficit', 'reserve'] as const;
export function ScienceReadingGuide({ source, open = false }: { source: string; open?: boolean }) {
  const { t } = useI18n();
  return (
    <details className="card" data-testid="reading-guide" open={open}>
      <summary><b>{t('fieldShift.v2.guide.title')}</b></summary>
      <ul className="plain stack-2">{TERMS.map((k) => <li key={k} data-term={k}>{t(`fieldShift.v2.guide.${k}` as MessageKey)}</li>)}<li data-term="scale">{t('fieldShift.v2.guide.scale', { source })}</li></ul>
    </details>
  );
}

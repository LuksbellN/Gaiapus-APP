// How to read the water numbers: reference demand, crop need, simulated use, deficit, reserve and the scale of the weather source.
import { useI18n, type MessageKey } from '../i18n';
import { nMax } from '../format';

const TERMS = ['et0', 'etc', 'eta', 'deficit', 'reserve'] as const;
export function ScienceReadingGuide({ source, open = false, soil }: { source: string; open?: boolean; soil?: { cad_class: string; capacity_mm: number } }) {
  const { t } = useI18n();
  return (
    <details className="card" data-testid="reading-guide" open={open}>
      <summary><b>{t('fieldShift.v2.guide.title')}</b></summary>
      <ul className="plain stack-2">{TERMS.map((k) => <li key={k} data-term={k}>{t(`fieldShift.v2.guide.${k}` as MessageKey)}</li>)}{soil && <li data-term="soil">{t('fieldShift.v2.guide.soil', { cls: soil.cad_class, mm: nMax(soil.capacity_mm, 0) })}</li>}<li data-term="ndvi">{t('fieldShift.v2.guide.ndvi')}</li><li data-term="scale">{t('fieldShift.v2.guide.scale', { source })}</li><li data-term="sources">{t('fieldShift.v2.guide.sources')}</li></ul>
    </details>
  );
}

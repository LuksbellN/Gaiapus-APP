// "Where is this data from" strip, always visible under the title of a data screen (D-02).
// It never depends on having a plot: the demonstration warning is shown whenever the data are not the user's field.
import { Link } from 'react-router-dom';
import { AlertTriangle, MapPin } from 'lucide-react';
import type { ResolvedPlace } from '../context';
import { useI18n } from '../i18n';

export function ScopeStrip({ place, scale, period, elsewhere }: { place: ResolvedPlace; scale?: string; period?: string; elsewhere: { plot: string; place: string } | null }) {
  const demo = place.origin === 'demo'; const { t, tn } = useI18n();
  return (
    <section className="scope" data-testid="scope-strip" data-tour="scope-strip" data-origin={place.origin} aria-label={t('scope.label')}>
      <p className="scope__line"><MapPin size={16} aria-hidden /><span><b>{t('scope.dataOf', { place: place.name })}</b> · {scale ?? t('scope.wholeMunicipality')}{period ? ` · ${period}` : ''}</span></p>
      {elsewhere ? <p className="scope__line scope__line--warn"><AlertTriangle size={16} aria-hidden /><span>{demo ? t('scope.demoPrefix') : ''}{t('scope.elsewhere', { plot: elsewhere.plot, place: elsewhere.place })}</span></p>
        : demo ? <p className="scope__line scope__line--warn"><AlertTriangle size={16} aria-hidden /><span>{tn('scope.demo', { link: <Link to="/propriedades">{t('scope.demoLink')}</Link> })}</span></p> : null}
    </section>
  );
}

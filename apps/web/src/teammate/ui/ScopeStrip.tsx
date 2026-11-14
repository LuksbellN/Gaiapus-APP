// "Where is this data from" strip, always visible under the title of a data screen (D-02).
// It never depends on having a plot: the demonstration warning is shown whenever the data are not the user's field.
import { Link } from 'react-router-dom';
import { AlertTriangle, MapPin } from 'lucide-react';
import type { ResolvedPlace } from '../context';

export function ScopeStrip({ place, scale = 'município inteiro', period, elsewhere }: { place: ResolvedPlace; scale?: string; period?: string; elsewhere: { plot: string; place: string } | null }) {
  const demo = place.origin === 'demo';
  return (
    <section className="scope" data-testid="scope-strip" data-origin={place.origin} aria-label="De onde é este dado">
      <p className="scope__line"><MapPin size={16} aria-hidden /><span><b>Dados de {place.name}</b> · {scale}{period ? ` · ${period}` : ''}</span></p>
      {elsewhere ? <p className="scope__line scope__line--warn"><AlertTriangle size={16} aria-hidden /><span>{demo ? 'Demonstração. ' : ''}Seu talhão em uso ({elsewhere.plot}) fica em {elsewhere.place}; estes dados não são dele.</span></p>
        : demo ? <p className="scope__line scope__line--warn"><AlertTriangle size={16} aria-hidden /><span>Você está vendo a demonstração de Sorriso. <Link to="/propriedades">Cadastre sua propriedade e talhão</Link> para acompanhar a sua safra.</span></p> : null}
    </section>
  );
}

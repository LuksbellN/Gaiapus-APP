// The old #/local address: the place screen (#/municipio) now shows the data core for every country.
import { Navigate, useSearchParams } from 'react-router-dom';

export function LocationPage() {
  const [params] = useSearchParams();
  const id = params.get('id');
  return <Navigate to={id ? `/municipio?id=${encodeURIComponent(id)}` : '/municipio'} replace />;
}

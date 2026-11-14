// Módulos carregados sob demanda com falha recuperável. React.lazy guardaria a falha para sempre e,
// sem rede no campo, a tela ficaria em branco; aqui a falha vira um estado com "Tentar de novo".
import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { AdapterError } from './adapters/core';
import { ErrorState, Loading } from './ui';

type Loader<T> = () => Promise<T>;
const cache = new Map<Loader<unknown>, unknown>();
const pending = new Map<Loader<unknown>, Promise<unknown>>();
function fetchModule<T>(loader: Loader<T>): Promise<T> {
  if (cache.has(loader)) return Promise.resolve(cache.get(loader) as T);
  let p = pending.get(loader) as Promise<T> | undefined;
  if (!p) { p = loader().then((m) => { cache.set(loader, m); return m; }).finally(() => pending.delete(loader)); pending.set(loader, p); }
  return p;
}
/** Carrega `loader` uma vez por sessão. `failed` vira true se o download falhar; `retry` tenta de novo. */
export function useLazy<T>(loader: Loader<T>, enabled = true) {
  const [mod, setMod] = useState<T | null>(() => (cache.has(loader) ? (cache.get(loader) as T) : null)); const [failed, setFailed] = useState(false); const [tick, setTick] = useState(0);
  useEffect(() => { if (!enabled || mod) return; let alive = true; setFailed(false); fetchModule(loader).then((m) => { if (alive) setMod(() => m); }).catch(() => { if (alive) setFailed(true); }); return () => { alive = false; }; }, [loader, enabled, tick]); // eslint-disable-line
  const retry = useCallback(() => setTick((t) => t + 1), []);
  return { mod, failed, retry };
}

// Economia de dados: com "Economia de dados" ligada ou rede 2G, nada é baixado antes de o usuário pedir.
export function dataSaver() { const c = (navigator as any).connection; return !!c && (c.saveData === true || /(^|-)2g$/.test(String(c.effectiveType ?? ''))); }

const pages = new Map<string, Loader<unknown>>();
/** Intenção de navegar (ponteiro, foco ou toque no link): baixa só o arquivo daquela tela. Mapa e 3D ficam para a própria tela. */
export function preloadRoute(path: string) { const l = pages.get(path); if (l && !dataSaver()) fetchModule(l).catch(() => { /* a tela mostra o erro se for aberta */ }); }
/** Em segundo plano, baixa os arquivos leves das telas (sem MapLibre nem Three.js) para a navegação resistir à queda de rede. */
export function preloadLightPages() { if (dataSaver()) return; pages.forEach((l) => fetchModule(l).catch(() => { /* idem */ })); }

export function lazyPage<M, K extends keyof M>(path: string | null, loader: Loader<M>, name: K) {
  if (path) pages.set(path, loader as Loader<unknown>);
  return function LazyPage() {
    const { mod, failed, retry } = useLazy(loader);
    if (mod) { const C = mod[name] as unknown as ComponentType; return <C />; }
    return <div className="page">{failed ? <><h1>Não foi possível abrir esta tela</h1><ErrorState error={new AdapterError('network', 0)} onRetry={retry} /><p className="meta">Seus registros continuam salvos neste aparelho.</p></> : <Loading label="Carregando a tela…" rows={5} />}</div>;
  };
}

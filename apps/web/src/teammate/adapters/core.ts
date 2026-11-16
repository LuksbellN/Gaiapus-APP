// Infra comum dos adapters. Enquanto o backend não está integrado, cada adapter devolve
// fixtures do pacote v7 ou mocks identificados, com a mesma forma assíncrona de uma chamada HTTP.
// fixture = bundled in this app; publicacao = publication served by the Gaiapus API (with its version).
export type Kind = 'fixture' | 'publicacao' | 'mock' | 'local' | 'sintetico';
/** `source` and `note` may carry original text from the publication; `noteKey` is an interface message translated at render. */
/** `version` and `contract` are data: the footer names them in the language on screen when it is drawn, never when the data is loaded. */
export type Meta = { kind: Kind; source: string; note?: string; noteKey?: string; noteVars?: Record<string, string | number>; generatedAt?: string; version?: string; contract?: string };
export type Sourced<T> = { data: T; meta: Meta };
export class AdapterError extends Error { constructor(public code: string, public status: number, message?: string) { super(message ?? code); } }

let latencyOverride: number | null = null;
export const setLatency = (ms: number | null) => { latencyOverride = ms; };
function latency() {
  if (latencyOverride != null) return latencyOverride;
  try { const q = new URLSearchParams(location.hash.split('?')[1] ?? '').get('latencia'); if (q) return Number(q); } catch { /* sem location */ }
  return 80;
}
export function wait(signal?: AbortSignal, ms = latency()): Promise<void> {
  return new Promise((res, rej) => {
    if (signal?.aborted) return rej(new DOMException('Aborted', 'AbortError'));
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return rej(new AdapterError('network', 0, 'Sem conexão'));
    const t = setTimeout(res, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Aborted', 'AbortError')); }, { once: true });
  });
}
// Garante que só a resposta do pedido mais recente seja aplicada (evita Sorriso sob o título Uberlândia).
export function latestOnly() {
  let token = 0; let ctrl: AbortController | null = null;
  return async function run<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<{ stale: true } | { stale: false; value: T }> {
    const mine = ++token; ctrl?.abort(); ctrl = new AbortController();
    try { const value = await fn(ctrl.signal); return mine === token ? { stale: false, value } : { stale: true }; }
    catch (e) { if (mine !== token || (e as Error).name === 'AbortError') return { stale: true }; throw e; }
  };
}

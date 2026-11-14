// Test-only: answers /v1/geography and /v1/coverage with responses recorded from the real API (fixture mode, 14/11/2026).
import { vi } from 'vitest';

const files = import.meta.glob<{ default: unknown }>('./__fixtures__/*.json', { eager: true });
const json = (name: string) => files[`./__fixtures__/${name}.json`]?.default;

export function mockCatalog(opts: { failCoverage?: boolean; failGeography?: boolean; observations?: unknown } = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(String(input), 'http://x');
    if (url.pathname === '/v1/geography') return opts.failGeography ? new Response('{}', { status: 503 }) : new Response(JSON.stringify(json('geography')), { status: 200 });
    if (url.pathname === '/v1/coverage') {
      if (opts.failCoverage) return new Response(JSON.stringify({ error: { code: 'dependency_failure', message: 'x' } }), { status: 503 });
      const body = json(`coverage-${url.searchParams.get('area_id')}`);
      return body ? new Response(JSON.stringify(body), { status: 200 }) : new Response(JSON.stringify({ error: { code: 'not_found', message: 'Resource not found' } }), { status: 404 });
    }
    if (url.pathname === '/v1/observations' && opts.observations) return new Response(JSON.stringify({ data: opts.observations, meta: {} }), { status: 200 });
    throw new Error(`Unexpected request ${url.pathname}`);
  });
}

import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../app.js';
import { LiveExecutor } from './analysis/executor.js';
import { createServer } from 'node:http';
describe('service packaging and dependency boundaries', () => {
  it('serves published georeferenced assets and never replaces API errors with SPA HTML', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'gaiapus-web-'));
    await writeFile(join(directory, 'index.html'), '<!doctype html><title>Frontend integration fixture</title>');
    const app = createApp({ frontendDir: directory });
    try {
      const page = await app.inject('/saved/comparison'); expect(page.statusCode).toBe(200); expect(page.body).toContain('Frontend integration fixture');
      const missingApi = await app.inject('/v1/not-found'); expect(missingApi.statusCode).toBe(404); expect(missingApi.headers['content-type']).toContain('application/json');
      const missingAsset = await app.inject('/publications/missing.png'); expect(missingAsset.statusCode).toBe(404); expect(missingAsset.headers['content-type']).toContain('application/json');
      const field = (await app.inject('/v1/geography?q=recorte')).json().data.items[0];
      const geometry = await app.inject(field.geometry_ref); expect(geometry.statusCode).toBe(200); expect(geometry.json().type).toBe('Feature');
      const traversal = await app.inject('/publications/%2e%2e/%2e%2e/.env'); expect(traversal.statusCode).toBe(404);
    } finally { await app.close(); await rm(directory, { recursive: true, force: true }); }
  });
  it('enforces the live HTTP deadline and passes internal authentication without retrying', async () => {
    let requests = 0; let authorization: string | undefined;
    const server = createServer((request, _response) => { requests++; authorization = request.headers.authorization; });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as { port: number };
    try {
      const live = new LiveExecutor(`http://127.0.0.1:${address.port}`, 'internal-test-token', 700);
      await expect(live.execute('yield_estimate', {}, { requestId: 'deadline-test' })).rejects.toMatchObject({ status: 503, code: 'dependency_timeout' });
      expect(requests).toBe(1); expect(authorization).toBe('Bearer internal-test-token');
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  });
});

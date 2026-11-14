import { it, expect } from 'vitest';
import { createApp } from './app.js';
it('provides minimal liveness without dependencies or a bound port', async () => {
  const app = createApp();
  const response = await app.inject('/health');
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ status: 'ok' });
  await app.close();
});

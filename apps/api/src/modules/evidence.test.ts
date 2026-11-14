import { describe, it, expect } from 'vitest';
import { createApp } from '../app.js';
import { testDependencies, authA, authB } from '../../tests/helpers.js';
import { examples, publication } from '@gaiapus/contracts/fixtures';
import { validators } from '@gaiapus/contracts';
describe('explicit private evidence review baselines', () => {
  it('starts with a null baseline, ignores public prefetch, and records only an explicit review', async () => {
    const app = createApp(testDependencies());
    const key = examples[0]!.result.meta.context_key; const url = `/v1/evidence-views?context_key=${encodeURIComponent(key)}`;
    const empty = await app.inject({ url, headers: authA });
    expect(empty.statusCode).toBe(200); expect(empty.json().data).toBeNull(); expect(validators.EvidenceReviewResultResponse!(empty.json())).toBe(true);
    await app.inject(`/v1/examples/${examples[0]!.example_id}`);
    expect((await app.inject({ url, headers: authA })).json().data).toBeNull();
    const saved = await app.inject({ method: 'POST', url: '/v1/evidence-views', headers: authA, payload: { context_key: key, publication_version: publication.publication_version } });
    expect(saved.statusCode).toBe(200); expect(validators.EvidenceReviewResponse!(saved.json())).toBe(true);
    expect(Date.parse(saved.json().data.reviewed_at)).toBeGreaterThan(0);
    expect((await app.inject({ url, headers: authA })).json().data).toEqual(saved.json().data);
    expect((await app.inject({ url, headers: authB })).json().data).toBeNull(); await app.close();
  });
  it('rejects invented contexts, unknown versions, and mismatched context parameters', async () => {
    const app = createApp(testDependencies());
    for (const payload of [{ context_key: 'made-up', publication_version: publication.publication_version }, { context_key: examples[0]!.result.meta.context_key, publication_version: 'future' }, { context_key: 'coverage:{"area_id":"unknown"}', publication_version: publication.publication_version }]) {
      expect((await app.inject({ method: 'POST', url: '/v1/evidence-views', headers: authA, payload })).statusCode).toBe(422);
    }
    await app.close();
  });
  it('keeps identical repeated review requests idempotent, including exact observation contexts', async () => {
    const app = createApp(testDependencies());
    const evidence = (await app.inject('/v1/observations?area_id=published-field-uberlandia&start=2024-04-01&end=2024-07-31')).json();
    const payload = { context_key: evidence.meta.context_key, publication_version: evidence.meta.publication_version };
    const first = await app.inject({ method: 'POST', url: '/v1/evidence-views', headers: authA, payload });
    const again = await app.inject({ method: 'POST', url: '/v1/evidence-views', headers: authA, payload });
    expect(first.statusCode).toBe(200); expect(again.json().data).toEqual(first.json().data); await app.close();
  });
});

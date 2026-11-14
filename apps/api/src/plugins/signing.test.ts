import { it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { supabaseDependencies } from './supabase.js';
import { canonicalJson } from '@gaiapus/contracts';
import { vi } from 'vitest';
it('attests immutable snapshots and review identities before sending the user-scoped RPC', async () => {
  const requests: { url: string; body: any; authorization: string | null }[] = [];
  const signingKey = 'test-only-signing-key-32-characters-minimum';
  vi.stubGlobal('fetch', async (url: string, options: RequestInit) => {
    requests.push({ url: String(url), body: JSON.parse(String(options.body)), authorization: new Headers(options.headers).get('authorization') });
    return new Response(JSON.stringify({ id: 'saved', context_key: 'example:test', publication_version: 'v1', reviewed_at: '2026-11-14T12:00:00Z' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  try {
    const repo = supabaseDependencies({ url: 'https://db.example.test', publishableKey: 'publishable-test', signingKey }).repositoryFor({ id: '00000000-0000-4000-8000-000000000001', token: 'verified-user-token' });
    await repo.saveComparison('save', 'fingerprint', 'Title', '', null, {} as any);
    await repo.recordReview('example:test', 'v1');
    expect(requests).toHaveLength(2);
    for (const [index, call] of requests.entries()) {
      expect(call.authorization).toBe('Bearer verified-user-token');
      const payload = JSON.parse(call.body.p_payload);
      expect(payload.purpose).toBe(index ? 'evidence_review' : 'snapshot'); expect(payload.user_id).toBe('00000000-0000-4000-8000-000000000001');
      expect(call.body.p_signature).toBe(createHmac('sha256', signingKey).update(call.body.p_payload).digest('hex'));
      expect(call.body.p_payload).toBe(canonicalJson(payload));
    }
  } finally { vi.unstubAllGlobals(); }
});

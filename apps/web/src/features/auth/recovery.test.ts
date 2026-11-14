import { beforeEach, expect, it } from 'vitest';
import { canResumeRecovery, clearRecovery, rememberRecovery } from './recovery';
import type { Session } from '@supabase/supabase-js';
const session = { user: { id: 'user' }, expires_at: 123 } as Session;
beforeEach(() => sessionStorage.clear());
it('resumes the same recovery session, clearing it after completion', () => {
  rememberRecovery(session);
  expect(canResumeRecovery(session)).toBe(true);
  clearRecovery();
  expect(canResumeRecovery(session)).toBe(false);
});
it('rejects different users, sessions, malformed markers, and expired recovery', () => {
  rememberRecovery(session);
  expect(canResumeRecovery({ ...session, user: { ...session.user, id: 'other' } })).toBe(false);
  rememberRecovery(session);
  expect(canResumeRecovery({ ...session, expires_at: 456 })).toBe(false);
  sessionStorage.setItem('gaiapus.auth.recovery', '{bad');
  expect(canResumeRecovery(session)).toBe(false);
  sessionStorage.setItem('gaiapus.auth.recovery', JSON.stringify({ user: 'user', sessionExpiry: 123, until: Date.now() - 1 }));
  expect(canResumeRecovery(session)).toBe(false);
});

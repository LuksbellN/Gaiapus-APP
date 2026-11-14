import { beforeEach, expect, it, vi } from 'vitest';
beforeEach(() => { localStorage.clear(); vi.resetModules(); });
it('never trusts a persisted prototype identity as authentication', async () => {
  localStorage.setItem('gaiapus.v1', JSON.stringify({ session: { userId: 'fake', name: 'Fake' }, properties: [], plots: [], records: [], plans: [] }));
  const store = await import('./store');
  expect(store.getState().session).toBeNull();
});
it('isolates local records for guest and each real account, restoring them on return', async () => {
  const { getState, setState, activateAccount } = await import('./store');
  setState({ drafts: { guest: { value: 'guest-only' } } });
  const user = { userId: 'A', name: 'A', email: 'a@example.com', researchConsent: false, consentAt: null };
  activateAccount(user);
  expect(getState().drafts).toEqual({});
  setState({ drafts: { private: { value: 'A-only' } } });
  activateAccount({ ...user, userId: 'B' });
  expect(getState().drafts).toEqual({});
  activateAccount(null);
  expect(getState().drafts).toEqual({ guest: { value: 'guest-only' } });
  activateAccount(user);
  expect(getState().drafts).toEqual({ private: { value: 'A-only' } });
});

import { afterEach, expect, it, vi } from 'vitest';
import { activateAccount, getState, resetAll } from '../store';
import { seasons, account } from './index';
afterEach(() => { vi.useRealTimers(); activateAccount(null); resetAll(); localStorage.clear(); });
it('rejects a pending property save if the account changes before completion', async () => {
  vi.useFakeTimers();
  const pending = seasons.saveProperty({ name: 'Private field', municipalityCode: '5107925', municipalityName: 'Sorriso', uf: 'MT', areaHa: 1 });
  const rejected = expect(pending).rejects.toMatchObject({ code: 'account_changed' });
  activateAccount({ userId: 'other', name: 'Other', email: 'other@example.com', researchConsent: false, consentAt: null });
  await vi.runAllTimersAsync(); await rejected;
  expect(getState().properties).toEqual([]);
});
it('rejects delayed consent after account switching', async () => {
  vi.useFakeTimers();
  activateAccount({ userId: 'A', name: 'A', email: 'a@example.com', researchConsent: false, consentAt: null });
  const pending = account.setConsent(true);
  const rejected = expect(pending).rejects.toMatchObject({ code: 'account_changed' });
  activateAccount({ userId: 'B', name: 'B', email: 'b@example.com', researchConsent: false, consentAt: null });
  await vi.runAllTimersAsync(); await rejected;
  expect(getState().session?.researchConsent).toBe(false);
});

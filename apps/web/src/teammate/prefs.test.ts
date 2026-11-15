import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getPrefs, PREFS_KEY, reloadPrefsForTest, setPrefs } from './prefs';
import { activateAccount, resetAll } from './store';

const user = { userId: 'A', name: 'A', email: 'a@example.com', researchConsent: false, consentAt: null };
beforeEach(() => { localStorage.clear(); reloadPrefsForTest(); activateAccount(null); });
afterEach(() => { vi.restoreAllMocks(); });

it('tema escolhido numa conta sobrevive à recarga (D-20)', () => {
  activateAccount(user);
  setPrefs({ theme: 'light' });
  reloadPrefsForTest(); // new page load
  activateAccount(user);
  expect(getPrefs().theme).toBe('light');
});

it('trocar de conta ou sair não muda tema nem idioma', () => {
  setPrefs({ theme: 'light', locale: 'de' });
  activateAccount(user); activateAccount({ ...user, userId: 'B' }); activateAccount(null);
  expect(getPrefs()).toMatchObject({ theme: 'light', locale: 'de' });
});

it('apagar dados da conta não apaga as preferências do aparelho', () => {
  setPrefs({ locale: 'fr' }); resetAll();
  expect(JSON.parse(localStorage.getItem(PREFS_KEY)!).locale).toBe('fr');
});

it('migra o tema antigo do balde do visitante uma vez, sem apagar o balde', () => {
  localStorage.setItem('gaiapus.v1.guest', JSON.stringify({ theme: 'light', records: [] }));
  reloadPrefsForTest();
  expect(getPrefs().theme).toBe('light');
  expect(JSON.parse(localStorage.getItem('gaiapus.v1.guest')!).records).toEqual([]);
});

it('armazenamento bloqueado: preferência vale na sessão e nada lança erro', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  expect(() => setPrefs({ locale: 'es' })).not.toThrow();
  expect(getPrefs().locale).toBe('es');
});

it('valor corrompido cai no padrão', () => {
  localStorage.setItem(PREFS_KEY, '{ not json');
  reloadPrefsForTest();
  expect(getPrefs()).toMatchObject({ theme: 'dark', locale: null });
});

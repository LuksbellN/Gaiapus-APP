// Ad-hoc, read-only check of how the theme preference behaves across a reload for a signed-in account.
// Simulates localStorage in memory; imports the real store module twice to stand in for two page loads.
const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() };
const STORE = new URL('../../../../../apps/web/src/teammate/store.ts', import.meta.url).href;
const user = { userId: 'A', name: 'A', email: 'a@example.com', researchConsent: false, consentAt: null };

const first = await import(STORE + '?load=1');
first.activateAccount(user);                 // session bridge after sign-in
first.setState({ theme: 'light' });          // user A picks the light theme
console.log('load 1, account A after toggle :', first.getState().theme);
console.log('stored keys                    :', [...mem.keys()].join(', '));
console.log('theme in guest bucket          :', JSON.parse(mem.get('gaiapus.v1.guest') ?? '{}').theme ?? '(none)');
console.log('theme in account A bucket      :', JSON.parse(mem.get('gaiapus.v1.user.A') ?? '{}').theme);
console.log('legacy key read by index.html  :', mem.get('gaiapus.v1') ?? '(absent)');

const second = await import(STORE + '?load=2'); // page reload: module state starts again from storage
console.log('load 2, before session bridge  :', second.getState().theme);
second.activateAccount(user);                // same account restored by the Supabase SDK
console.log('load 2, account A restored     :', second.getState().theme, second.getState().theme === 'light' ? '(kept)' : '(REVERTED)');

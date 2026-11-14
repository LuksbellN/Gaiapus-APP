import { useSyncExternalStore } from 'react';
import { cropIdFromName, isAmbiguousCropName } from './catalog';

export type Property = { id: string; name: string; municipalityCode: string; municipalityName: string; uf: string; areaHa: number | null; createdAt: string; updatedAt: string };
export type Plot = { id: string; propertyId: string; name: string; areaHa: number | null; soil: string; irrigation: string; polygon: 'demo_uberlandia' | null; createdAt: string; updatedAt: string };
export type RecordKind = 'plantio' | 'evento' | 'colheita' | 'venda';
// Todo registro guarda: quando ocorreu, quando foi registrado/atualizado, origem e versão do esquema.
export type FieldRecord = { id: string; kind: RecordKind; plotId: string; cycleId: string; event_at: string; recorded_at: string; updated_at: string; origin: 'informado' | 'observado' | 'estimado' | 'sintetico'; schema: 1; revision: number; data: Record<string, string> };
export type Plan = { id: string; createdAt: string; data: Record<string, string> };
export type Session = { userId: string; name: string; email: string; researchConsent: boolean; consentAt: string | null } | null;
export type State = { theme: 'dark' | 'light'; session: Session; properties: Property[]; plots: Plot[]; records: FieldRecord[]; plans: Plan[]; drafts: Record<string, Record<string, string>>; activePlotId: string | null };

const KEY = 'gaiapus.v1';
let activeKey = KEY + '.guest';
let accountScope = 0;
export const getAccountScope = () => accountScope;
const initial: State = { theme: 'dark', session: null, properties: [], plots: [], records: [], plans: [], drafts: {}, activePlotId: null };
let persistent = true;
// Registros e planos salvos antes do catálogo guardavam só o nome da cultura. A migração acrescenta `cultura_id`
// (ID do contrato) sem apagar nem reescrever nada. Nome ambíguo ("Café", "Milho") fica sem ID e marcado
// com `cultura_pendente`, para a interface pedir o complemento em vez de adivinhar espécie ou safra.
const withCropId = (d: Record<string, string>): Record<string, string> => { if ('cultura_id' in d || !('cultura' in d)) return d; const id = cropIdFromName(d.cultura); return { ...d, cultura_id: id ?? '', ...(!id && isAmbiguousCropName(d.cultura) ? { cultura_pendente: '1' } : {}) }; };
export function migrate(s: State): State { return { ...s, records: s.records.map((r) => (r.kind === 'plantio' ? { ...r, data: withCropId(r.data) } : r)), plans: s.plans.map((p) => ({ ...p, data: withCropId(p.data) })) }; }
function load(): State { try { const raw = localStorage.getItem(activeKey) ?? (activeKey === KEY + '.guest' ? localStorage.getItem(KEY) : null); return raw ? migrate({ ...initial, ...JSON.parse(raw) }) : initial; } catch { persistent = false; return initial; } }
let state: State = typeof localStorage === 'undefined' ? initial : { ...load(), session: null };
const subs = new Set<() => void>();
export const isPersistent = () => persistent;
export const getState = () => state;
export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  try { localStorage.setItem(activeKey, JSON.stringify(state)); persistent = true; } catch { persistent = false; }
  subs.forEach((f) => f());
}
export function useStore<T>(sel: (s: State) => T): T { return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => sel(state)); }
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const now = () => new Date().toISOString();
export function resetAll() { state = { ...initial, theme: state.theme, session: state.session }; try { localStorage.removeItem(activeKey); if (activeKey === KEY + '.guest') localStorage.removeItem(KEY); } catch { /* sem armazenamento */ } subs.forEach((f) => f()); }
// Only the verified Supabase session bridge calls this; stored identity never authenticates.
export function activateAccount(session: Session) {
  const nextKey = session ? KEY + '.user.' + session.userId : KEY + '.guest';
  if (nextKey === activeKey) { setState({ session: session ? { ...session, researchConsent: state.session?.researchConsent ?? false, consentAt: state.session?.consentAt ?? null } : null }); return; }
  const theme = state.theme;
  accountScope++;
  activeKey = nextKey;
  const saved = load();
  state = { ...saved, theme, session: session ? { ...session, researchConsent: saved.session?.researchConsent ?? false, consentAt: saved.session?.consentAt ?? null } : null };
  subs.forEach(f => f());
}
export function setDraft(key: string, data: Record<string, string> | null) { setState((s) => { const d = { ...s.drafts }; if (data) d[key] = data; else delete d[key]; return { drafts: d }; }); }

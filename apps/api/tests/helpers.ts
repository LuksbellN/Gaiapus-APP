import { randomUUID } from 'node:crypto';
import type { Identity, Repository, StoredComparison, SnapshotInput } from '../src/plugins/repository.js';
import type { MeResult, MonitoredPlace, UpdateAccountRequest, EvidenceReview } from '@gaiapus/contracts';
import { ApiError } from '../src/plugins/errors.js';
import { examples } from '@gaiapus/contracts/fixtures';
export const userA = '00000000-0000-4000-8000-000000000001';
export const userB = '00000000-0000-4000-8000-000000000002';
export const authA = { authorization: 'Bearer user-a' };
export const authB = { authorization: 'Bearer user-b' };
export function testDependencies() {
  const stores = new Map<string, Repository>();
  const repositoryFor = (user: Identity) => {
    if (!stores.has(user.id)) stores.set(user.id, memoryRepository(user.id));
    return stores.get(user.id)!;
  };
  return {
    capabilities: { yield_estimate: { ready: true, reason_code: null, supported_inputs: examples.filter(x => x.product_id === 'yield_estimate').map(x => x.input_snapshot) }, water_risk_projection: { ready: true, reason_code: null, supported_inputs: examples.filter(x => x.product_id === 'water_risk_projection').map(x => x.input_snapshot) } },
    verifyIdentity: async (token: string): Promise<Identity> => {
      if (token === 'unverified') throw new ApiError(401, 'email_verification_required', 'Email verification required');
      if (token !== 'user-a' && token !== 'user-b') throw new ApiError(401, 'unauthenticated', 'Authentication required');
      return { id: token === 'user-a' ? userA : userB, token };
    }, repositoryFor,
  };
}
function memoryRepository(userId: string): Repository {
  let account: MeResult | null = null;
  const places = new Map<string, MonitoredPlace>();
  const snapshots = new Map<string, StoredComparison>();
  const reviews = new Map<string, EvidenceReview>();
  const stamp = () => new Date().toISOString();
  return {
    async initialize() { account ??= { profile: { user_id: userId, display_name: null, created_at: stamp(), updated_at: stamp() }, preferences: { locale: 'pt-BR', last_monitored_place_id: null } }; },
    async me() { return structuredClone(account!); },
    async updateAccount(patch: UpdateAccountRequest) { if ('display_name' in patch) account!.profile.display_name = patch.display_name!; if (patch.locale) account!.preferences.locale = patch.locale; if ('last_monitored_place_id' in patch) account!.preferences.last_monitored_place_id = patch.last_monitored_place_id!; },
    async places() { return structuredClone([...places.values()]); },
    async place(id) { return structuredClone(places.get(id) ?? null); },
    async createPlace(area_id, kind, label) { const prior = [...places.values()].find(x => x.area_id === area_id); if (prior) return structuredClone(prior); const place = { id: randomUUID(), area_id, kind, label, created_at: stamp(), updated_at: stamp() }; places.set(place.id, place); return structuredClone(place); },
    async renamePlace(id, label) { const place = places.get(id); if (!place) return null; place.label = label; place.updated_at = stamp(); return structuredClone(place); },
    async deletePlace(id) { if (!places.delete(id)) return false; if (account?.preferences.last_monitored_place_id === id) account.preferences.last_monitored_place_id = null; for (const snapshot of snapshots.values()) if (snapshot.monitored_place_id === id) snapshot.monitored_place_id = null; return true; },
    async comparisons(page) { return structuredClone([...snapshots.values()].sort((a,b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id)).filter(row => !page.before || row.created_at < page.before.created_at || row.created_at === page.before.created_at && row.id < page.before.id).slice(0,page.limit+1).map(({ id,title,product_id,area_id,created_at,updated_at,result_basis,monitored_place_id }) => ({ id,title,product_id,area_id,created_at,updated_at,result_basis,monitored_place_id }))); },
    async comparison(id) { return structuredClone(snapshots.get(id) ?? null); },
    async findSave(key) { return structuredClone([...snapshots.values()].find(x => x.idempotency_key === key) ?? null); },
    async saveComparison(key, fingerprint, title, notes, placeId, snapshot: SnapshotInput) { const prior = [...snapshots.values()].find(x => x.idempotency_key === key); if (prior) { if (prior.request_fingerprint !== fingerprint) throw new ApiError(409, 'idempotency_conflict', 'Idempotency conflict'); return structuredClone(prior); } const stored = { ...structuredClone(snapshot), id: randomUUID(), title, notes, monitored_place_id: placeId, created_at: stamp(), updated_at: stamp(), idempotency_key: key, request_fingerprint: fingerprint }; snapshots.set(stored.id, stored); return structuredClone(stored); },
    async editComparison(id, patch) { const stored = snapshots.get(id); if (!stored) return null; Object.assign(stored, patch, { updated_at: stamp() }); return structuredClone(stored); },
    async deleteComparison(id) { return snapshots.delete(id); },
    async review(context) { return structuredClone(reviews.get(context) ?? null); },
    async recordReview(context_key, publication_version) { const prior = reviews.get(context_key); if (prior?.publication_version === publication_version) return structuredClone(prior); const review = { context_key, publication_version, reviewed_at: stamp() }; reviews.set(context_key, review); return structuredClone(review); },
  };
}

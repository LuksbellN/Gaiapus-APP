import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Identity, Repository, StoredComparison } from './repository.js';
import type { MonitoredPlace, EvidenceReview, MeResult, ComparisonSummary } from '@gaiapus/contracts';
import { ApiError } from './errors.js';
import { createHmac } from 'node:crypto';
import { canonicalJson } from '@gaiapus/contracts';
export interface SupabaseConfig { url: string; publishableKey: string; signingKey?: string }
export function supabaseDependencies(config: SupabaseConfig) {
  const authClient = createClient(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return {
    async verifyIdentity(token: string): Promise<Identity> {
      // getUser validates the token with the identity provider; never decode-only.
      let result;
      try { result = await authClient.auth.getUser(token); }
      catch { throw new ApiError(503, 'identity_unavailable', 'Identity provider unavailable'); }
      if (result.error) {
        if (!result.error.status || result.error.status >= 500) throw new ApiError(503, 'identity_unavailable', 'Identity provider unavailable');
        throw new ApiError(401, 'unauthenticated', 'Authentication required');
      }
      const user = result.data.user;
      if (!user?.id) throw new ApiError(401, 'unauthenticated', 'Authentication required');
      if (!user.email_confirmed_at) throw new ApiError(401, 'email_verification_required', 'Verify your email before continuing');
      return { id: user.id, token };
    },
    repositoryFor(identity: Identity): Repository {
      const client = createClient(config.url, config.publishableKey, { global: { headers: { Authorization: `Bearer ${identity.token}` } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      return new SupabaseRepository(client, identity.id, config.signingKey);
    },
  };
}
function check(error: { code?: string; message?: string } | null): void {
  if (!error) return;
  if (error.code === '23503' || error.code === '42501') throw new ApiError(404, 'not_found', 'Resource not found');
  if (error.code === 'P0001' && error.message?.includes('idempotency')) throw new ApiError(409, 'idempotency_conflict', 'Idempotency key reused for different inputs');
  throw new ApiError(503, 'database_unavailable', 'Personal storage unavailable');
}
const placeColumns = 'id,area_id,kind,label,created_at,updated_at';
const comparisonColumns = 'id,title,notes,product_id,area_id,created_at,updated_at,result_basis,monitored_place_id,input_snapshot,output_envelope,source_versions,idempotency_key,request_fingerprint';
class SupabaseRepository implements Repository {
  constructor(private client: SupabaseClient, private userId: string, private signingKey?: string) {}
  private attest(purpose: 'snapshot' | 'evidence_review', value: Record<string, unknown>) {
    if (!this.signingKey || this.signingKey.length < 32) throw new ApiError(503, 'storage_signing_unavailable', 'Server-attested storage is not configured');
    const p_payload = canonicalJson({ purpose, user_id: this.userId, ...value });
    return { p_payload, p_signature: createHmac('sha256', this.signingKey).update(p_payload).digest('hex') };
  }
  async initialize() { const { error } = await this.client.rpc('initialize_account'); check(error); }
  async me(): Promise<MeResult> {
    const [profile, preferences] = await Promise.all([
      this.client.from('profiles').select('user_id,display_name,created_at,updated_at').eq('user_id', this.userId).single(),
      this.client.from('user_preferences').select('locale,last_monitored_place_id').eq('user_id', this.userId).single(),
    ]); check(profile.error); check(preferences.error);
    return { profile: profile.data, preferences: preferences.data } as MeResult;
  }
  async updateAccount(patch: Parameters<Repository['updateAccount']>[0]) { const { error } = await this.client.rpc('update_account', { p_patch: patch }); check(error); }
  async places() { const { data, error } = await this.client.from('monitored_places').select(placeColumns).eq('user_id', this.userId).order('created_at').order('id'); check(error); return data as MonitoredPlace[]; }
  async place(id: string) { const { data, error } = await this.client.from('monitored_places').select(placeColumns).eq('user_id', this.userId).eq('id', id).maybeSingle(); check(error); return data as MonitoredPlace | null; }
  async createPlace(areaId: string, kind: MonitoredPlace['kind'], label: string) {
    const { data, error } = await this.client.from('monitored_places').insert({ user_id: this.userId, area_id: areaId, kind, label }).select(placeColumns).single();
    if (error?.code === '23505') {
      const existing = await this.client.from('monitored_places').select(placeColumns).eq('user_id', this.userId).eq('area_id', areaId).single(); check(existing.error); return existing.data as MonitoredPlace;
    }
    check(error); return data as MonitoredPlace;
  }
  async renamePlace(id: string, label: string) { const { data, error } = await this.client.from('monitored_places').update({ label }).eq('user_id', this.userId).eq('id', id).select(placeColumns).maybeSingle(); check(error); return data as MonitoredPlace | null; }
  async deletePlace(id: string) { const { data, error } = await this.client.from('monitored_places').delete().eq('user_id', this.userId).eq('id', id).select('id'); check(error); return !!data?.length; }
  async comparisons(page: Parameters<Repository['comparisons']>[0]) {
    let query = this.client.from('comparison_snapshots').select('id,title,product_id,area_id,created_at,updated_at,result_basis,monitored_place_id').eq('user_id', this.userId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(page.limit + 1);
    if (page.before) query = query.or(`created_at.lt.${page.before.created_at},and(created_at.eq.${page.before.created_at},id.lt.${page.before.id})`);
    const { data, error } = await query; check(error); return data as ComparisonSummary[];
  }
  async comparison(id: string) { const { data, error } = await this.client.from('comparison_snapshots').select(comparisonColumns).eq('user_id', this.userId).eq('id', id).maybeSingle(); check(error); return data as StoredComparison | null; }
  async findSave(key: string) { const { data, error } = await this.client.from('comparison_snapshots').select(comparisonColumns).eq('user_id', this.userId).eq('idempotency_key', key).maybeSingle(); check(error); return data as StoredComparison | null; }
  async saveComparison(key: string, fingerprint: string, title: string, notes: string, placeId: string | null, snapshot: Parameters<Repository['saveComparison']>[5]) {
    const { data, error } = await this.client.rpc('save_comparison', this.attest('snapshot', { idempotency_key: key, request_fingerprint: fingerprint, title, notes, monitored_place_id: placeId, snapshot })); check(error);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new ApiError(503, 'database_unavailable', 'Personal storage unavailable');
    const { user_id: _owner, ...saved } = row;
    return saved as StoredComparison;
  }
  async editComparison(id: string, patch: Parameters<Repository['editComparison']>[1]) { const { data, error } = await this.client.from('comparison_snapshots').update(patch).eq('user_id', this.userId).eq('id', id).select(comparisonColumns).maybeSingle(); check(error); return data as StoredComparison | null; }
  async deleteComparison(id: string) { const { data, error } = await this.client.from('comparison_snapshots').delete().eq('user_id', this.userId).eq('id', id).select('id'); check(error); return !!data?.length; }
  async review(context: string) { const { data, error } = await this.client.from('evidence_views').select('context_key,publication_version,reviewed_at').eq('user_id', this.userId).eq('context_key', context).maybeSingle(); check(error); return data as EvidenceReview | null; }
  async recordReview(context: string, version: string) {
    const { data, error } = await this.client.rpc('record_evidence_review', this.attest('evidence_review', { context_key: context, publication_version: version })); check(error);
    const { context_key, publication_version, reviewed_at } = Array.isArray(data) ? data[0] : data;
    return { context_key, publication_version, reviewed_at } as EvidenceReview;
  }
}

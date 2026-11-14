import type { MeResult, UpdateAccountRequest, MonitoredPlace, ComparisonDetail, ComparisonSummary, EvidenceReview } from '@gaiapus/contracts';
export interface Identity { id: string; token: string }
export type StoredComparison = ComparisonDetail & { idempotency_key: string; request_fingerprint: string };
export type SnapshotInput = Pick<ComparisonDetail, 'area_id' | 'product_id' | 'result_basis' | 'input_snapshot' | 'output_envelope' | 'source_versions'>;
export interface ComparisonPageInput { limit: number; before: { created_at: string; id: string } | null }
export interface Repository {
  initialize(): Promise<void>;
  me(): Promise<MeResult>;
  updateAccount(patch: UpdateAccountRequest): Promise<void>;
  places(): Promise<MonitoredPlace[]>;
  place(id: string): Promise<MonitoredPlace | null>;
  createPlace(areaId: string, kind: MonitoredPlace['kind'], label: string): Promise<MonitoredPlace>;
  renamePlace(id: string, label: string): Promise<MonitoredPlace | null>;
  deletePlace(id: string): Promise<boolean>;
  comparisons(page: ComparisonPageInput): Promise<ComparisonSummary[]>;
  comparison(id: string): Promise<StoredComparison | null>;
  findSave(key: string): Promise<StoredComparison | null>;
  saveComparison(key: string, fingerprint: string, title: string, notes: string, placeId: string | null, snapshot: SnapshotInput): Promise<StoredComparison>;
  editComparison(id: string, patch: { title?: string; notes?: string }): Promise<StoredComparison | null>;
  deleteComparison(id: string): Promise<boolean>;
  review(context: string): Promise<EvidenceReview | null>;
  recordReview(context: string, version: string): Promise<EvidenceReview>;
}

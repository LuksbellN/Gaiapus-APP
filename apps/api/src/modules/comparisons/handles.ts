import { randomUUID } from 'node:crypto';
import type { SnapshotInput } from '../../plugins/repository.js';
import { ApiError } from '../../plugins/errors.js';
export class ResultHandleStore {
  private entries = new Map<string, { owner: string; expires: number; snapshot: SnapshotInput }>();
  constructor(private now: () => number = Date.now, private maximum = 1000, private ttlMs = 15 * 60 * 1000) {}
  create(owner: string, snapshot: SnapshotInput) {
    for (const [id, entry] of this.entries) if (entry.expires <= this.now()) this.entries.delete(id);
    while (this.entries.size >= this.maximum) this.entries.delete(this.entries.keys().next().value!);
    const id = randomUUID(); const expires = this.now() + this.ttlMs;
    this.entries.set(id, { owner, expires, snapshot: structuredClone(snapshot) });
    return { id, expires_at: new Date(expires).toISOString() };
  }
  resolve(owner: string, id: string): SnapshotInput {
    const entry = this.entries.get(id);
    if (entry && entry.owner !== owner) throw new ApiError(404, 'not_found', 'Resource not found');
    if (!entry || entry.expires <= this.now()) { this.entries.delete(id); throw new ApiError(410, 'result_expired', 'Unsaved result expired; explicitly run the analysis again'); }
    return structuredClone(entry.snapshot);
  }
}

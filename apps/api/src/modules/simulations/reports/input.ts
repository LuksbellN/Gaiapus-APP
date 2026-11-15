// Resolves, authorises and verifies everything a report is built from, on the server. The browser only names a run
// and a scope: no metric ever comes from the request. Integrity is checked by the PublicationStore.
import type { ReportScope, SimulationRun, SimulationSeries } from '@gaiapus/contracts';
import { ApiError } from '../../../plugins/errors.js';
import { ArtifactIntegrityError, type PublicationStore } from '../publication-store.js';
import { normalizeScope, type VerifiedReportInput } from './facts.js';

/** Chart data of the representative members; present only when the series artifact was verified. */
export type VerifiedSeries = SimulationSeries | null;

/**
 * Public route authorisation: only regional publications marked public are reportable here. Knowing a run id is
 * not an authorisation; anything else answers as if it did not exist. A private report needs its own
 * authenticated path and a private variant (not part of this release).
 */
export async function loadVerifiedReportInput(store: PublicationStore, runId: string, scope: ReportScope | undefined): Promise<VerifiedReportInput> {
  const publication = await store.publication(runId);
  if (publication.visibility !== 'public_regional') throw new ApiError(404, 'not_found', 'Resource not found');
  // A corrupted or unreachable run stops here: no report is built from, or served for, an unverified run.
  const run = await store.run(runId) as unknown as SimulationRun;
  if (run.execution_status !== 'succeeded') throw new ApiError(409, 'simulation_not_succeeded', `The simulation is ${run.execution_status}; a report exists only for a succeeded run`);
  const normalized = normalizeScope(scope, run);
  let series: VerifiedReportInput['series'] = { status: 'absent' };
  if (publication.artifacts.some(a => a.kind === 'series')) {
    try { series = { status: 'available', data: await store.series(runId) as unknown as SimulationSeries }; }
    catch (error) {
      // A series that fails its hash only removes what depends on it; an unreachable source is retried by the caller.
      if (!(error instanceof ArtifactIntegrityError)) throw error;
      series = { status: 'integrity_failed' };
    }
  }
  return { run, scope: normalized, visibility: publication.visibility, artifacts: publication.artifacts.map(a => ({ kind: a.kind, sha256: a.sha256, bytes: a.bytes })), series };
}

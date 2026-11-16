// Shared helpers of the technical-report tests: the pinned Brazilian publication, the US fixture subset and
// derived sources (a run without a series artifact, corrupted bytes, a private publication). Derived sources only
// change what a test needs and keep every other byte and hash of the real artifacts.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { SimulationRun } from '@gaiapus/contracts';
import { LocalPublicationSource, PublicationStore, pinnedBrazilSource, type Artifact, type Catalog, type Index, type PublicationSource } from '../src/modules/simulations/publication-store.js';

export const US_FIXTURE = fileURLToPath(new URL('../../../packages/contracts/fixtures/us-simulation-v2/', import.meta.url));
export const BR_DIR = fileURLToPath(new URL('../public/publications/future-simulation-v1/', import.meta.url));
export const UBERLANDIA_ROTATION = 'sim_fd61ab4118a4e32398a12156';
export const BARREIRAS_SOY = 'sim_9cd555885306ffcd15715546';
export const STORY_MAIZE_2027 = 'sim_deca98ea3d3c46ef31d6b948';
export const SUMNER_WHEAT_2028 = 'sim_058579a503ee56335a086db1';

export const brIndex = JSON.parse(readFileSync(`${BR_DIR}index.json`, 'utf8')) as Index;
export const usIndex = JSON.parse(readFileSync(`${US_FIXTURE}index.json`, 'utf8')) as Index;
export const usCatalog = JSON.parse(readFileSync(`${US_FIXTURE}catalog.json`, 'utf8')) as Catalog;
export const brRun = (id: string) => JSON.parse(readFileSync(`${BR_DIR}runs/${id}/run.json`, 'utf8')) as SimulationRun;
export const usRun = (id: string) => JSON.parse(readFileSync(`${US_FIXTURE}runs/${id}/run.json`, 'utf8')) as SimulationRun;

export const usSource = () => new LocalPublicationSource('us-local', US_FIXTURE);
export const fullStore = () => new PublicationStore([pinnedBrazilSource(), usSource()]);

type Tweaks = {
  /** Change the index before it is served (e.g. drop the series artifact, mark a publication private). */
  index?: (index: Index) => void;
  /** Change artifact bytes after they are read (the store then sees an integrity failure). */
  bytes?: (artifact: Artifact, bytes: Buffer) => Buffer;
  /** Fail reading an artifact as an unreachable source would. */
  fail?: (artifact: Artifact) => boolean;
};
/** A source that serves another source with explicit, test-visible changes. */
export function derivedSource(base: PublicationSource, tweaks: Tweaks, id = `${base.id}-derived`): PublicationSource {
  return {
    id,
    async load() {
      const loaded = await base.load();
      if (!loaded) return null;
      const index = structuredClone(loaded.index);
      tweaks.index?.(index);
      return { index, catalog: loaded.catalog };
    },
    async artifact(artifact: Artifact) {
      if (tweaks.fail?.(artifact)) throw new Error('source down');
      const bytes = await base.artifact(artifact);
      return tweaks.bytes ? tweaks.bytes(artifact, bytes) : bytes;
    },
  };
}
export const flipLastByte = (bytes: Buffer) => Buffer.concat([bytes.subarray(0, bytes.length - 1), Buffer.from([bytes[bytes.length - 1]! ^ 1])]);
/** The US fixture with the series artifact of one run removed from the index: a valid run with yield and no series. */
export const usWithoutSeries = (runId: string) => derivedSource(usSource(), { index: index => { for (const p of index.publications) if (p.run_id === runId) p.artifacts = p.artifacts.filter(a => a.kind !== 'series'); } });

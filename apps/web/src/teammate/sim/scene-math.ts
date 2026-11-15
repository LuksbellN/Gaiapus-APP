// Constants and helpers shared by profile-model and root-model (no imports: breaks the module cycle between them).
/** Profile block depth in metres (true scale, no vertical exaggeration). */
export const PROFILE_DEPTH_M = 1.5;

/** Deterministic PRNG: the same day always draws the same decoration. */
export function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

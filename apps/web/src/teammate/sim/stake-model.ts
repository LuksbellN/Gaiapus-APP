// Facts measured on the supplied model (gaiapus-stake-revG-assembly.glb) and the placement derived from them.
// No three.js import here: the numbers are testable and the 2D view can read them without loading WebGL code.
//
// Inspection of the source file (glTF-Transform 4.5.1, 15 Nov 2026):
//   units metres, Y up, no textures, no animations; 3,085 nodes, 3,000 meshes, 86 materials, 3,056,748 triangles;
//   bounding box min [-0.0335, -0.5820, -0.0345], max [0.2950, 0.0800, 0.2655] (0.328 x 0.662 x 0.300 m, the
//   0.30 m footprint being a "soil line" reference plate at y = -0.074).
// The shipped copy (assets/gaiapus-stake-revG.glb) is produced by apps/web/scripts/optimize-stake-glb.mjs.
import type { LedCode } from './profile-model';

export const STAKE_MODEL = {
  /** Height of the model's own "soil line" plate: the underside of the head case rests on it. */
  soilLineY: -0.074,
  /** Vertical axis of the PVC tube (centre of the "PVC tube" mesh). */
  tubeAxis: { x: 0.145, z: 0.1155 },
  /** Lowest point of the stake tip below the soil line. */
  depthBelowSoilM: 0.508,
  /** Antenna tip above the soil line. */
  heightAboveSoilM: 0.154,
  /** Probe board span below the soil line (model y -0.054 to -0.504). */
  probeBoard: { topDepthM: -0.02, bottomDepthM: 0.43 },
  /** Centre of the light bar (three LED lenses) relative to the placement anchor: x, height above soil, z. */
  lightBar: { x: 0, y: 0.098, z: 0.042 },
} as const;

/**
 * SCALE DECISION: true scale. The soil-profile scene is in metres with no vertical exaggeration (PROFILE_DEPTH_M),
 * and the depth ruler and the 15/40 cm electrode labels only stay truthful if the stake is not enlarged. The model
 * is therefore placed at scale 1 — the head is about 11 cm wide in a 4 m block, small in the default framing.
 * The scene offers a close-up camera preset instead of enlarging the equipment.
 */
export const STAKE_SCALE = 1;

/** Position and uniform scale for the model root so its soil line sits on `anchor` (scene ground at the tube axis). */
export function stakePlacement(anchor: readonly [number, number, number]): { position: [number, number, number]; scale: number } {
  return {
    position: [anchor[0] - STAKE_MODEL.tubeAxis.x * STAKE_SCALE, anchor[1] - STAKE_MODEL.soilLineY * STAKE_SCALE, anchor[2] - STAKE_MODEL.tubeAxis.z * STAKE_SCALE],
    scale: STAKE_SCALE,
  };
}

/** Material names of the three LED lenses in the model, in downlink order: green, yellow, red. */
export const LED_MATERIALS = ['LED light 0', 'LED light 1', 'LED light 2'] as const;
/** The CAD file ships all three lenses emissive. The scene lights only the one the simulation asks for (never a device state). */
export const litLedMaterial = (led: LedCode): (typeof LED_MATERIALS)[number] | null => (led === 0 ? null : LED_MATERIALS[led - 1]);

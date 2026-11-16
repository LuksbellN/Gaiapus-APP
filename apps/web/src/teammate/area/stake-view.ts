// Camera poses and keyboard steps of the stake guide. Pure: no three.js here, so the guide's logic is testable
// and the 3D chunk is only loaded when the model is actually shown.
export const QR_NODE = 'QR_label'; // glTF node "QR label" after the loader replaces the space
export const GUIDE_VIEWS = ['qr', 'whole'] as const;
export type GuideView = (typeof GUIDE_VIEWS)[number];
export type Vec3 = readonly [number, number, number];
export type CameraPose = { position: Vec3; target: Vec3 };
/** Spherical pose around the target (three.js conventions: polar from +Y, azimuth around Y from +Z). */
export type OrbitPose = { azimuth: number; polar: number; distance: number };

export const LIMITS = { minPolar: 0.15, maxPolar: Math.PI - 0.15, minDistance: 0.12, maxDistance: 1.8 } as const;
const STEP = { angle: 0.2, polar: 0.15, zoom: 0.85 } as const;

/** Where the camera stands for each view. `qr` faces the label from the side it is glued on. */
export function viewPose(view: GuideView, qr: { center: Vec3; normal: Vec3 }, whole: { center: Vec3; height: number }): CameraPose {
  if (view === 'qr') {
    const d = 0.26; // metres from the label: the case (about 11 cm) fills the frame
    return { target: qr.center, position: [qr.center[0] + qr.normal[0] * d + 0.02, qr.center[1] + qr.normal[1] * d + 0.07, qr.center[2] + qr.normal[2] * d + 0.09] };
  }
  const d = whole.height * 2.15; // the whole stake, rain gauge to tip, with a margin
  return { target: whole.center, position: [whole.center[0] + d * 0.62, whole.center[1] + whole.height * 0.18, whole.center[2] + d * 0.78] };
}

export function clampPose(p: OrbitPose): OrbitPose {
  return { azimuth: p.azimuth, polar: Math.min(LIMITS.maxPolar, Math.max(LIMITS.minPolar, p.polar)), distance: Math.min(LIMITS.maxDistance, Math.max(LIMITS.minDistance, p.distance)) };
}
/** One keyboard step. Returns null for keys the guide does not handle, so they keep their normal meaning. */
export function rotatePose(p: OrbitPose, key: string): OrbitPose | null {
  switch (key) {
    case 'ArrowRight': return clampPose({ ...p, azimuth: p.azimuth + STEP.angle });
    case 'ArrowLeft': return clampPose({ ...p, azimuth: p.azimuth - STEP.angle });
    case 'ArrowUp': return clampPose({ ...p, polar: p.polar - STEP.polar });
    case 'ArrowDown': return clampPose({ ...p, polar: p.polar + STEP.polar });
    case '+': case '=': return clampPose({ ...p, distance: p.distance * STEP.zoom });
    case '-': case '_': return clampPose({ ...p, distance: p.distance / STEP.zoom });
    default: return null;
  }
}

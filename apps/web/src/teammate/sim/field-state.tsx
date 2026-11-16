// Illustrative field state and its 2D alternative. Kept out of Field3D.tsx so the simulator page does not pull
// three.js before the 3D scene is really mounted (this file imports plain-data plant plans only).
import { Component, useId, useMemo, type ReactNode } from 'react';
import { usePrefs } from '../prefs';
import { brachiariaPlan } from './plants/grass';
import { maizePlan } from './plants/maize';
import { Plant2D } from './plants/Plant2D';
import { soyPlan } from './plants/soy';
import { sceneTheme, soilColor } from './scene-theme';
import { resolveFieldVisual, REPRESENTATIVE, type CropStage, type PhasePosition } from './visual-state';

export type FieldState = {
  land: string; stage: string;
  /** 0–1 inside the phase, already conservative (see `phaseProgress`): used by the root illustration of the profile view. */
  progress: number;
  awf: number; rain: number; covered: boolean;
  /** Presentation-only metadata: where the day sits in its phase run and whether that position is proven by the series. */
  phase?: PhasePosition;
};
const DEV: Record<string, [number, number]> = { establishment: [0.03, 0.18], vegetative: [0.18, 0.75], reproductive: [0.75, 1], maturation: [1, 1], off_season_cover: [0.45, 0.6], off_season_bare: [0, 0] };
/** Legacy single "development" scalar, still used to size the root illustration of the profile view. */
export const development = (s: FieldState) => { const [a, b] = DEV[s.stage] ?? [0, 0]; return a + (b - a) * s.progress; };

/**
 * Progress inside the phase for the illustrations. Only a run with both borders in the original series gives a
 * position; otherwise the fixed representative value of the phase is used, so a six-day window never "completes"
 * a phase by being normalised.
 */
export function phaseProgress(stage: string, position: PhasePosition | undefined): number {
  if (position?.source === 'full-phase' && position.fraction != null && Number.isFinite(position.fraction)) return Math.min(1, Math.max(0, position.fraction));
  return REPRESENTATIVE[stage as CropStage] ?? 0.5;
}

/** What the caption must add for a day: the plant is in a fixed pose, or the scene has no plant for this crop. */
export function fieldNotes(state: FieldState): { fixedPose: boolean; noPlant: boolean } {
  const v = resolveFieldVisual(state.land, state.stage, state.phase);
  return { fixedPose: !!v.crop && v.representative, noPlant: !!(v.noPlantFor || v.unknownLand) };
}

/** three.js r170 needs WebGL 2: a WebGL 1-only browser gets the 2D view instead of a broken canvas. */
export function webglAvailable() { try { if (new URLSearchParams(location.hash.split('?')[1] ?? '').has('semwebgl')) return false; const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch { return false; } }

/** Renderer failures (context creation, shader, lost context rethrown) fall back to the 2D view instead of a blank stage. */
export class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* the fallback carries the same information; nothing else to report */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const GROUND = 205, PX_PER_M = 82, COUNT = 16, STEP = 36;
/** 2D alternative when WebGL 2 is not available: same land cover, stage and organs, drawn as a side view. */
export function Field2D({ state, label }: { state: FieldState; label: string }) {
  const scene = sceneTheme(usePrefs((p) => p.theme)); const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const source = state.phase?.source, fraction = state.phase?.fraction;
  const visual = useMemo(() => resolveFieldVisual(state.land, state.stage, state.phase), [state.land, state.stage, source, fraction]); // eslint-disable-line react-hooks/exhaustive-deps
  const cropKey = visual.crop?.key, coverKey = visual.cover?.key;
  const crops = useMemo(() => { const c = visual.crop; return c ? [0, 1].map((v) => (c.family === 'maize' ? maizePlan(c.pose, v, 'far') : soyPlan(c.pose, v, 'far'))) : []; }, [cropKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const cover = useMemo(() => (visual.cover ? brachiariaPlan(visual.cover.pose, 0, 'far') : null), [coverKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const soil = soilColor(scene, state.awf, state.covered && state.land === 'bare');
  return <svg viewBox="0 0 600 260" role="img" aria-label={label} data-testid="field2d" data-crop={visual.crop?.family ?? ''} data-pose={visual.crop?.key ?? ''} data-cover={visual.cover?.pose ?? ''} data-representative={visual.representative} style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMax meet">
    <defs>
      {crops.map((plan, v) => <g key={v} id={`${id}c${v}`}><Plant2D plan={plan} scale={PX_PER_M} /></g>)}
      {cover && <g id={`${id}g`}><Plant2D plan={cover} scale={PX_PER_M} /></g>}
    </defs>
    {cover && Array.from({ length: COUNT }, (_, i) => <use key={i} href={`#${id}g`} x={48 + i * STEP} y={GROUND} />)}
    {cover && !visual.crop && Array.from({ length: COUNT }, (_, i) => <use key={`r${i}`} href={`#${id}g`} x={30 + i * STEP} y={GROUND} transform={`translate(${2 * (30 + i * STEP)} 0) scale(-1 1)`} />)}
    {crops.length > 0 && Array.from({ length: COUNT }, (_, i) => <use key={i} href={`#${id}c${i % crops.length}`} x={30 + i * STEP} y={GROUND} />)}
    <rect x="0" y={GROUND} width="600" height={260 - GROUND} fill={soil} />
    <rect x="0" y={GROUND} width="600" height="3" fill={soil} style={{ filter: 'brightness(0.82)' }} />
  </svg>;
}

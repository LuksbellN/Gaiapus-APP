// Colours and lights of the illustrative scenes per theme (plain data: imported by the 3D scene and by the 2D fallback).
// The sky gradient itself is CSS (`--scene-sky-top/bottom` behind a transparent canvas), so switching the theme never
// rebuilds the renderer. Soil and plant colours are scene materials: they represent an illustration, not UI states,
// and the soil shade follows the MODELLED water reserve (the number stays in the caption and in the panel).
import type { Theme } from '../prefs';

export type SceneTheme = {
  /** Soil top, dry → wet (interpolated with the modelled available-water fraction). */
  soilDry: string; soilWet: string;
  /** Soil with a living cover recorded on bare-stage rows keeps a slightly different dry tone (as before). */
  soilCoveredDry: string;
  /** Side walls of the soil slab and the furrows between rows, as a darkening factor of the top colour. */
  sideShade: number; furrowShade: number;
  ambient: number;
  sun: { color: string; intensity: number; position: [number, number, number] };
  hemisphere: { sky: string; ground: string; intensity: number };
  /** Soft contact shade under the plants (one shared decal per row, no shadow map). */
  contact: { color: string; opacity: number };
};

export const SCENE_THEME: Record<Theme, SceneTheme> = {
  // Diffuse daylight: sky fill from above, warm low-contrast sun, moderate contact shade.
  light: {
    soilDry: '#B4936A', soilWet: '#5B4331', soilCoveredDry: '#B9A57C', sideShade: 0.72, furrowShade: 0.84,
    ambient: 0.75, sun: { color: '#FFF4E0', intensity: 2.1, position: [9, 15, 7] }, hemisphere: { sky: '#DDEEF3', ground: '#8C7657', intensity: 1.15 },
    contact: { color: '#3B2C1E', opacity: 0.2 },
  },
  // Night panel: organs must stay readable without turning the plants into emissive objects.
  dark: {
    soilDry: '#A98A63', soilWet: '#4A3A2A', soilCoveredDry: '#B3A27A', sideShade: 0.62, furrowShade: 0.8,
    ambient: 0.95, sun: { color: '#FFFFFF', intensity: 1.75, position: [8, 14, 6] }, hemisphere: { sky: '#BCD9E6', ground: '#3B2F22', intensity: 0.7 },
    contact: { color: '#1A120B', opacity: 0.28 },
  },
};
export const sceneTheme = (theme: Theme): SceneTheme => SCENE_THEME[theme];

/** Soil colour for a modelled reserve (0–1). An invalid value is treated as unknown and drawn mid-way, never as dry. */
export function soilColor(theme: SceneTheme, awf: number, coveredFallow = false): string {
  const k = Number.isFinite(awf) ? Math.min(1, Math.max(0, awf)) : 0.5; const a = coveredFallow ? theme.soilCoveredDry : theme.soilDry, b = theme.soilWet;
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
}

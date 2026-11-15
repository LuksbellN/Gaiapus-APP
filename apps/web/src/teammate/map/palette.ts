// Cartographic colours per theme, in one typed place. MapLibre paints cannot read CSS variables, so both maps
// (Explore and "Minha área") resolve their layers from here and repaint in place when the theme changes — the camera,
// the selection, the loaded data and the image stay as they are. The DOM legend reads the same object.
// Map roles are separate from button colours on purpose: a brand change must not change what a fill means.
import type { Theme } from '../prefs';

export type Fill = { color: string; opacity: number };
export type MapPalette = {
  /** Page area behind the globe. */
  space: string;
  ocean: string; land: string; landLine: string;
  /** Country with data, no state selected / the same country once a state is selected (context). */
  brazil: string; brazilContext: string;
  stateLine: string; munLine: string;
  /** Municipalities with an analysis. */
  covered: Fill;
  /** Selected country/state and selected municipality. */
  selectedFill: Fill; munSelectedFill: Fill;
  selection: string; munSelection: string;
  label: string; labelHalo: string;
  /** "You are here" dot and its ring. */
  here: string; hereRing: string;
  /** Outline of the demonstration field over the satellite image. */
  fieldLine: string; fieldLineCasing: string;
  /** "Minha área": plots, selected plot and the polygon being drawn. */
  plot: Fill; plotLine: string; plotSelected: string; draft: string;
};

export const MAP_PALETTE: Record<Theme, MapPalette> = {
  dark: {
    space: '#060D0A', ocean: '#0A1A21', land: '#1A2C24', landLine: '#3D5648', brazil: '#28503A', brazilContext: '#1D3329', stateLine: '#7D9A89', munLine: '#4F6A5B',
    covered: { color: '#79BDD8', opacity: 0.45 }, selectedFill: { color: '#87C98F', opacity: 0.2 }, munSelectedFill: { color: '#87C98F', opacity: 0.3 },
    selection: '#87C98F', munSelection: '#EAF2EB', label: '#EAF2EB', labelHalo: '#0A1A21', here: '#79BDD8', hereRing: '#EAF2EB', fieldLine: '#E6B85C', fieldLineCasing: '#0A1A21',
    plot: { color: '#87C98F', opacity: 0.22 }, plotLine: '#87C98F', plotSelected: '#EAF2EB', draft: '#F2C14E',
  },
  // Daytime map: opaque fills (no alpha stacking over light land), contours carry the information.
  light: {
    space: '#F2F6F3', ocean: '#DCEBF0', land: '#E8EDDF', landLine: '#657A68', brazil: '#D3E1C9', brazilContext: '#E8EDDF', stateLine: '#657A68', munLine: '#516B5B',
    covered: { color: '#B7D6E2', opacity: 1 }, selectedFill: { color: '#B9D6C1', opacity: 1 }, munSelectedFill: { color: '#B9D6C1', opacity: 1 },
    selection: '#176B4B', munSelection: '#163C2D', label: '#163C2D', labelHalo: '#FFFFFF', here: '#146B8A', hereRing: '#FFFFFF', fieldLine: '#805700', fieldLineCasing: '#FFFFFF',
    plot: { color: '#176B4B', opacity: 0.2 }, plotLine: '#176B4B', plotSelected: '#163C2D', draft: '#805700',
  },
};
export const mapPalette = (theme: Theme): MapPalette => MAP_PALETTE[theme];

/** CSS colour of a fill as it looks on the map (for legend swatches). */
export function fillCss(f: Fill): string {
  if (f.opacity >= 1) return f.color;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(f.color.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${f.opacity})`;
}

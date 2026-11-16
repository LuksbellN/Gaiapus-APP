import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Field2D, fieldNotes, phaseProgress, SceneBoundary, type FieldState } from './field-state';
import { profileLayers } from './profile-model';
import { LEGACY_SCENE_CAPS, toSceneState, type SceneDailyRow } from './scene-adapter';
import { REPRESENTATIVE, type PhasePosition } from './visual-state';

const full = (fraction: number): PhasePosition => ({ source: 'full-phase', fraction, day: 1, length: 30 });
const windowOnly: PhasePosition = { source: 'window-only', fraction: null, day: null, length: null };
const state = (land: string, stage: string, phase: PhasePosition = full(0.5)): FieldState => ({ land, stage, progress: phaseProgress(stage, phase), awf: 0.5, rain: 0, covered: true, phase });

describe('phaseProgress', () => {
  it('uses the proven position and nothing else', () => {
    expect(phaseProgress('vegetative', full(0.25))).toBe(0.25);
    expect(phaseProgress('vegetative', windowOnly)).toBe(REPRESENTATIVE.vegetative);
    expect(phaseProgress('vegetative', undefined)).toBe(REPRESENTATIVE.vegetative);
    expect(phaseProgress('reproductive', { source: 'full-phase', fraction: NaN, day: 1, length: 2 })).toBe(REPRESENTATIVE.reproductive);
  });
});

describe('fieldNotes', () => {
  it('says when the plant is in a fixed pose and when the scene has no plant for the crop', () => {
    expect(fieldNotes(state('soy', 'vegetative'))).toEqual({ fixedPose: false, noPlant: false });
    expect(fieldNotes(state('soy', 'vegetative', windowOnly))).toEqual({ fixedPose: true, noPlant: false });
    expect(fieldNotes(state('wheat', 'vegetative'))).toEqual({ fixedPose: false, noPlant: true });
    expect(fieldNotes(state('bare', 'off_season_bare', windowOnly))).toEqual({ fixedPose: false, noPlant: false });
  });
});

describe('Field2D', () => {
  it('draws soybean and maize as different plants, with the pose of the day and no text on the soil', () => {
    const { rerender, container } = render(<Field2D state={state('soy', 'reproductive', full(0.9))} label="campo" />);
    const svg = screen.getByTestId('field2d'); const soy = svg.querySelector('defs')!.innerHTML;
    expect(svg.getAttribute('data-crop')).toBe('soy'); expect(svg.getAttribute('data-pose')).toMatch(/^soy:reproductive:/);
    expect(container.querySelectorAll('use').length).toBe(16); expect(container.querySelector('text')).toBeNull();
    rerender(<Field2D state={state('maize2', 'reproductive', full(0.9))} label="campo" />);
    expect(svg.getAttribute('data-crop')).toBe('maize'); expect(svg.querySelector('defs')!.innerHTML).not.toBe(soy);
  });
  it('keeps the living cover apart from the crop and draws nothing on bare soil or for an unknown crop', () => {
    const { rerender, container } = render(<Field2D state={state('maize2+brachiaria', 'vegetative')} label="campo" />);
    expect(screen.getByTestId('field2d').getAttribute('data-cover')).toBe('understory'); expect(container.querySelectorAll('use').length).toBe(32);
    rerender(<Field2D state={state('brachiaria', 'off_season_cover')} label="campo" />);
    expect(screen.getByTestId('field2d').getAttribute('data-crop')).toBe(''); expect(screen.getByTestId('field2d').getAttribute('data-cover')).toBe('living');
    for (const s of [state('bare', 'off_season_bare'), state('cotton', 'vegetative'), state('wheat', 'vegetative')]) { rerender(<Field2D state={s} label="campo" />); expect(container.querySelectorAll('use').length).toBe(0); }
  });
});

describe('SceneBoundary', () => {
  it('shows the fallback when the 3D scene throws', () => {
    const Broken = () => { throw new Error('Error creating WebGL context'); };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<SceneBoundary fallback={<p>vista 2D</p>}><Broken /></SceneBoundary>);
    expect(screen.getByText('vista 2D')).toBeTruthy();
    spy.mockRestore();
  });
});

describe('profile view reads the same plant', () => {
  const row = (land: string, phase: string, ks: number): SceneDailyRow => ({ date: '2027-01-10', land_cover: land, phase_code: phase, precipitation_mm: 0, irrigation_net_mm: null, et0_mm: 4, etc_mm: 4, eta_mm: 3, storage_mm: 30, capacity_mm: 55, available_water_fraction: 0.55, runoff_mm: null, drainage_mm: 0, stress_coefficient: ks, root_depth_m: null });
  it('gives the profile the organ-level plant and cover of the row, and stress only changes the indicator colour', () => {
    const calm = profileLayers(toSceneState(row('maize2+brachiaria', 'reproductive', 1), LEGACY_SCENE_CAPS), 0.9), dry = profileLayers(toSceneState(row('maize2+brachiaria', 'reproductive', 0.3), LEGACY_SCENE_CAPS), 0.9);
    expect(calm.plant?.family).toBe('maize'); expect(calm.cover?.pose).toBe('understory');
    expect(dry.plant).toEqual(calm.plant); // the plant does not change with modelled stress
    expect(dry.leafColor).not.toBe(calm.leafColor);
    expect(profileLayers(toSceneState(row('bare', 'off_season_bare', 1), LEGACY_SCENE_CAPS), 0.5).plant).toBeNull();
    expect(profileLayers(toSceneState(row('rice', 'vegetative', 1), LEGACY_SCENE_CAPS), 0.5).plant).toBeNull();
  });
});

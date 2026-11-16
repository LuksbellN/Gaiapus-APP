// Demonstration board: every plant archetype of the catalogue, pose by pose, as plain data (no three.js).
// It is a study sheet for reviewing morphology — NOT a capability. A crop being here does not give it a daily series,
// a forecast or a place in the simulator; `integrated` only says which archetypes the product scene already draws
// for the rotation that has data. Coffee has no annual cycle here: age and fruit phase are separate columns.
import { annualPose, type CoffeePose, type CoverPose, type CropStage } from '../visual-state';
import { beanPlan, BEAN_HEIGHT_M } from './bean';
import { COFFEE_HEIGHT_M, COFFEE_PROFILE, coffeePlan } from './coffee';
import { brachiariaPlan, residuePlan } from './grass';
import { MAIZE_HEIGHT_M, maizePlan } from './maize';
import type { Detail, PlantPlan } from './plan';
import { RICE_HEIGHT_M, ricePlan } from './rice';
import { SOY_HEIGHT_M, soyPlan } from './soy';
import { WHEAT_HEIGHT_M, wheatPlan } from './wheat';

export type BoardStage = 'establishment' | 'vegetative' | 'reproductiveEarly' | 'reproductiveLate' | 'maturationMid' | 'maturationEnd'
  | 'coffeeSeedling' | 'coffeeAdult' | 'coffeeFlowering' | 'coffeeGreen' | 'coffeeRipe' | 'coffeeHarvested'
  | 'coverYoung' | 'coverUnderstory' | 'coverLiving' | 'intercrop' | 'residue';
export type BoardRowId = 'soy' | 'maize' | 'cover' | 'bean' | 'rice' | 'wheat' | 'coffee_arabica' | 'coffee_conilon';
export type BoardCard = { id: string; stage: BoardStage; plan: (detail: Detail) => PlantPlan };
export type BoardRow = {
  id: BoardRowId;
  /** Drawn by the product scene for the rotation with data (soybean, maize, brachiaria); the others are board-only. */
  integrated: boolean;
  /** Common frame height of the row in metres: every card of a row uses the same scale, so growth is comparable. */
  heightM: number;
  cards: BoardCard[];
};

/** The six poses shown for an annual: both ends of the reproductive phase and of maturation, since they differ by organs. */
export const ANNUAL_POSES: readonly [BoardStage, CropStage, number][] = [
  ['establishment', 'establishment', 0.6], ['vegetative', 'vegetative', 0.85], ['reproductiveEarly', 'reproductive', 0.25],
  ['reproductiveLate', 'reproductive', 0.9], ['maturationMid', 'maturation', 0.45], ['maturationEnd', 'maturation', 1],
];
type AnnualBuilder = (pose: ReturnType<typeof annualPose>, variant: number, detail: Detail) => PlantPlan;
const annual = (id: BoardRowId, build: AnnualBuilder): BoardCard[] => ANNUAL_POSES.map(([stage, phase, fraction]) => ({ id: `${id}-${stage}`, stage, plan: (detail) => build(annualPose(phase, fraction), 0, detail) }));

export const COFFEE_POSES: readonly [BoardStage, CoffeePose][] = [
  ['coffeeSeedling', { age: 'seedling', fruit: 'none' }], ['coffeeAdult', { age: 'adult', fruit: 'none' }], ['coffeeFlowering', { age: 'adult', fruit: 'flowering' }],
  ['coffeeGreen', { age: 'adult', fruit: 'green' }], ['coffeeRipe', { age: 'adult', fruit: 'ripe' }], ['coffeeHarvested', { age: 'adult', fruit: 'harvested' }],
];
const coffee = (species: 'coffee_arabica' | 'coffee_conilon'): BoardCard[] => COFFEE_POSES.map(([stage, pose]) => ({ id: `${species}-${stage}`, stage, plan: (detail) => coffeePlan(species, pose, 0, detail) }));
const COVER: readonly [BoardStage, CoverPose][] = [['coverYoung', 'young'], ['coverUnderstory', 'understory'], ['coverLiving', 'living']];

/** Maize with its living understory, as the consortium rows of the series draw it (cover between the rows). */
const intercrop = (detail: Detail): PlantPlan => [
  ...maizePlan(annualPose('vegetative', 0.85), 0, detail),
  ...brachiariaPlan('understory', 1, detail).map((p) => shift(p, 0.4)),
];
function shift<T extends PlantPlan[number]>(p: T, dx: number): T {
  const m = (v: readonly [number, number, number]): [number, number, number] => [v[0] + dx, v[1], v[2]];
  if (p.kind === 'tube') return { ...p, from: m(p.from), to: m(p.to) };
  return { ...p, at: m(p.at) };
}

export const BOARD: readonly BoardRow[] = [
  { id: 'soy', integrated: true, heightM: SOY_HEIGHT_M * 1.15, cards: annual('soy', soyPlan) },
  { id: 'maize', integrated: true, heightM: MAIZE_HEIGHT_M * 1.2, cards: annual('maize', maizePlan) },
  { id: 'cover', integrated: true, heightM: 1.1, cards: [
    ...COVER.map(([stage, pose]): BoardCard => ({ id: `cover-${stage}`, stage, plan: (detail) => brachiariaPlan(pose, 0, detail) })),
    { id: 'cover-intercrop', stage: 'intercrop', plan: intercrop },
    // Straw exists on this board only: the published series has no residue signal, so the product scene never draws it.
    { id: 'cover-residue', stage: 'residue', plan: (detail) => residuePlan(0, detail) },
  ] },
  { id: 'bean', integrated: false, heightM: BEAN_HEIGHT_M * 1.35, cards: annual('bean', beanPlan) },
  { id: 'rice', integrated: false, heightM: RICE_HEIGHT_M * 1.2, cards: annual('rice', ricePlan) },
  { id: 'wheat', integrated: false, heightM: WHEAT_HEIGHT_M * 1.25, cards: annual('wheat', (pose, variant, detail) => wheatPlan(pose, variant, detail)) },
  { id: 'coffee_arabica', integrated: false, heightM: COFFEE_HEIGHT_M * 1.12, cards: coffee('coffee_arabica') },
  { id: 'coffee_conilon', integrated: false, heightM: COFFEE_HEIGHT_M * 1.12, cards: coffee('coffee_conilon') },
];
export const BOARD_COFFEE_STEMS = COFFEE_PROFILE;

// Painter of the demonstration board (three.js, lazy chunk). ONE WebGL renderer draws each plant with the same
// mesher and material as the simulator scene and copies the frame into the card's 2D canvas — dozens of cards never
// mean dozens of WebGL contexts. Nothing here is interactive or animated: a card is repainted only when the view,
// the theme or the size changes.
import * as THREE from 'three';
import type { Theme } from '../prefs';
import { meshPlan, plantMaterial, triangles } from './plants/mesh';
import { bounds, REPRODUCTIVE, type Detail, type Organ, type PlantPlan, type V3 } from './plants/plan';
import { sceneTheme, soilColor } from './scene-theme';

export type BoardView = 'oblique' | 'front' | 'silhouette' | 'detail';
export type BoardJob = { canvas: HTMLCanvasElement; plan: (detail: Detail) => PlantPlan; heightM: number };
export type BoardCount = { detail: number; field: number; far: number };

const FOV = 26;
type Box = { min: V3; max: V3 };
const mid = (b: Box, i: number) => (b.min[i] + b.max[i]) / 2;
/** Prefers an organ at about mid height of its group and away from the axis (where it is not hidden by the stem). */
const score = (p: Box, all: Box) => Math.abs(mid(p, 1) - mid(all, 1)) / Math.max(0.05, all.max[1] - all.min[1]) - Math.hypot(mid(p, 0), mid(p, 2)) * 0.6;
const FOCUS: Organ[][] = [['ear', 'silk'], ['pod'], ['fruit'], ['flower'], ['panicle', 'grain'], ['spike', 'awn'], [...REPRODUCTIVE], ['cotyledon', 'leaf', 'leaflet']];
let renderer: THREE.WebGLRenderer | null = null;

/** Paints every job and returns the triangle count of each plan at the three levels (same order as `jobs`). */
export function paintBoard(jobs: readonly BoardJob[], view: BoardView, theme: Theme, ink: string): BoardCount[] {
  if (!renderer) { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); renderer.setClearColor(0x000000, 0); }
  const gl = renderer; const look = sceneTheme(theme); const material = plantMaterial(); const flat = new THREE.MeshBasicMaterial({ color: ink, side: THREE.DoubleSide });
  const soil = new THREE.MeshStandardMaterial({ color: soilColor(look, 0.45), roughness: 1 });
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, look.ambient), new THREE.HemisphereLight(look.hemisphere.sky, look.hemisphere.ground, look.hemisphere.intensity));
  const sun = new THREE.DirectionalLight(look.sun.color, look.sun.intensity); sun.position.set(...look.sun.position); scene.add(sun);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.02, 60); const counts: BoardCount[] = [];
  try {
    for (const job of jobs) {
      const w = job.canvas.width, h = job.canvas.height; if (!w || !h) { counts.push({ detail: 0, field: 0, far: 0 }); continue; }
      const plan = job.plan('detail'); const geometry = meshPlan(plan, 'detail');
      const count = (detail: Detail) => { const g = meshPlan(job.plan(detail), detail); const n = triangles(g); g.dispose(); return n; };
      counts.push({ detail: triangles(geometry), field: count('field'), far: count('far') });
      const plant = new THREE.Mesh(geometry, view === 'silhouette' ? flat : material);
      const ground = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.16, job.heightM * 0.24), Math.max(0.17, job.heightM * 0.25), 0.03, 40), soil); ground.position.y = -0.015; ground.visible = view !== 'silhouette';
      scene.add(plant, ground);
      // Row frame: every card of a row shares the same height, so the sequence reads at a common scale.
      // Detail: the camera goes to the reproductive organs when there are any, otherwise to the whole plant.
      const half = Math.tan(THREE.MathUtils.degToRad(FOV / 2)); const aspect = w / h; let target = new THREE.Vector3(0, job.heightM * 0.5, 0), distance = (job.heightM * 0.55) / half / Math.min(1, aspect * 1.15);
      if (view === 'detail') {
        // The organ that tells the stage apart comes first (ear before tassel, pods before flowers).
        const organs = FOCUS.find((group) => plan.some((p) => group.includes(p.organ))); const all = organs ? bounds(plan, organs) : bounds(plan);
        // Many small organs spread over the plant (pods, fruits): go to one of them, a little off the axis, not to their middle.
        const pick = organs && all ? plan.filter((p) => organs.includes(p.organ)).map((p) => bounds([p])!).sort((p, q) => score(p, all) - score(q, all))[0] : null;
        const b = pick && all && Math.max(all.max[0] - all.min[0], all.max[1] - all.min[1]) > Math.min(job.heightM * 0.42, 0.55) ? { min: pick.min.map((v) => v - 0.12) as unknown as V3, max: pick.max.map((v) => v + 0.12) as unknown as V3 } : all;
        if (b) { const size = Math.min(job.heightM * 0.42, 0.55, Math.max(0.1, b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2])); target = new THREE.Vector3((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2); distance = Math.min(distance, (size * 0.68) / half / Math.min(1, aspect)); }
      }
      // In detail the camera stands on the side of the plant where the organ is, so the stalk never hides it.
      const facing = view === 'detail' && Math.hypot(target.x, target.z) > 0.02 ? Math.atan2(target.x, target.z) + 0.4 : 0.62;
      const azimuth = view === 'detail' ? facing : view === 'oblique' ? 0.62 : 0, elevation = view === 'oblique' ? 0.3 : view === 'detail' ? 0.22 : 0.05;
      camera.aspect = aspect; camera.position.set(target.x + Math.sin(azimuth) * Math.cos(elevation) * distance, target.y + Math.sin(elevation) * distance, target.z + Math.cos(azimuth) * Math.cos(elevation) * distance);
      camera.lookAt(target); camera.updateProjectionMatrix();
      gl.setPixelRatio(1); gl.setSize(w, h, false); gl.render(scene, camera);
      const ctx = job.canvas.getContext('2d'); if (ctx) { ctx.clearRect(0, 0, w, h); ctx.drawImage(gl.domElement, 0, 0, w, h); }
      scene.remove(plant, ground); geometry.dispose(); ground.geometry.dispose();
    }
  } finally { material.dispose(); flat.dispose(); soil.dispose(); }
  return counts;
}

/** Frees the shared renderer when the board leaves the screen. */
export function disposeBoard() { renderer?.dispose(); renderer?.forceContextLoss(); renderer = null; }

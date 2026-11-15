// Illustrative 3D field (React Three Fiber, lazy chunk). Composition only: camera, controls, soil and instanced plants.
// WHAT is drawn comes from visual-state.ts (real land cover + real stage + proven position inside the phase);
// HOW a plant looks comes from the organ plans in ./plants. Nothing here reads a yield or infers plant health from water.
//
// Rendering budget: each plant variant is ONE merged, vertex-coloured geometry drawn as ONE instanced batch.
// Most of the field uses the light "field" level (phones: "far"); a small block at the front uses the "detail" level,
// and the "see the plants closely" preset frames that block — so pods, ears and flowers can be checked without
// paying their triangles 540 times. Instance transforms never change: stepping the day only swaps geometries (cached).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ZoomIn, ZoomOut } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useI18n } from '../i18n';
import { usePrefs } from '../prefs';
import { useMedia } from '../ui';
import type { FieldState } from './field-state';
import { brachiariaPlan } from './plants/grass';
import { MAIZE_HEIGHT_M, maizePlan } from './plants/maize';
import { GeometryCache, meshPlan, plantMaterial } from './plants/mesh';
import { bounds, type Detail } from './plants/plan';
import { SOY_HEIGHT_M, soyPlan } from './plants/soy';
import { mulberry32 } from './scene-math';
import { sceneTheme, soilColor, type SceneTheme } from './scene-theme';
import { resolveFieldVisual, type FieldVisual } from './visual-state';

const ROWS = 18, COLS = 30, DX = 0.62, DZ = 0.8, VARIANTS = 3;
const WIDTH = COLS * DX + 1.2, DEPTH = ROWS * DZ + 1.2;
/** Block of plants drawn at the detail level (front rows, right of the centre: the side the camera starts on). */
const NEAR = { rows: [ROWS - 2, ROWS - 1], cols: [16, 22] } as const;
const NEAR_CENTRE = new THREE.Vector3(((NEAR.cols[0] + NEAR.cols[1]) / 2 - (COLS - 1) / 2) * DX, 0, ((NEAR.rows[0] + NEAR.rows[1]) / 2 - (ROWS - 1) / 2) * DZ);
/** One drawn soybean stands for a clump of the row (rows here are 0.8 m apart, wider than a real crop): it is drawn a
 *  little larger so the rows close as the canopy grows. An illustrative density, not a plant population. */
const SOY_CLUMP = 1.22;
type Slot = { x: number; z: number; s: number; rot: number; variant: number; near: boolean };
/** Deterministic layout: the seed fixes position, size, rotation and variant of every plant, for every day and theme. */
function layout(seed: number): Slot[] {
  const r = mulberry32(seed);
  return Array.from({ length: ROWS * COLS }, (_, i) => {
    const row = Math.floor(i / COLS), col = i % COLS; const dx = (r() - 0.5) * 0.12, dz = (r() - 0.5) * 0.1, s = 0.9 + r() * 0.2, rot = r() * Math.PI * 2;
    return { x: (col - (COLS - 1) / 2) * DX + dx, z: (row - (ROWS - 1) / 2) * DZ + dz, s, rot, variant: Math.floor(r() * VARIANTS) % VARIANTS, near: row >= NEAR.rows[0] && row <= NEAR.rows[1] && col >= NEAR.cols[0] && col <= NEAR.cols[1] };
  });
}

type Population = 'crop' | 'coverBetween' | 'coverOnRow';
type Batch = { mesh: THREE.InstancedMesh; population: Population; variant: number; near: boolean };
const EMPTY = new THREE.BufferGeometry();

function Plants({ visual, seed, far }: { visual: FieldVisual; seed: number; far: boolean }) {
  const { invalidate } = useThree(); const group = useRef<THREE.Group>(null); const shade = useRef<THREE.InstancedMesh>(null);
  const cache = useMemo(() => new GeometryCache(72), []); const material = useMemo(plantMaterial, []);
  const slots = useMemo(() => layout(seed), [seed]);
  // Fixed instanced batches: one per population × variant × level. They are created once per seed.
  const batches = useMemo(() => {
    const out: Batch[] = []; const m = new THREE.Object3D();
    for (const population of ['crop', 'coverBetween', 'coverOnRow'] as const) for (const near of [false, true]) for (let variant = 0; variant < VARIANTS; variant++) {
      // The cover uses the next variant of the same slot so a tussock never mirrors the maize plant beside it.
      const mine = slots.filter((s) => s.near === near && (population === 'crop' ? s.variant : (s.variant + 1) % VARIANTS) === variant);
      if (!mine.length) continue;
      const mesh = new THREE.InstancedMesh(EMPTY, material, mine.length); mesh.frustumCulled = false; mesh.visible = false;
      mine.forEach((s, i) => { const between = population === 'coverBetween'; m.position.set(s.x + (between ? DX / 2 : 0), 0, s.z + (between ? DZ / 2 : 0)); m.rotation.set(0, s.rot + (population === 'crop' ? 0 : 1.7), 0); m.scale.setScalar(s.s); m.updateMatrix(); mesh.setMatrixAt(i, m.matrix); });
      mesh.instanceMatrix.needsUpdate = true; out.push({ mesh, population, variant, near });
    }
    return out;
  }, [slots, material]);
  useLayoutEffect(() => { const g = group.current!; batches.forEach((b) => g.add(b.mesh)); return () => { batches.forEach((b) => { g.remove(b.mesh); b.mesh.dispose(); }); }; }, [batches]);
  useEffect(() => () => { cache.dispose(); material.dispose(); }, [cache, material]);

  const cropKey = visual.crop?.key ?? null, coverKey = visual.cover?.key ?? null, coverAlone = !visual.crop && !!visual.cover;
  useLayoutEffect(() => {
    const crop = visual.crop, cover = visual.cover; const used = new Set<string>(); const picks: [Batch, string | null, (() => THREE.BufferGeometry) | null][] = [];
    for (const b of batches) {
      const detail: Detail = b.near ? 'detail' : far ? 'far' : 'field';
      if (b.population === 'crop' && crop) { const key = `${crop.key}:${b.variant}:${detail}`; used.add(key); picks.push([b, key, () => (crop.family === 'maize' ? meshPlan(maizePlan(crop.pose, b.variant, detail), detail) : meshPlan(soyPlan(crop.pose, b.variant, detail), detail).scale(SOY_CLUMP, SOY_CLUMP, SOY_CLUMP))]); }
      // Cover alone closes the ground (on the rows and between them); with a crop it stays between the rows.
      else if (cover && (b.population === 'coverBetween' || (b.population === 'coverOnRow' && coverAlone))) { const key = `${cover.key}:${b.variant}:${detail}`; used.add(key); picks.push([b, key, () => meshPlan(brachiariaPlan(cover.pose, b.variant, detail), detail)]); }
      else picks.push([b, null, null]);
    }
    for (const [b, key, build] of picks) { if (key && build) { b.mesh.geometry = cache.get(key, build, used); b.mesh.visible = true; } else { b.mesh.geometry = EMPTY; b.mesh.visible = false; } }
    invalidate();
  }, [batches, cache, cropKey, coverKey, coverAlone, far, invalidate]); // eslint-disable-line react-hooks/exhaustive-deps -- the pose keys identify the visual state

  // Soft contact shade under each crop plant: one instanced disc sized by the canopy, no shadow map.
  const canopy = useMemo(() => { const c = visual.crop; if (!c) return 0; const b = bounds(c.family === 'maize' ? maizePlan(c.pose, 0, 'far') : soyPlan(c.pose, 0, 'far')); return b ? Math.max(0.08, Math.min(0.55, Math.max(b.max[0], -b.min[0], b.max[2], -b.min[2]) * (c.family === 'maize' ? 1.15 : 1.15 * SOY_CLUMP))) : 0; }, [cropKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // The disc fades to nothing at its rim (per-vertex alpha): a soft shade, not a dark plate on the soil.
  const disc = useMemo(() => { const g = new THREE.CircleGeometry(Math.max(canopy, 0.01), 14).rotateX(-Math.PI / 2); const n = g.getAttribute('position').count; const rgba = new Float32Array(n * 4); for (let i = 0; i < n; i++) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = 1; rgba[i * 4 + 3] = i === 0 ? 1 : 0; } g.setAttribute('color', new THREE.BufferAttribute(rgba, 4)); return g; }, [canopy]);
  useEffect(() => () => disc.dispose(), [disc]);
  useLayoutEffect(() => { const m = new THREE.Object3D(); slots.forEach((s, i) => { m.position.set(s.x, 0.012, s.z); m.scale.setScalar(s.s); m.updateMatrix(); shade.current!.setMatrixAt(i, m.matrix); }); shade.current!.instanceMatrix.needsUpdate = true; invalidate(); }, [slots, invalidate]);
  const scene = sceneTheme(usePrefs((p) => p.theme));
  return <>
    <group ref={group} />
    <instancedMesh ref={shade} args={[disc, undefined, slots.length]} frustumCulled={false} visible={canopy > 0} renderOrder={1}><meshBasicMaterial color={scene.contact.color} vertexColors transparent opacity={scene.contact.opacity} depthWrite={false} /></instancedMesh>
  </>;
}

/** Soil slab: a ridged top (rows on the ridges, shallow furrows between them) and darker side walls. Decoration only. */
function Soil({ state, scene }: { state: FieldState; scene: SceneTheme }) {
  const top = useMemo(() => {
    const g = new THREE.PlaneGeometry(WIDTH, DEPTH, 1, Math.round((DEPTH / DZ) * 8)).rotateX(-Math.PI / 2); const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) p.setY(i, -0.03 + 0.03 * Math.cos(((p.getZ(i) + ((ROWS - 1) / 2) * DZ) / DZ) * Math.PI * 2));
    g.computeVertexNormals(); return g;
  }, []);
  useEffect(() => () => top.dispose(), [top]);
  const color = soilColor(scene, state.awf, state.covered && state.land === 'bare'); const side = useMemo(() => new THREE.Color(color).multiplyScalar(scene.sideShade), [color, scene.sideShade]);
  return <group>
    <mesh geometry={top}><meshStandardMaterial color={color} roughness={1} /></mesh>
    <mesh position={[0, -0.26, 0]}><boxGeometry args={[WIDTH, 0.4, DEPTH]} /><meshStandardMaterial color={side} roughness={1} /></mesh>
  </group>;
}

const VIEW = new THREE.Vector3(15.5, 11.5, 23.5), TARGET = new THREE.Vector3(0, -1.5, 0.3), CLOSE = new THREE.Vector3(0.52, 0.3, 1).normalize();
const MIN_RADIUS = 1.1, MAX_RADIUS = 42;
function Controls({ label, detail, height }: { label: string; detail: boolean; height: number }) {
  const { camera, gl, invalidate } = useThree(); const aspect = useThree((st) => st.size.width / Math.max(1, st.size.height)); const narrow = Math.round(Math.min(1.6, aspect) * 4);
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement); controls.current = c; c.enablePan = false; c.minDistance = MIN_RADIUS; c.maxDistance = MAX_RADIUS; c.maxPolarAngle = Math.PI / 2.15;
    const on = () => invalidate(); c.addEventListener('change', on);
    const el = gl.domElement; el.tabIndex = 0; el.setAttribute('role', 'img');
    const key = (e: KeyboardEvent) => {
      const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target)); const step = 0.12;
      if (e.key === 'ArrowLeft') sph.theta -= step; else if (e.key === 'ArrowRight') sph.theta += step; else if (e.key === 'ArrowUp') sph.phi = Math.max(0.3, sph.phi - step); else if (e.key === 'ArrowDown') sph.phi = Math.min(Math.PI / 2.15, sph.phi + step);
      else if (e.key === '+' || e.key === '=') sph.radius = Math.max(MIN_RADIUS, sph.radius * 0.88); else if (e.key === '-') sph.radius = Math.min(MAX_RADIUS, sph.radius * 1.14); else return;
      e.preventDefault(); camera.position.copy(new THREE.Vector3().setFromSpherical(sph).add(c.target)); c.update(); invalidate();
    };
    el.addEventListener('keydown', key);
    return () => { c.removeEventListener('change', on); el.removeEventListener('keydown', key); c.dispose(); controls.current = null; };
  }, [camera, gl, invalidate]);
  // Framing: the whole field, or the detail block. It is applied when the preset or the aspect band changes —
  // never when the day, the theme or the water changes, so an orbit chosen by the user survives playback.
  const tall = useRef(height); tall.current = height;
  useEffect(() => {
    const c = controls.current; if (!c) return; const k = Math.max(1, 1.55 / Math.max(0.3, aspect));
    if (detail) { const h = Math.max(0.2, tall.current); c.target.set(NEAR_CENTRE.x, h * 0.5, NEAR_CENTRE.z); camera.position.copy(c.target).addScaledVector(CLOSE, (h * 1.9 + 0.9) * k); }
    else { c.target.copy(TARGET); camera.position.copy(VIEW).multiplyScalar(k); }
    c.update(); invalidate();
  }, [detail, narrow, camera, invalidate]); // eslint-disable-line react-hooks/exhaustive-deps -- reframe only on preset or aspect band
  // In the detail preset the target follows the plant height (it grows), keeping the user's orbit.
  useEffect(() => { const c = controls.current; if (!c || !detail) return; const dy = Math.max(0.2, height) * 0.5 - c.target.y; if (Math.abs(dy) < 0.01) return; c.target.y += dy; camera.position.y += dy; c.update(); invalidate(); }, [height, detail, camera, invalidate]);
  useEffect(() => { gl.domElement.setAttribute('aria-label', label); }, [label, gl]);
  return null;
}

function Lights({ scene }: { scene: SceneTheme }) {
  return <><ambientLight intensity={scene.ambient} /><directionalLight position={scene.sun.position} intensity={scene.sun.intensity} color={scene.sun.color} /><hemisphereLight args={[scene.hemisphere.sky, scene.hemisphere.ground, scene.hemisphere.intensity]} /></>;
}
/** Asks for one frame whenever something that is not a prop of a three object changes (frameloop is on demand). */
function Redraw({ on }: { on: unknown }) { const { invalidate } = useThree(); useEffect(() => { invalidate(); }, [on, invalidate]); return null; }

type FieldWindow = { __gaiapusField?: THREE.WebGLRenderer };
function softwareRenderer(gl: THREE.WebGLRenderer): boolean {
  try { const c = gl.getContext(); const info = c.getExtension('WEBGL_debug_renderer_info'); return !!info && /swiftshader|llvmpipe|software|basic render/i.test(String(c.getParameter(info.UNMASKED_RENDERER_WEBGL))); } catch { return false; }
}
export default function Field3D({ state, seed = 7, label, onLost }: { state: FieldState; seed?: number; label: string; onLost?: () => void }) {
  const { t } = useI18n(); const theme = usePrefs((p) => p.theme); const scene = sceneTheme(theme); const compact = useMedia('(max-width: 760px)');
  const [detail, setDetail] = useState(false);
  // Without GPU acceleration (software rasteriser) every triangle is paid on the CPU: use the light level everywhere.
  const [software, setSoftware] = useState(false);
  const source = state.phase?.source, fraction = state.phase?.fraction;
  const visual = useMemo(() => resolveFieldVisual(state.land, state.stage, state.phase), [state.land, state.stage, source, fraction]); // eslint-disable-line react-hooks/exhaustive-deps
  const height = visual.crop ? (visual.crop.family === 'maize' ? MAIZE_HEIGHT_M : SOY_HEIGHT_M * SOY_CLUMP) * visual.crop.pose.height : visual.cover ? 0.3 : 0.2;
  const lost = useRef(onLost); lost.current = onLost;
  return (
    <div className="field3d" style={{ position: 'relative', width: '100%', height: '100%' }} data-testid="field3d" data-crop={visual.crop?.family ?? ''} data-pose={visual.crop?.key ?? ''} data-cover={visual.cover?.pose ?? ''} data-representative={visual.representative} data-detail={detail} data-level={compact || software ? 'far' : 'field'}>
      <Canvas frameloop="demand" dpr={[1, compact ? 1.5 : 1.75]} camera={{ position: [VIEW.x, VIEW.y, VIEW.z], fov: 36, near: 0.1, far: 200 }} gl={{ antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => { (window as unknown as FieldWindow).__gaiapusField = gl; if (softwareRenderer(gl)) setSoftware(true); gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost.current?.(); }); }}>
        <Lights scene={scene} />
        <Soil state={state} scene={scene} />
        <Plants visual={visual} seed={seed} far={compact || software} />
        <Controls label={label} detail={detail} height={height} />
        <Redraw on={theme} />
      </Canvas>
      <div className="sim__field-tools" data-testid="field-tools">
        <button type="button" className="icon-btn" data-testid="field-detail" aria-pressed={detail} aria-label={t(detail ? 'sim.fieldWide' : 'sim.fieldCloseUp')} title={t(detail ? 'sim.fieldWide' : 'sim.fieldCloseUp')} onClick={() => setDetail((v) => !v)}>{detail ? <ZoomOut size={20} aria-hidden /> : <ZoomIn size={20} aria-hidden />}</button>
      </div>
    </div>
  );
}

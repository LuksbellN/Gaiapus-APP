// Soil-profile 3D view (lazy chunk). Cross-section block, plants on top, rain/irrigation particles and
// drainage/runoff arrows, all read from ProfileLayers — the same data as the 2D fallback.
// Visual language inspired by the Lara simulator (LaraLLC/Hackathon-Nasa-SpaceApps @ 76aaf46, CropTwin3D.tsx),
// reimplemented without Drei on the Gaiapus stack (R3F 8 / three 0.170). Nothing here computes water.
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { DeviceText } from './Profile2D';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRAINAGE_COLOR, IRRIGATION_COLOR, LED_COLORS, lerpHex, PROFILE_DEPTH_M, RAIN_COLOR, RUNOFF_COLOR, SOIL_BELOW, type ProfileLayers } from './profile-model';

const BLOCK = { width: 4, depth: 2.5 } as const; const FRONT_Z = BLOCK.depth / 2;
const ROWS = 5, PER_ROW = 28, ROW_SPACING = 0.5;
const tmp = new THREE.Object3D();
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const slots = (() => { const r = mulberry32(42); const out: { x: number; z: number; s: number; rot: number; front: boolean }[] = []; for (let row = 0; row < ROWS; row++) for (let i = 0; i < PER_ROW; i++) out.push({ x: -1.85 + (3.7 * (i + 0.5)) / PER_ROW + (r() - 0.5) * 0.02, z: -((ROWS - 1) * ROW_SPACING) / 2 + row * ROW_SPACING, s: 0.88 + r() * 0.24, rot: r() * Math.PI * 2, front: row === ROWS - 1 }); return out; })();

/** Pauses continuous redraws while the tab is hidden; frameloop is "demand" anyway. */
function useVisible() { const v = useRef(typeof document === 'undefined' || !document.hidden); useEffect(() => { const on = () => { v.current = !document.hidden; }; document.addEventListener('visibilitychange', on); return () => document.removeEventListener('visibilitychange', on); }, []); return v; }

function Soil({ layers }: { layers: ProfileLayers }) {
  const zone = layers.roots ? layers.roots.depthM : PROFILE_DEPTH_M * 0.55; const below = PROFILE_DEPTH_M - zone;
  // Without a root depth there is no known lower limit of the zone: fade in thin slices instead of a colour step.
  const FADE = 6; const slice = below / FADE;
  return <group>
    <mesh position={[0, -zone / 2, 0]}><boxGeometry args={[BLOCK.width, zone, BLOCK.depth]} /><meshLambertMaterial color={layers.soilColor} flatShading /></mesh>
    {layers.roots
      ? <><mesh position={[0, -zone - below / 2, 0]}><boxGeometry args={[BLOCK.width, below, BLOCK.depth]} /><meshLambertMaterial color={SOIL_BELOW} flatShading /></mesh><mesh position={[0, -zone, FRONT_Z + 0.004]}><boxGeometry args={[BLOCK.width, 0.012, 0.004]} /><meshBasicMaterial color="#f5efe0" /></mesh></>
      : Array.from({ length: FADE }, (_, i) => <mesh key={i} position={[0, -zone - slice * (i + 0.5), 0]}><boxGeometry args={[BLOCK.width, slice, BLOCK.depth]} /><meshLambertMaterial color={lerpHex(layers.soilColor, SOIL_BELOW, (i + 1) / FADE)} flatShading /></mesh>)}
  </group>;
}

function Plants({ layers }: { layers: ProfileLayers }) {
  const leaves = useRef<THREE.InstancedMesh>(null); const { invalidate } = useThree();
  const geom = useMemo(() => (layers.maize ? new THREE.ConeGeometry(1, 1, 5) : new THREE.IcosahedronGeometry(1, 0)), [layers.maize]);
  useEffect(() => () => geom.dispose(), [geom]);
  useLayoutEffect(() => {
    const m = leaves.current!; const h = layers.plantHeight;
    slots.forEach((p, i) => {
      const hh = h * p.s; const r = (layers.maize ? 0.12 : 0.22) * Math.sqrt(Math.max(0, h / (layers.maize ? 2.2 : 0.95))) * p.s;
      tmp.rotation.set(0, p.rot, 0); tmp.position.set(p.x, hh * 0.55, p.z);
      if (hh < 0.01) tmp.scale.set(0, 0, 0); else tmp.scale.set(r, layers.maize ? hh : Math.max(hh * 0.5, r * 0.5), r);
      tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true; (m.material as THREE.MeshLambertMaterial).color.set(layers.leafColor); invalidate();
  }, [layers.plantHeight, layers.maize, layers.leafColor, invalidate]);
  return <instancedMesh ref={leaves} args={[geom, undefined, slots.length]} frustumCulled={false}><meshLambertMaterial flatShading /></instancedMesh>;
}

function Roots({ depth }: { depth: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const front = useMemo(() => slots.filter((s) => s.front), []); const { invalidate } = useThree();
  const geom = useMemo(() => new THREE.ConeGeometry(1, 1, 4).rotateX(Math.PI), []); useEffect(() => () => geom.dispose(), [geom]);
  useLayoutEffect(() => { front.forEach((p, i) => { const d = depth * (0.85 + (p.s - 0.88) * 0.6); tmp.rotation.set(0, 0, 0); tmp.position.set(p.x, -d / 2, FRONT_Z + 0.006); tmp.scale.set(0.014, d, 0.002); tmp.updateMatrix(); ref.current!.setMatrixAt(i, tmp.matrix); }); ref.current!.instanceMatrix.needsUpdate = true; invalidate(); }, [depth, front, invalidate]);
  return <instancedMesh ref={ref} args={[geom, undefined, front.length]} frustumCulled={false}><meshBasicMaterial color="#efe3c4" /></instancedMesh>;
}

function Particles({ count, color, ymin, ymax, speed, still, size }: { count: number; color: string; ymin: number; ymax: number; speed: number; still: boolean; size: number }) {
  const ref = useRef<THREE.Points>(null); const { invalidate } = useThree(); const visible = useVisible();
  const positions = useMemo(() => { const r = mulberry32(count * 7919 + Math.round(ymax * 100)); const a = new Float32Array(count * 3); for (let i = 0; i < count; i++) { a[i * 3] = (r() - 0.5) * BLOCK.width; a[i * 3 + 1] = ymin + r() * (ymax - ymin); a[i * 3 + 2] = (r() - 0.5) * BLOCK.depth; } return a; }, [count, ymin, ymax]);
  useFrame((_, dt) => {
    if (still || !visible.current || !ref.current || count === 0) return;
    const attr = ref.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) { let y = attr.getY(i) - speed * Math.min(dt, 0.05); if (y < ymin) y = ymax; attr.setY(i, y); }
    attr.needsUpdate = true; invalidate();
  });
  useEffect(() => { invalidate(); }, [count, invalidate]);
  if (count === 0) return null;
  return <points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} usage={THREE.DynamicDrawUsage} /></bufferGeometry><pointsMaterial color={color} size={size} sizeAttenuation transparent opacity={0.85} depthWrite={false} /></points>;
}

function Arrow({ from, dir, length, width, color }: { from: [number, number, number]; dir: [number, number, number]; length: number; width: number; color: string }) {
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize()), [dir]);
  return <group position={from} quaternion={q}><mesh position={[0, length * 0.4, 0]}><cylinderGeometry args={[width, width, length * 0.8, 6]} /><meshBasicMaterial color={color} /></mesh><mesh position={[0, length * 0.9, 0]}><coneGeometry args={[width * 2.6, length * 0.25, 6]} /><meshBasicMaterial color={color} /></mesh></group>;
}
// Stake geometry as in the device: 0.75 m body from 0.30 m above ground, electrodes at 15/40 cm, LED on top.
const STAKE_X = BLOCK.width / 2 - 0.35, STAKE_Z = FRONT_Z + 0.03, RULER_X = -BLOCK.width / 2 - 0.12;
function Device({ device }: { device: NonNullable<ProfileLayers['device']> }) {
  const c = LED_COLORS[device.led];
  return <group position={[STAKE_X, 0, STAKE_Z]}>
    <mesh position={[0, -0.075, 0]}><cylinderGeometry args={[0.018, 0.018, 0.75, 8]} /><meshLambertMaterial color="#d8d6cf" /></mesh>
    {device.electrodesM.map((d) => <mesh key={d} position={[0, -d, 0]}><cylinderGeometry args={[0.026, 0.026, 0.035, 10]} /><meshLambertMaterial color="#b98d2c" /></mesh>)}
    <mesh position={[0, 0.33, 0]}><sphereGeometry args={[0.038, 12, 8]} /><meshBasicMaterial color={c} /></mesh>
    <mesh position={[0, 0.33, 0]}><sphereGeometry args={[0.07, 12, 8]} /><meshBasicMaterial color={c} transparent opacity={0.25} depthWrite={false} /></mesh>
  </group>;
}
function Ruler({ ticks }: { ticks: number[] }) {
  return <group position={[RULER_X, 0, FRONT_Z + 0.01]}>
    <mesh position={[0.06, -PROFILE_DEPTH_M / 2, 0]}><boxGeometry args={[0.006, PROFILE_DEPTH_M, 0.006]} /><meshBasicMaterial color="#6b675e" /></mesh>
    {ticks.map((d) => <mesh key={d} position={[0.03, -d, 0]}><boxGeometry args={[0.07, 0.008, 0.008]} /><meshBasicMaterial color="#6b675e" /></mesh>)}
  </group>;
}
type Label = { id: string; pos: [number, number, number]; text: string; align: 'left' | 'right' };
/** HTML labels positioned by projecting 3D points on each rendered frame (one overlay, no per-label React root). */
function LabelProjector({ labels, refs, layer }: { labels: Label[]; refs: MutableRefObject<Map<string, HTMLDivElement>>; layer: MutableRefObject<HTMLDivElement | null> }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size, gl }) => {
    // Offset between the canvas and the label layer, measured each frame, so labels sit on their 3D points.
    // three.js refreshes matrixWorldInverse inside render(), after useFrame: refresh it here or labels lag one frame behind.
    camera.updateMatrixWorld();
    const c = gl.domElement.getBoundingClientRect(), o = layer.current?.getBoundingClientRect(); const dx = o ? c.left - o.left : 0, dy = o ? c.top - o.top : 0;
    for (const l of labels) {
      const el = refs.current.get(l.id); if (!el) continue;
      v.set(...l.pos).project(camera);
      el.style.transform = `translate(${dx + ((v.x + 1) / 2) * size.width}px, ${dy + ((1 - v.y) / 2) * size.height}px) translate(${l.align === 'right' ? '-100%' : '0'}, -50%)`;
      el.style.visibility = v.z < 1 ? 'visible' : 'hidden';
    }
  });
  return null;
}

const DOWN: [number, number, number] = [0, -1, 0]; const RIGHT: [number, number, number] = [1, 0, 0];

/** Frames the whole block (and the ruler at its left edge); narrow stages move the camera back instead of cropping. */
const framing = (aspect: number) => { const k = Math.max(1, 1.1 / Math.max(0.3, aspect)); return new THREE.Vector3(3.9 * k, 1.2 + 0.6 * k, 5.1 * k); };
function Controls({ label }: { label: string }) {
  const { camera, gl, invalidate } = useThree(); const aspect = useThree((st) => st.size.width / Math.max(1, st.size.height)); const narrow = Math.round(Math.min(1.6, aspect) * 4);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement); c.enablePan = false; c.minDistance = 3; c.minPolarAngle = 0.35; c.maxPolarAngle = 1.5; c.maxDistance = 16; c.target.set(-0.35, -0.45, 0); camera.position.copy(framing(aspect)); c.update(); invalidate();
    const on = () => invalidate(); c.addEventListener('change', on);
    const el = gl.domElement; el.tabIndex = 0; el.setAttribute('role', 'img');
    const key = (e: KeyboardEvent) => { const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target)); const step = 0.12; if (e.key === 'ArrowLeft') sph.theta -= step; else if (e.key === 'ArrowRight') sph.theta += step; else if (e.key === 'ArrowUp') sph.phi = Math.max(0.35, sph.phi - step); else if (e.key === 'ArrowDown') sph.phi = Math.min(1.5, sph.phi + step); else if (e.key === '+' || e.key === '=') sph.radius = Math.max(3, sph.radius - 0.5); else if (e.key === '-') sph.radius = Math.min(16, sph.radius + 0.5); else return; e.preventDefault(); camera.position.copy(new THREE.Vector3().setFromSpherical(sph).add(c.target)); c.update(); invalidate(); };
    el.addEventListener('keydown', key);
    return () => { c.removeEventListener('change', on); el.removeEventListener('keydown', key); c.dispose(); };
  }, [camera, gl, invalidate, narrow]); // eslint-disable-line react-hooks/exhaustive-deps -- reframe only when the aspect band changes
  useEffect(() => { gl.domElement.setAttribute('aria-label', label); }, [label, gl]);
  return null;
}

export default function SoilProfile3D({ layers, label, reducedMotion, deviceText }: { layers: ProfileLayers; label: string; reducedMotion: boolean; deviceText: DeviceText }) {
  const zoneBottom = layers.roots ? layers.roots.depthM : PROFILE_DEPTH_M * 0.55;
  const refs = useRef(new Map<string, HTMLDivElement>()); const layer = useRef<HTMLDivElement | null>(null);
  const labels = useMemo<Label[]>(() => [
    ...layers.rulerTicksM.map((d): Label => ({ id: `r${d}`, pos: [RULER_X + 0.14, -d, FRONT_Z + 0.01], text: `${Math.round(d * 100)} cm`, align: 'left' })),
    ...(layers.device ? [...layers.device.electrodesM.map((d): Label => ({ id: `e${d}`, pos: [STAKE_X - 0.06, -d, STAKE_Z], text: deviceText.electrode(Math.round(d * 100)), align: 'right' })),
      { id: 'led', pos: [STAKE_X - 0.09, 0.33, STAKE_Z], text: deviceText.led, align: 'right' } as Label] : []),
  ], [layers.rulerTicksM, layers.device, deviceText]);
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <Canvas frameloop="demand" dpr={[1, 1.75]} camera={{ position: [4.3, 1.9, 5.7], fov: 38 }} gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={({ gl }) => { (window as unknown as { __gaiapusProfile?: THREE.WebGLRenderer }).__gaiapusProfile = gl; }}>
      <hemisphereLight args={['#ffffff', '#806040', 1.1]} /><directionalLight position={[3, 5, 4]} intensity={1.4} />
      <Soil layers={layers} />
      {layers.roots && <Roots depth={layers.roots.depthM} />}
      <Plants layers={layers} />
      <Particles count={layers.rainCount} color={RAIN_COLOR} ymin={0.05} ymax={2.6} speed={3.2} still={reducedMotion} size={0.055} />
      <Particles count={layers.irrigationCount} color={IRRIGATION_COLOR} ymin={0} ymax={0.22} speed={0.35} still={reducedMotion} size={0.04} />
      {layers.drainage && <Arrow from={[-0.6, -zoneBottom + 0.1, FRONT_Z + 0.02]} dir={DOWN} length={layers.drainage.length} width={layers.drainage.width} color={DRAINAGE_COLOR} />}
      {layers.runoff && <Arrow from={[-1.2, 0.04, FRONT_Z + 0.08]} dir={RIGHT} length={1.2 + layers.runoff.length} width={layers.runoff.width} color={RUNOFF_COLOR} />}
      {layers.device && <Device device={layers.device} />}
      {layers.rulerTicksM.length > 0 && <Ruler ticks={layers.rulerTicksM} />}
      <LabelProjector labels={labels} refs={refs} layer={layer} />
      <Controls label={label} />
    </Canvas>
    <div ref={layer} aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {labels.map((l) => <div key={l.id} ref={(el) => { if (el) refs.current.set(l.id, el); else refs.current.delete(l.id); }} style={{ position: 'absolute', left: 0, top: 0, visibility: 'hidden', whiteSpace: 'nowrap', fontSize: 12, color: '#EAF2EB', background: 'rgba(8,16,12,.72)', padding: '1px 6px', borderRadius: 6 }}>{l.text}</div>)}
    </div>
    </div>
  );
}

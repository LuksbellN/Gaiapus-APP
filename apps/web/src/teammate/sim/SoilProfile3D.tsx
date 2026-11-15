// Soil-profile 3D view (lazy chunk). Cross-section block, plants on top, rain/irrigation particles and
// drainage/runoff arrows, all read from ProfileLayers — the same data as the 2D fallback.
// Visual language inspired by the Lara simulator (LaraLLC/Hackathon-Nasa-SpaceApps @ 76aaf46, CropTwin3D.tsx),
// reimplemented without Drei on the Gaiapus stack (R3F 8 / three 0.170). Nothing here computes water.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRAINAGE_COLOR, IRRIGATION_COLOR, lerpHex, PROFILE_DEPTH_M, RAIN_COLOR, RUNOFF_COLOR, SOIL_BELOW, type ProfileLayers } from './profile-model';

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
const DOWN: [number, number, number] = [0, -1, 0]; const RIGHT: [number, number, number] = [1, 0, 0];

function Controls({ label }: { label: string }) {
  const { camera, gl, invalidate } = useThree();
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement); c.enablePan = false; c.minDistance = 3; c.maxDistance = 12; c.minPolarAngle = 0.35; c.maxPolarAngle = 1.5; c.target.set(0, -0.3, 0); c.update();
    const on = () => invalidate(); c.addEventListener('change', on);
    const el = gl.domElement; el.tabIndex = 0; el.setAttribute('role', 'img');
    const key = (e: KeyboardEvent) => { const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target)); const step = 0.12; if (e.key === 'ArrowLeft') sph.theta -= step; else if (e.key === 'ArrowRight') sph.theta += step; else if (e.key === 'ArrowUp') sph.phi = Math.max(0.35, sph.phi - step); else if (e.key === 'ArrowDown') sph.phi = Math.min(1.5, sph.phi + step); else if (e.key === '+' || e.key === '=') sph.radius = Math.max(3, sph.radius - 0.5); else if (e.key === '-') sph.radius = Math.min(12, sph.radius + 0.5); else return; e.preventDefault(); camera.position.copy(new THREE.Vector3().setFromSpherical(sph).add(c.target)); c.update(); invalidate(); };
    el.addEventListener('keydown', key);
    return () => { c.removeEventListener('change', on); el.removeEventListener('keydown', key); c.dispose(); };
  }, [camera, gl, invalidate]);
  useEffect(() => { gl.domElement.setAttribute('aria-label', label); }, [label, gl]);
  return null;
}

export default function SoilProfile3D({ layers, label, reducedMotion }: { layers: ProfileLayers; label: string; reducedMotion: boolean }) {
  const zoneBottom = layers.roots ? layers.roots.depthM : PROFILE_DEPTH_M * 0.55;
  return (
    <Canvas frameloop="demand" dpr={[1, 1.75]} camera={{ position: [3.4, 1.6, 4.4], fov: 38 }} gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={({ gl }) => { (window as unknown as { __gaiapusProfile?: THREE.WebGLRenderer }).__gaiapusProfile = gl; }}>
      <hemisphereLight args={['#ffffff', '#806040', 1.1]} /><directionalLight position={[3, 5, 4]} intensity={1.4} />
      <Soil layers={layers} />
      {layers.roots && <Roots depth={layers.roots.depthM} />}
      <Plants layers={layers} />
      <Particles count={layers.rainCount} color={RAIN_COLOR} ymin={0.05} ymax={2.6} speed={3.2} still={reducedMotion} size={0.055} />
      <Particles count={layers.irrigationCount} color={IRRIGATION_COLOR} ymin={0} ymax={0.22} speed={0.35} still={reducedMotion} size={0.04} />
      {layers.drainage && <Arrow from={[-0.6, -zoneBottom + 0.1, FRONT_Z + 0.02]} dir={DOWN} length={layers.drainage.length} width={layers.drainage.width} color={DRAINAGE_COLOR} />}
      {layers.runoff && <Arrow from={[-1.2, 0.04, FRONT_Z + 0.08]} dir={RIGHT} length={1.2 + layers.runoff.length} width={layers.runoff.width} color={RUNOFF_COLOR} />}
      <Controls label={label} />
    </Canvas>
  );
}

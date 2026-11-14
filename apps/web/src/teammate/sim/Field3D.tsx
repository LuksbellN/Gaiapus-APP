// Campo 3D ilustrativo (React Three Fiber). O estado de desenvolvimento vem de um calendário
// demonstrativo (fase + avanço dentro da fase), separado de qualquer estimativa de rendimento.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { development, type FieldState } from './field-state';
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ROWS = 18, COLS = 30;

function Controls({ label }: { label: string }) {
  const { camera, gl, invalidate } = useThree();
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement); c.enablePan = false; c.minDistance = 8; c.maxDistance = 42; c.maxPolarAngle = Math.PI / 2.15; c.target.set(0, -1.4, 0); c.update();
    const on = () => invalidate(); c.addEventListener('change', on);
    const el = gl.domElement; el.tabIndex = 0; el.setAttribute('role', 'img'); el.setAttribute('aria-label', label);
    const key = (e: KeyboardEvent) => { const step = 0.12; const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target)); if (e.key === 'ArrowLeft') sph.theta -= step; else if (e.key === 'ArrowRight') sph.theta += step; else if (e.key === 'ArrowUp') sph.phi = Math.max(0.3, sph.phi - step); else if (e.key === 'ArrowDown') sph.phi = Math.min(Math.PI / 2.15, sph.phi + step); else if (e.key === '+' || e.key === '=') sph.radius = Math.max(8, sph.radius - 1.5); else if (e.key === '-') sph.radius = Math.min(42, sph.radius + 1.5); else return; e.preventDefault(); camera.position.copy(new THREE.Vector3().setFromSpherical(sph).add(c.target)); c.update(); invalidate(); };
    el.addEventListener('keydown', key);
    return () => { c.removeEventListener('change', on); el.removeEventListener('keydown', key); c.dispose(); };
  }, [camera, gl, invalidate]); // eslint-disable-line
  useEffect(() => { gl.domElement.setAttribute('aria-label', label); }, [label, gl]);
  return null;
}

function Plants({ state, seed }: { state: FieldState; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const bush = useRef<THREE.InstancedMesh>(null); const cover = useRef<THREE.InstancedMesh>(null); const { invalidate } = useThree();
  const jitter = useMemo(() => { const r = mulberry32(seed); return Array.from({ length: ROWS * COLS }, () => ({ dx: (r() - 0.5) * 0.12, dz: (r() - 0.5) * 0.25, s: 0.85 + r() * 0.3, rot: r() * Math.PI })); }, [seed]);
  useLayoutEffect(() => {
    const m = new THREE.Object3D(); const dev = development(state); const maize = state.land.startsWith('maize2'); const crop = state.land === 'soy' || maize; const mat = state.stage === 'maturation';
    const h = crop ? dev * (maize ? 2.2 : 0.95) : 0; const w = crop ? (maize ? 0.16 + dev * 0.14 : 0.1 + dev * 0.42) : 0;
    const color = new THREE.Color(mat ? (maize ? '#c9b25e' : '#b9a24f') : maize ? '#5fa35a' : '#4f9a4d').lerp(new THREE.Color('#8a7d3c'), state.awf < 0.3 && !mat ? 0.35 : 0);
    const bra = state.land.includes('brachiaria') ? (state.land === 'brachiaria' ? 0.5 : 0.12 + dev * 0.22) : 0;
    jitter.forEach((j, i) => {
      const r = Math.floor(i / COLS), c = i % COLS; const x = (c - (COLS - 1) / 2) * 0.62 + j.dx, z = (r - (ROWS - 1) / 2) * 0.8 + j.dz;
      // Milho: cone alto. Soja: copa baixa e arredondada. O tipo que não está em campo fica com escala nula.
      const hm = maize ? h : 0, hs = maize ? 0 : h;
      m.position.set(x, (hm * j.s) / 2, z); m.scale.set(Math.max(hm ? w * j.s : 0, 0.0001), Math.max(hm * j.s, 0.0001), Math.max(hm ? w * j.s : 0, 0.0001)); m.rotation.set(0, j.rot, 0); m.updateMatrix(); ref.current!.setMatrixAt(i, m.matrix);
      m.position.set(x, (hs * j.s) / 2, z); m.scale.set(Math.max(hs ? w * j.s * 1.25 : 0, 0.0001), Math.max(hs * j.s, 0.0001), Math.max(hs ? w * j.s * 1.6 : 0, 0.0001)); m.updateMatrix(); bush.current!.setMatrixAt(i, m.matrix);
      m.position.set(x + 0.3, (bra * j.s) / 2, z + 0.4); m.scale.set(bra ? 0.5 : 0.0001, Math.max(bra * j.s, 0.0001), bra ? 0.5 : 0.0001); m.updateMatrix(); cover.current!.setMatrixAt(i, m.matrix);
    });
    ref.current!.instanceMatrix.needsUpdate = true; bush.current!.instanceMatrix.needsUpdate = true; cover.current!.instanceMatrix.needsUpdate = true; (ref.current!.material as THREE.MeshStandardMaterial).color.copy(color); (bush.current!.material as THREE.MeshStandardMaterial).color.copy(color); invalidate();
  }, [state, jitter, invalidate]);
  return <>
    <instancedMesh ref={ref} args={[undefined, undefined, ROWS * COLS]} frustumCulled={false}><coneGeometry args={[1, 1, 6]} /><meshStandardMaterial roughness={0.9} /></instancedMesh>
    <instancedMesh ref={bush} args={[undefined, undefined, ROWS * COLS]} frustumCulled={false}><icosahedronGeometry args={[0.5, 1]} /><meshStandardMaterial roughness={0.95} flatShading /></instancedMesh>
    <instancedMesh ref={cover} args={[undefined, undefined, ROWS * COLS]} frustumCulled={false}><coneGeometry args={[1, 1, 5]} /><meshStandardMaterial color="#7fa45a" roughness={1} /></instancedMesh>
  </>;
}
function Soil({ state }: { state: FieldState }) {
  const { invalidate } = useThree(); const mat = useRef<THREE.MeshStandardMaterial>(null);
  useLayoutEffect(() => { const dry = new THREE.Color(state.covered && state.land === 'bare' ? '#b3a27a' : '#a98a63'); mat.current!.color.copy(dry.lerp(new THREE.Color('#4a3a2a'), Math.min(1, state.awf))); invalidate(); }, [state, invalidate]);
  return <mesh position={[0, -0.3, 0]}><boxGeometry args={[COLS * 0.62 + 1.2, 0.6, ROWS * 0.8 + 1.2]} /><meshStandardMaterial ref={mat} roughness={1} /></mesh>;
}
export default function Field3D({ state, seed = 7, label }: { state: FieldState; seed?: number; label: string }) {
  return (
    <Canvas frameloop="demand" dpr={[1, 1.75]} camera={{ position: [16, 12.5, 24.5], fov: 36 }} gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={({ gl }) => { (window as any).__gaiapusField = gl; }}>
      <ambientLight intensity={1.1} /><directionalLight position={[8, 14, 6]} intensity={1.7} /><hemisphereLight args={['#bcd9e6', '#3b2f22', 0.6]} />
      <Soil state={state} /><Plants state={state} seed={seed} /><Controls label={label} />
    </Canvas>
  );
}

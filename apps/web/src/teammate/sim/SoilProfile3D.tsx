// Soil-profile 3D view (lazy chunk). Cross-section block, plants on top, rain/irrigation particles and
// drainage/runoff arrows, all read from ProfileLayers — the same data as the 2D fallback.
// Visual language inspired by the Lara simulator (LaraLLC/Hackathon-Nasa-SpaceApps @ 76aaf46, CropTwin3D.tsx),
// reimplemented without Drei on the Gaiapus stack (R3F 8 / three 0.170). Nothing here computes water.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useI18n } from '../i18n';
import { STAKE_MODEL, stakePlacement } from './stake-model';
import type { StakeInstance } from './stake-loader';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { DeviceText } from './Profile2D';
import { RootSystem3D } from './RootSystem3D';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRAINAGE_COLOR, IRRIGATION_COLOR, mulberry32, LED_COLORS, lerpHex, PROFILE_DEPTH_M, RAIN_COLOR, RUNOFF_COLOR, SOIL_BELOW, type ProfileLayers } from './profile-model';

const BLOCK = { width: 4, depth: 2.5 } as const; const FRONT_Z = BLOCK.depth / 2;
const ROWS = 5, PER_ROW = 28, ROW_SPACING = 0.5;
const tmp = new THREE.Object3D();
const slots = (() => { const r = mulberry32(42); const out: { x: number; z: number; s: number; rot: number; front: boolean }[] = []; for (let row = 0; row < ROWS; row++) for (let i = 0; i < PER_ROW; i++) out.push({ x: -1.85 + (3.7 * (i + 0.5)) / PER_ROW + (r() - 0.5) * 0.02, z: -((ROWS - 1) * ROW_SPACING) / 2 + row * ROW_SPACING, s: 0.88 + r() * 0.24, rot: r() * Math.PI * 2, front: row === ROWS - 1 }); return out; })();

/** Pauses continuous redraws while the tab is hidden and asks for a frame when it is shown again (frameloop is "demand"). */
function useVisible() { const v = useRef(typeof document === 'undefined' || !document.hidden); const { invalidate } = useThree(); useEffect(() => { const on = () => { v.current = !document.hidden; if (v.current) invalidate(); }; document.addEventListener('visibilitychange', on); return () => document.removeEventListener('visibilitychange', on); }, [invalidate]); return v; }

/** Cutaway: translucent soil (no depth write) so roots inside the block stay visible. */
function SoilMat({ color, cutaway }: { color: string; cutaway: boolean }) { return <meshLambertMaterial color={color} flatShading transparent={cutaway} opacity={cutaway ? 0.35 : 1} depthWrite={!cutaway} />; }
function Soil({ layers, cutaway }: { layers: ProfileLayers; cutaway: boolean }) {
  const zone = layers.roots ? layers.roots.depthM : PROFILE_DEPTH_M * 0.55; const below = PROFILE_DEPTH_M - zone;
  // Without a root depth there is no known lower limit of the zone: fade in thin slices instead of a colour step.
  const FADE = 6; const slice = below / FADE;
  return <group>
    <mesh position={[0, -zone / 2, 0]}><boxGeometry args={[BLOCK.width, zone, BLOCK.depth]} /><SoilMat color={layers.soilColor} cutaway={cutaway} /></mesh>
    {layers.roots
      ? <><mesh position={[0, -zone - below / 2, 0]}><boxGeometry args={[BLOCK.width, below, BLOCK.depth]} /><SoilMat color={SOIL_BELOW} cutaway={cutaway} /></mesh><mesh position={[0, -zone, FRONT_Z + 0.004]}><boxGeometry args={[BLOCK.width, 0.012, 0.004]} /><meshBasicMaterial color="#f5efe0" /></mesh></>
      : Array.from({ length: FADE }, (_, i) => <mesh key={i} position={[0, -zone - slice * (i + 0.5), 0]}><boxGeometry args={[BLOCK.width, slice, BLOCK.depth]} /><SoilMat color={lerpHex(layers.soilColor, SOIL_BELOW, (i + 1) / FADE)} cutaway={cutaway} /></mesh>)}
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
// Installation point of the stake: just in front of the cut face, so the probe reads against the profile.
const STAKE_X = BLOCK.width / 2 - 0.35, STAKE_Z = FRONT_Z + 0.03, RULER_X = -BLOCK.width / 2 - 0.12;
export type StakeStatus = 'loading' | 'ready' | 'failed';
/**
 * The stake is the supplied rev G assembly (stake-model.ts), at true scale: probe in the soil, head, solar panel,
 * antenna and rain gauge above it. It replaces the former cylinder/sphere placeholder — nothing else draws hardware.
 * Loader and asset arrive on demand; while loading or after a failure nothing is drawn (the caller shows a note).
 */
function Device({ device, onStatus }: { device: NonNullable<ProfileLayers['device']>; onStatus: (s: StakeStatus) => void }) {
  const { invalidate } = useThree(); const [stake, setStake] = useState<StakeInstance | null>(null);
  const report = useRef(onStatus); report.current = onStatus;
  useEffect(() => {
    let alive = true; let made: StakeInstance | null = null; report.current('loading');
    import('./stake-loader').then((m) => m.createStakeInstance()).then((s) => { if (!alive) { s.dispose(); return; } made = s; setStake(s); report.current('ready'); }).catch(() => { if (alive) report.current('failed'); });
    return () => { alive = false; made?.dispose(); };
  }, []);
  // Only the lens of the simulated LED code is lit; the code comes from the scenario, never from a device.
  useLayoutEffect(() => { stake?.setLed(device.led); invalidate(); }, [stake, device.led, invalidate]);
  const place = useMemo(() => stakePlacement([STAKE_X, 0, STAKE_Z]), []);
  return stake ? <primitive object={stake.object} position={place.position} scale={place.scale} /> : null;
}
function Ruler({ ticks }: { ticks: number[] }) {
  return <group position={[RULER_X, 0, FRONT_Z + 0.01]}>
    <mesh position={[0.06, -PROFILE_DEPTH_M / 2, 0]}><boxGeometry args={[0.006, PROFILE_DEPTH_M, 0.006]} /><meshBasicMaterial color="#6b675e" /></mesh>
    {ticks.map((d) => <mesh key={d} position={[0.03, -d, 0]}><boxGeometry args={[0.07, 0.008, 0.008]} /><meshBasicMaterial color="#6b675e" /></mesh>)}
  </group>;
}
type Label = { id: string; pos: [number, number, number]; text: string; align: 'left' | 'right'; /** Colour dot before the text (simulated LED code). */ swatch?: string };
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
/** Close-up preset: the stake is drawn at true scale, so the default framing of the 4 m block shows it small. */
const STAKE_TARGET = new THREE.Vector3(STAKE_X - 0.05, 0.1, STAKE_Z), STAKE_VIEW = new THREE.Vector3(0.45, 0.3, 1.55);
function Controls({ label, closeUp }: { label: string; closeUp: boolean }) {
  const { camera, gl, invalidate } = useThree(); const aspect = useThree((st) => st.size.width / Math.max(1, st.size.height)); const narrow = Math.round(Math.min(1.6, aspect) * 4);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement); c.enablePan = false; c.minDistance = closeUp ? 0.45 : 3; c.minPolarAngle = 0.35; c.maxPolarAngle = 1.5; c.maxDistance = 16;
    if (closeUp) { c.target.copy(STAKE_TARGET); camera.position.copy(STAKE_TARGET).addScaledVector(STAKE_VIEW, Math.max(1, 1.1 / Math.max(0.3, aspect))); } else { c.target.set(-0.35, -0.45, 0); camera.position.copy(framing(aspect)); }
    const minRadius = c.minDistance; c.update(); invalidate();
    const on = () => invalidate(); c.addEventListener('change', on);
    const el = gl.domElement; el.tabIndex = 0; el.setAttribute('role', 'img');
    const key = (e: KeyboardEvent) => { const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target)); const step = 0.12; if (e.key === 'ArrowLeft') sph.theta -= step; else if (e.key === 'ArrowRight') sph.theta += step; else if (e.key === 'ArrowUp') sph.phi = Math.max(0.35, sph.phi - step); else if (e.key === 'ArrowDown') sph.phi = Math.min(1.5, sph.phi + step); else if (e.key === '+' || e.key === '=') sph.radius = Math.max(minRadius, sph.radius - (closeUp ? 0.15 : 0.5)); else if (e.key === '-') sph.radius = Math.min(16, sph.radius + 0.5); else return; e.preventDefault(); camera.position.copy(new THREE.Vector3().setFromSpherical(sph).add(c.target)); c.update(); invalidate(); };
    el.addEventListener('keydown', key);
    return () => { c.removeEventListener('change', on); el.removeEventListener('keydown', key); c.dispose(); };
  }, [camera, gl, invalidate, narrow, closeUp]); // eslint-disable-line react-hooks/exhaustive-deps -- reframe only when the aspect band or the preset changes
  useEffect(() => { gl.domElement.setAttribute('aria-label', label); }, [label, gl]);
  return null;
}

const ROOT_Z = (ROWS - 1) * ROW_SPACING / 2; // front plant row
export default function SoilProfile3D({ layers, label, reducedMotion, deviceText, cutaway = true }: { layers: ProfileLayers; label: string; reducedMotion: boolean; deviceText: DeviceText; cutaway?: boolean }) {
  const zoneBottom = layers.roots ? layers.roots.depthM : PROFILE_DEPTH_M * 0.55;
  const refs = useRef(new Map<string, HTMLDivElement>()); const layer = useRef<HTMLDivElement | null>(null);
  const { t } = useI18n(); const [stake, setStake] = useState<StakeStatus>('loading'); const [closeUp, setCloseUp] = useState(false);
  const onStake = useCallback((s: StakeStatus) => { setStake(s); (window as unknown as { __gaiapusStake?: StakeStatus }).__gaiapusStake = s; }, []);
  const hasDevice = !!layers.device; useEffect(() => { if (!hasDevice) setCloseUp(false); }, [hasDevice]);
  // Device labels only exist next to the drawn equipment: none while the model loads or if it failed.
  const device = stake === 'ready' ? layers.device : null;
  const labels = useMemo<Label[]>(() => [
    ...layers.rulerTicksM.map((d): Label => ({ id: `r${d}`, pos: [RULER_X + 0.14, -d, FRONT_Z + 0.01], text: `${Math.round(d * 100)} cm`, align: 'left' })),
    ...(device ? [...device.electrodesM.map((d): Label => ({ id: `e${d}`, pos: [STAKE_X - 0.05, -d, STAKE_Z], text: deviceText.electrode(Math.round(d * 100)), align: 'right' })),
      { id: 'led', pos: [STAKE_X + STAKE_MODEL.lightBar.x + 0.07, STAKE_MODEL.heightAboveSoilM + 0.05, STAKE_Z + STAKE_MODEL.lightBar.z], text: deviceText.led, align: 'left', swatch: LED_COLORS[device.led] } as Label] : []),
    ...(layers.rootSystem ? (() => {
      const r = layers.rootSystem;
      const out: Label[] = [r.depthLabelM != null && r.source !== 'illustrative'
        ? { id: 'root', pos: [-1.95, -r.drawDepthM, ROOT_Z], text: deviceText.roots.depth(Math.round(r.depthLabelM * 100), r.source), align: 'left' }
        : { id: 'root', pos: [-1.6, -1.42, ROOT_Z], text: deviceText.roots.illustrative, align: 'left' }];
      if (r.continuesBelow) out.push({ id: 'root-more', pos: [0.1, -r.drawDepthM - 0.08, ROOT_Z], text: deviceText.roots.continues(Math.round(r.drawDepthM * 100)), align: 'left' });
      return out;
    })() : []),
  ], [layers.rulerTicksM, device, layers.rootSystem, deviceText]);
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <Canvas frameloop="demand" dpr={[1, 1.75]} camera={{ position: [4.3, 1.9, 5.7], fov: 38 }} gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={({ gl }) => { (window as unknown as { __gaiapusProfile?: THREE.WebGLRenderer }).__gaiapusProfile = gl; }}>
      <hemisphereLight args={['#ffffff', '#806040', 1.1]} /><directionalLight position={[3, 5, 4]} intensity={1.4} />
      <Soil layers={layers} cutaway={cutaway} />
      {layers.rootSystem && <RootSystem3D layer={layers.rootSystem} z={ROOT_Z} />}
      <Plants layers={layers} />
      <Particles count={layers.rainCount} color={RAIN_COLOR} ymin={0.05} ymax={2.6} speed={3.2} still={reducedMotion} size={0.055} />
      <Particles count={layers.irrigationCount} color={IRRIGATION_COLOR} ymin={0} ymax={0.22} speed={0.35} still={reducedMotion} size={0.04} />
      {layers.drainage && <Arrow from={[-0.6, -zoneBottom + 0.1, FRONT_Z + 0.02]} dir={DOWN} length={layers.drainage.length} width={layers.drainage.width} color={DRAINAGE_COLOR} />}
      {layers.runoff && <Arrow from={[-1.2, 0.04, FRONT_Z + 0.08]} dir={RIGHT} length={1.2 + layers.runoff.length} width={layers.runoff.width} color={RUNOFF_COLOR} />}
      {layers.device && <Device device={layers.device} onStatus={onStake} />}
      {layers.rulerTicksM.length > 0 && <Ruler ticks={layers.rulerTicksM} />}
      <LabelProjector labels={labels} refs={refs} layer={layer} />
      <Controls label={label} closeUp={closeUp && !!layers.device} />
    </Canvas>
    <div ref={layer} aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {labels.map((l) => <div key={l.id} ref={(el) => { if (el) refs.current.set(l.id, el); else refs.current.delete(l.id); }} style={{ position: 'absolute', left: 0, top: 0, visibility: 'hidden', whiteSpace: 'nowrap', fontSize: 12, color: '#EAF2EB', background: 'rgba(8,16,12,.72)', padding: '1px 6px', borderRadius: 6 }}>{l.swatch && <span data-testid="led-swatch" style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: l.swatch, border: '1px solid #EAF2EB', marginRight: 5 }} />}{l.text}</div>)}
    </div>
    {layers.device && <div className="sim__stake-tools" data-testid="stake-tools">
      {stake === 'failed' && <p role="status" data-testid="stake-failed">{t('sim.profile.stakeModelFailed')}</p>}
      {stake === 'ready' && <button type="button" className="icon-btn" data-testid="stake-closeup" aria-pressed={closeUp} aria-label={t(closeUp ? 'sim.profile.stakeWide' : 'sim.profile.stakeCloseUp')} title={t(closeUp ? 'sim.profile.stakeWide' : 'sim.profile.stakeCloseUp')} onClick={() => setCloseUp((v) => !v)}>{closeUp ? <ZoomOut size={20} aria-hidden /> : <ZoomIn size={20} aria-hidden />}</button>}
    </div>}
    </div>
  );
}

// 3D part of the stake guide (own chunk): the shipped rev G model at its true proportions, orbit controls limited
// to rotating and zooming, and a ring around the QR label. Rendering is on demand: nothing animates on its own.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createStakeInstance, type StakeInstance } from '../sim/stake-loader';
import { clampPose, LIMITS, QR_NODE, rotatePose, viewPose, type GuideView, type Vec3 } from './stake-view';

type Anchors = { qr: { center: Vec3; normal: Vec3; size: number }; whole: { center: Vec3; height: number } };
const v3 = (v: THREE.Vector3): Vec3 => [v.x, v.y, v.z];

/** Measures the model once: where the QR label is, which way it faces, and the box of the whole stake. */
function measure(object: THREE.Object3D): Anchors | null {
  object.updateMatrixWorld(true);
  const label = object.getObjectByName(QR_NODE); if (!label) return null;
  const lb = new THREE.Box3().setFromObject(label), all = new THREE.Box3().setFromObject(object);
  const size = lb.getSize(new THREE.Vector3()), center = lb.getCenter(new THREE.Vector3());
  // The label is a flat patch: its thinnest axis is its normal; it points away from the centre of the stake.
  const axis = size.x <= size.y && size.x <= size.z ? 'x' : size.y <= size.z ? 'y' : 'z';
  const normal = new THREE.Vector3(); normal[axis] = Math.sign(center[axis] - all.getCenter(new THREE.Vector3())[axis]) || 1;
  return { qr: { center: v3(center), normal: v3(normal), size: Math.max(size.x, size.y, size.z) }, whole: { center: v3(all.getCenter(new THREE.Vector3())), height: all.getSize(new THREE.Vector3()).y } };
}

function Scene({ stake, anchors, view, nonce, ringColor, label }: { stake: StakeInstance; anchors: Anchors; view: GuideView; nonce: number; ringColor: string; label: string }) {
  const { camera, gl, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enablePan = false; c.minDistance = LIMITS.minDistance; c.maxDistance = LIMITS.maxDistance; c.minPolarAngle = LIMITS.minPolar; c.maxPolarAngle = LIMITS.maxPolar;
    const report = () => { // exposes the pose for assistive status and tests; the canvas attribute is not user-facing text
      gl.domElement.dataset.azimuth = c.getAzimuthalAngle().toFixed(3); gl.domElement.dataset.polar = c.getPolarAngle().toFixed(3); gl.domElement.dataset.distance = c.getDistance().toFixed(3);
      invalidate();
    };
    c.addEventListener('change', report); controls.current = c;
    // The canvas is the operable element: focusable, named, and the only place the guide's keys are handled.
    const el = gl.domElement; el.tabIndex = 0; el.setAttribute('role', 'img'); el.setAttribute('aria-label', label); el.dataset.testid = 'stake-guide-canvas';
    const onKey = (e: KeyboardEvent) => {
      const next = rotatePose({ azimuth: c.getAzimuthalAngle(), polar: c.getPolarAngle(), distance: c.getDistance() }, e.key); if (!next) return;
      e.preventDefault(); // only for the keys the guide handles, and only while the canvas has focus
      const p = clampPose(next); const s = new THREE.Spherical(p.distance, p.polar, p.azimuth);
      camera.position.setFromSpherical(s).add(c.target); c.update();
    };
    gl.domElement.addEventListener('keydown', onKey);
    return () => { gl.domElement.removeEventListener('keydown', onKey); c.removeEventListener('change', report); c.dispose(); controls.current = null; };
  }, [camera, gl, invalidate, label]);
  useEffect(() => {
    const c = controls.current; if (!c) return;
    const pose = viewPose(view, anchors.qr, anchors.whole);
    c.target.set(...pose.target); camera.position.set(...pose.position); c.update(); gl.domElement.dataset.view = view; invalidate();
  }, [view, nonce, anchors, camera, gl, invalidate]);
  const ring = useMemo(() => {
    const r = anchors.qr.size * 0.78; const g = new THREE.RingGeometry(r, r + 0.0035, 48);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: ringColor, side: THREE.DoubleSide, depthTest: false }));
    m.renderOrder = 2; const n = new THREE.Vector3(...anchors.qr.normal);
    m.position.set(...anchors.qr.center).addScaledVector(n, 0.0015); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    return m;
  }, [anchors, ringColor]);
  useEffect(() => () => { ring.geometry.dispose(); (ring.material as THREE.Material).dispose(); }, [ring]);
  return <><hemisphereLight args={['#ffffff', '#8a8f86', 1.25]} /><directionalLight position={[2, 3, 2.5]} intensity={1.5} /><directionalLight position={[-2, 1, -1.5]} intensity={0.5} />
    <primitive object={stake.object} /><primitive object={ring} /></>;
}

export default function StakeViewer({ view, nonce, label, onReady, onFail }: { view: GuideView; nonce: number; label: string; onReady: () => void; onFail: () => void }) {
  const [loaded, setLoaded] = useState<{ stake: StakeInstance; anchors: Anchors } | null>(null);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true; let made: StakeInstance | null = null;
    createStakeInstance().then((stake) => {
      made = stake; if (!alive) { stake.dispose(); return; }
      stake.setLed(0); // the guide shows the hardware, not a simulated state: no lens is lit
      const anchors = measure(stake.object);
      if (!anchors) { onFail(); return; }
      setLoaded({ stake, anchors }); onReady();
    }).catch(() => { if (alive) onFail(); });
    return () => { alive = false; made?.dispose(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // The ring uses the action colour of the current theme so it stays visible in light and dark.
  const ringColor = useMemo(() => (host.current && getComputedStyle(host.current).getPropertyValue('--action').trim()) || '#2f9e6b', [loaded]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={host} className="stake-guide__canvas">
    {loaded && <Canvas frameloop="demand" dpr={[1, 2]} camera={{ fov: 32, near: 0.01, far: 20 }} gl={{ antialias: true, alpha: true }}>
      <Scene stake={loaded.stake} anchors={loaded.anchors} view={view} nonce={nonce} ringColor={ringColor} label={label} />
    </Canvas>}
  </div>;
}

// 3D drawing of a RootLayer: one InstancedMesh (single draw call) of thin cylinders, at most MAX_SEGMENTS_PER_PLANT × plants
// instances, placed in the vertical plane of the front plant row. Geometry is data from root-model.ts; nothing is random here.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_SEGMENTS_PER_PLANT, type RootLayer } from './root-model';

const CAPACITY = MAX_SEGMENTS_PER_PLANT * 6;
const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Object3D(), a = new THREE.Vector3(), b = new THREE.Vector3(), dir = new THREE.Vector3();
const PRIMARY = new THREE.Color('#efe3c4'), LATERAL = new THREE.Color('#d9c9a3');

export function RootSystem3D({ layer, z }: { layer: RootLayer; z: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { invalidate } = useThree();
  const geom = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 5, 1, false), []);
  useEffect(() => () => geom.dispose(), [geom]);
  useLayoutEffect(() => {
    const m = ref.current!; const n = Math.min(layer.segments.length, CAPACITY);
    for (let i = 0; i < n; i++) {
      const s = layer.segments[i];
      a.set(s.from[0], s.from[1], z); b.set(s.to[0], s.to[1], z);
      dir.subVectors(b, a); const len = dir.length();
      tmp.position.copy(a).addScaledVector(dir, 0.5);
      tmp.quaternion.setFromUnitVectors(UP, len > 0 ? dir.normalize() : UP);
      tmp.scale.set(s.radius, Math.max(len, 1e-4), s.radius);
      tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix); m.setColorAt(i, s.order === 0 ? PRIMARY : LATERAL);
    }
    m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; invalidate();
  }, [layer, z, invalidate]);
  return (
    <group>
      <instancedMesh ref={ref} args={[geom, undefined, CAPACITY]} frustumCulled={false} name="roots"><meshLambertMaterial transparent={layer.source === 'illustrative'} opacity={layer.source === 'illustrative' ? 0.9 : 1} /></instancedMesh>
      {layer.continuesBelow && <mesh position={[0, -layer.drawDepthM - 0.06, z]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.05, 0.1, 6]} /><meshBasicMaterial color="#efe3c4" /></mesh>}
    </group>
  );
}

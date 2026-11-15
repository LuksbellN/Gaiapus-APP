// Loads the Gaiapus stake model on demand (own chunk: GLTFLoader + meshopt decoder + the ~1 MB asset are only
// fetched when a scene actually shows the stake). One download and one parse are shared by every instance.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { LED_MATERIALS, litLedMaterial } from './stake-model';
import type { LedCode } from './profile-model';

// Emitted by Vite as a hashed static asset: no absolute local path at runtime.
const STAKE_URL = new URL('../assets/gaiapus-stake-revG.glb', import.meta.url).href;

let template: Promise<THREE.Group> | null = null;
/** Parsed model shared by all instances. A failed load is not cached, so a later mount can try again. */
export function loadStakeTemplate(url: string = STAKE_URL): Promise<THREE.Group> {
  template ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url).then((gltf) => gltf.scene).catch((e: unknown) => { template = null; throw e; });
  return template;
}

export type StakeInstance = { object: THREE.Group; setLed: (led: LedCode) => void; dispose: () => void };

const DARK = new THREE.Color(0x000000);
/**
 * A scene instance: geometry and ordinary materials are shared with the template; only the three LED lens
 * materials are cloned, because their emissive colour follows this scene's simulated LED code.
 */
export async function createStakeInstance(url?: string): Promise<StakeInstance> {
  const source = await loadStakeTemplate(url);
  const object = source.clone(true);
  const leds = new Map<string, { material: THREE.MeshStandardMaterial; lit: THREE.Color; base: THREE.Color }>();
  object.traverse((o) => {
    const mesh = o as THREE.Mesh; if (!mesh.isMesh) return;
    const m = mesh.material as THREE.MeshStandardMaterial;
    if (!(LED_MATERIALS as readonly string[]).includes(m.name)) return;
    let entry = leds.get(m.name);
    if (!entry) { const material = m.clone(); entry = { material, lit: material.emissive.clone(), base: material.color.clone() }; leds.set(m.name, entry); }
    mesh.material = entry.material;
  });
  return {
    object,
    setLed(led) {
      const on = litLedMaterial(led);
      for (const [name, e] of leds) {
        const lit = name === on;
        e.material.emissive.copy(lit ? e.lit : DARK);
        e.material.color.copy(e.base).multiplyScalar(lit ? 1 : 0.18);
      }
    },
    dispose() { for (const e of leds.values()) e.material.dispose(); },
  };
}

// Web-size build of the Gaiapus stake assembly (rev G) for the simulator scene.
//
// The source model (gaiapus-stake-revG-assembly.glb, ~93 MB, ~3.06 M triangles, 3,085 nodes) is a CAD export
// and is NOT stored in this repository. This script reads it and writes the optimised copy that the app ships:
//   apps/web/src/teammate/assets/gaiapus-stake-revG.glb
// The original file is only read, never modified.
//
// gltf-transform is not a dependency of this workspace (the lockfile is left alone). Run it from a scratch folder:
//   mkdir glb-tools && cd glb-tools && npm init -y
//   npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer
//   node <repo>/apps/web/scripts/optimize-stake-glb.mjs <path>/gaiapus-stake-revG-assembly.glb <repo>/apps/web/src/teammate/assets/gaiapus-stake-revG.glb
// (the imports below resolve from the current working directory's node_modules).
//
// What it does, in order:
//   1. Drops parts that can never be seen or that the scene already provides:
//        - "soil line": a 0.30 m reference plate at ground level; the simulator draws its own soil.
//        - "head PCB", "18650 LiFePO4", "plunger": fully enclosed by the opaque case (base + lid).
//      The probe PCB stays: it is visible through the translucent PVC tube.
//   2. dedup -> flatten -> join (one primitive per material) -> weld -> simplify (meshoptimizer) -> prune.
//   3. Quantises and compresses with EXT_meshopt_compression (decoded by three's bundled MeshoptDecoder).
// Proportions, units (metres), axes (Y up) and materials are untouched: no node is scaled or moved.
import { createRequire } from 'node:module';
import { statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(path.join(process.cwd(), 'noop.js'));
const load = (name) => import(pathToFileURL(require.resolve(name)).href);
const { NodeIO } = await load('@gltf-transform/core');
const { ALL_EXTENSIONS } = await load('@gltf-transform/extensions');
const { dedup, flatten, join, weld, simplify, prune, meshopt, getBounds } = await load('@gltf-transform/functions');
const { MeshoptEncoder, MeshoptSimplifier, MeshoptDecoder } = await load('meshoptimizer');

const [src, dst, ratioArg, errorArg] = process.argv.slice(2);
if (!src || !dst) { console.error('usage: optimize-stake-glb.mjs <source.glb> <output.glb> [ratio=0.06] [error=0.0006]'); process.exit(1); }
/** Target share of triangles kept, and the maximum deviation as a fraction of each mesh's extent. */
const RATIO = Number(ratioArg ?? 0.06), ERROR = Number(errorArg ?? 0.0006);
const REMOVED = ['soil line', 'head PCB', '18650 LiFePO4', 'plunger'];

await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(src);
const root = doc.getRoot();
const scene = root.getDefaultScene() ?? root.listScenes()[0];
const triangles = () => { let t = 0; for (const n of root.listNodes()) { const m = n.getMesh(); if (!m) continue; for (const p of m.listPrimitives()) { const i = p.getIndices(); t += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3; } } return Math.round(t); };
const report = (label) => { const b = getBounds(scene); console.log(label, JSON.stringify({ nodes: root.listNodes().length, meshes: root.listMeshes().length, materials: root.listMaterials().length, triangles: triangles(), min: b.min.map((v) => +v.toFixed(4)), max: b.max.map((v) => +v.toFixed(4)) })); };

report('source     ');
for (const node of root.listNodes()) if (REMOVED.includes(node.getName())) { node.traverse((n) => { if (n !== node) n.dispose(); }); node.dispose(); }
await doc.transform(prune());
report('after drop ');
await doc.transform(
  dedup(),
  flatten(),
  join({ keepNamed: false }),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: ERROR, lockBorder: false }),
  prune(),
  dedup(),
);
report('simplified ');
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(dst, doc);
console.log('settings   ', JSON.stringify({ ratio: RATIO, error: ERROR, removed: REMOVED, compression: 'EXT_meshopt_compression (level medium)' }));
console.log('bytes      ', JSON.stringify({ source: statSync(src).size, output: statSync(dst).size }));

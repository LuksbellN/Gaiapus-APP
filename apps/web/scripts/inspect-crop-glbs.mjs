// Inspection of the 13 crop study models (GLB) delivered with the visual research of 2026-11-15, and of what a
// web-size build of them would cost. The app does NOT ship these files: plants are generated at run time from the
// organ plans in src/teammate/sim/plants (see design/assets-provenance.md for why). This script only measures.
//
// gltf-transform is not a dependency of this workspace (the lockfile is left alone). Run it from a scratch folder:
//   mkdir glb-tools && cd glb-tools && bun init -y
//   bun add @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer
//   node <repo>/apps/web/scripts/inspect-crop-glbs.mjs <folder with the 13 .glb> <output folder for the optimised copies>
// The source files are only read. Same pipeline as optimize-stake-glb.mjs, without simplification:
//   dedup -> flatten -> join (one primitive per material) -> weld -> prune -> quantise + EXT_meshopt_compression.
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(path.join(process.cwd(), 'noop.js'));
const load = (name) => import(pathToFileURL(require.resolve(name)).href);
const { NodeIO } = await load('@gltf-transform/core');
const { ALL_EXTENSIONS } = await load('@gltf-transform/extensions');
const { dedup, flatten, join, weld, prune, meshopt } = await load('@gltf-transform/functions');
const { MeshoptEncoder, MeshoptDecoder } = await load('meshoptimizer');

const [src, dst] = process.argv.slice(2);
if (!src || !dst) { console.error('usage: inspect-crop-glbs.mjs <folder with .glb> <output folder>'); process.exit(1); }
mkdirSync(dst, { recursive: true });
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const measure = (doc) => {
  const root = doc.getRoot(); let triangles = 0, primitives = 0;
  for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) { primitives++; const i = p.getIndices(); triangles += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
  return { nodes: root.listNodes().length, meshes: root.listMeshes().length, primitives, materials: root.listMaterials().length, textures: root.listTextures().length, triangles: Math.round(triangles) };
};
const rows = []; let before = 0, after = 0;
for (const file of readdirSync(src).filter((f) => f.endsWith('.glb')).sort()) {
  const from = path.join(src, file), to = path.join(dst, file);
  const doc = await io.read(from); const a = measure(doc);
  await doc.transform(dedup(), flatten(), join({ keepNamed: false }), weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(to, doc); const b = measure(await io.read(to));
  const bytesA = statSync(from).size, bytesB = statSync(to).size; before += bytesA; after += bytesB;
  rows.push({ file, bytes: bytesA, nodes: a.nodes, drawCalls: a.primitives, materials: a.materials, textures: a.textures, triangles: a.triangles, optBytes: bytesB, optDrawCalls: b.primitives, optTriangles: b.triangles });
}
console.table(rows);
console.log(JSON.stringify({ files: rows.length, bytesBefore: before, bytesAfter: after, trianglesMax: Math.max(...rows.map((r) => r.triangles)), drawCallsMax: Math.max(...rows.map((r) => r.drawCalls)), optDrawCallsMax: Math.max(...rows.map((r) => r.optDrawCalls)) }));

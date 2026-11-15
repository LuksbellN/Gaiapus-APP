# Frontend illustration provenance

## Illustrated Earth

- File: `public/art/illustrated-earth.png`.
- Tool: built-in `image_gen.imagegen`, transparent background requested.
- Reference: original user-supplied AgroClima screenshot, 2026-11-14.
- Role: decorative Earth/weather illustration; not a scientific map, satellite acquisition, or current weather layer.
- Generated source retained in the session's generated-images folder. No image slicing or reconstruction of the dashboard screenshot was used.

Exact prompt:

Create a single ISOLATED transparent-background illustrated Earth asset for the center of the attached agricultural climate dashboard. Reference image supplies the desired aesthetic. Preserve that colorful illustrated/pixel-inspired geography feeling: deep cobalt blue oceans, rich green continents, warm tan land, soft icy poles, vivid cyan atmospheric rim, puffy cloud clusters and small decorative rain streaks around some clouds. Show South America and Brazil prominently in front with North America upper left and Africa at right. Artistic semi-pixel / high-quality game illustration with soft painterly transitions, NOT photorealistic, NOT a flat monochrome teal sphere, NOT a wireframe. All of the circular globe and its attached peripheral clouds must fit inside a square with a little breathing room. The attached clouds are atmospheric illustration, not a scientific forecast. No text, no labels, no flags, no country border highlight, no UI, no star background, no black square, no watermark. True transparent alpha outside the globe and clouds. This will be layered in a real HTML/CSS dark-navy dashboard matching the supplied reference.

## Farm landscape

- File: `public/art/farm-landscape.png`.
- Tool: built-in `image_gen.imagegen`, transparent background requested.
- Reference: same original user-supplied AgroClima screenshot.
- Role: quiet agricultural atmospheric background, without scientific or ownership meaning.

Exact prompt:

Create one decorative panoramic pixel-inspired agricultural landscape asset for the bottom background of a dark navy climate dashboard. Match the attached reference's little farm illustration: rows of green crops in perspective, dark blue hills, a small red barn, narrow silo and a windmill toward the left. Refined colorful pixel-art/game illustration, cobalt night ambience, greens and warm earthy crops, no photorealism. Landscape band with the farmhouse in the far-left third and flowing crop rows/hills to the right. Transparent sky above the horizon with true alpha, no stars in the asset, no globe, no text, no icons, no UI. The illustration must read as a quiet atmospheric footer decoration, not scientific evidence. Wide horizontal composition.

## Brand and geography

- `public/brand/gaiapus-logo.jpg`: original user asset from `Docs/logo gaiapus.jpg`, copied without alteration.
- `public/art/brazil.geojson` and `states.geojson`: reused from the existing `.sources/science/gaiapus-mvp/data` prototype. The shared publication records the pinned source revision; source repository is https://github.com/LeandroJerse/Gaiapus_nasa.
- UI icons: Lucide React, one consistent outline family.
- Fonts: local Fontsource Manrope and Source Sans 3.


## Gaiapus stake model

- `src/teammate/assets/gaiapus-stake-revG.glb`: web-size copy of the user's CAD assembly `gaiapus-stake-revG-assembly.glb` (93,004,744 bytes, 3,056,748 triangles; not stored in this repository, never modified). Produced by `scripts/optimize-stake-glb.mjs` with glTF-Transform 4.5.1 and meshoptimizer 1.3.0: parts hidden inside the opaque case and the "soil line" reference plate removed, then dedup, flatten, join, weld, simplify (ratio 0.06, error 0.0006), meshopt compression. Result: 1,068,300 bytes, 184,373 triangles, 23 nodes, no textures; units (metres), axes (Y up), proportions and material values unchanged. Details in `Docs/sensores-talhoes/README.md`.

## Crop plants of the simulator and of the demonstration board (visual refresh, 2026-11-15)

- **What ships:** no model file. Plants are built at run time from organ plans written for this project in
  `src/teammate/sim/plants/` (`soy.ts`, `maize.ts`, `grass.ts`, `bean.ts`, `rice.ts`, `wheat.ts`, `coffee.ts`): plain
  data (stems, leaf blades, pods, ears, panicles, fruits) turned into one merged, vertex-coloured geometry per plant by
  `mesh.ts` (three.js, lazy chunk). No texture, no third-party mesh, nothing downloaded. Licence: the repository's own.
- **Why not the 13 GLB studies:** the research package `docs/frontend-claude/visual-refresh-2026-11-15/prototypes/`
  (repository `ideias_nasa`, read only) delivered 13 static poses (5 soybean, 5 maize, 3 brachiaria) and their generator
  `crop-models.mjs`. They were the starting point for the organ vocabulary and proportions, and were NOT copied into this
  repository, because: (a) poses have different topologies, so growth inside a phase cannot be interpolated between files;
  (b) the brief asks for an intermediate senescence pose and for organ-by-organ transitions that static files do not have;
  (c) each file is one mesh per organ (up to 75 draw calls for one plant); (d) the review of the studies asked for a denser
  soybean canopy, a readable lateral ear, irregular straw and levels of detail. The generator's idea (segments, curved
  laminae, ellipsoids, closed pods) was ported to strict TypeScript and extended.
- **Inspection of the studies** (`scripts/inspect-crop-glbs.mjs`, glTF-Transform 4.5.1 + meshoptimizer 1.3.0, run from a
  scratch folder; pipeline dedup → flatten → join → weld → prune → meshopt "medium", no simplification; sources only read):

  | File | Bytes | Draw calls | Triangles | Optimised bytes | Optimised draw calls |
  | --- | ---: | ---: | ---: | ---: | ---: |
  | brachiaria-emergence.glb | 24,492 | 12 | 384 | 7,640 | 2 |
  | brachiaria-residue.glb | 73,288 | 36 | 1,152 | 15,200 | 2 |
  | brachiaria-vegetative.glb | 73,208 | 36 | 1,152 | 15,956 | 2 |
  | maize-emergence.glb | 8,484 | 4 | 128 | 4,664 | 2 |
  | maize-flowering.glb | 162,732 | 56 | 3,200 | 37,576 | 5 |
  | maize-fruiting.glb | 162,424 | 56 | 3,200 | 37,528 | 5 |
  | maize-maturation.glb | 162,468 | 56 | 3,200 | 36,012 | 4 |
  | maize-vegetative.glb | 39,472 | 15 | 832 | 10,956 | 2 |
  | soy-emergence.glb | 13,272 | 5 | 252 | 6,852 | 3 |
  | soy-flowering.glb | 168,708 | 69 | 2,988 | 35,596 | 4 |
  | soy-fruiting.glb | 181,300 | 75 | 3,516 | 36,796 | 4 |
  | soy-maturation.glb | 100,252 | 35 | 2,236 | 23,228 | 4 |
  | soy-vegetative.glb | 43,408 | 21 | 660 | 11,836 | 3 |
  | **Total (13 files)** | **1,213,508** | — | — | **279,840** | — |

  Triangles are unchanged by this pipeline (no simplification); no file has textures. Even optimised, a 3,516-triangle
  plant cannot be repeated 540 times (about 1.9 million triangles): the field needs its own level of detail.
- **Triangles of the plants that ship** (largest count of each level among the board poses, variant 0, `triangles(meshPlan(plan, level))`, shown live on `/design-preview`):

  | Archetype | Detail | Field | Far (phones) | Where |
  | --- | ---: | ---: | ---: | --- |
  | Soybean | 3,456 | 522 | 174 | simulator scene + board |
  | Maize (1st and 2nd season) | 2,314 | 184 | 72 | simulator scene + board |
  | Brachiaria cover (alone, with maize) and straw residue | 1,188 | 208 | 90 | cover: scene + board; straw: board only |
  | Common bean (demonstration profile) | 1,488 | 264 | 138 | board only |
  | Rice | 3,324 | 624 | 226 | board only |
  | Wheat | 3,492 | 552 | 114 | board only |
  | Arabica coffee (adult) | 5,652 | 1,374 | 426 | board only |
  | Conilon coffee (adult) | 5,328 | 1,336 | 472 | board only |

- **Botanical references** used for the organ sequence per stage are listed in the research document
  `research-botany.md` of the same package (Embrapa, IAC/Bragantia, Incaper, UFRRJ, IRRI, PhilRice and university
  extension pages). Photographs and diagrams of those sources were consulted, never copied as textures or meshes.
  Sizes, dates, densities and numbers of organs are artistic parameters, not agronomic recommendations; nothing here was
  validated by an agronomist or against a cultivar.
- **External assets considered and not used:** the ten candidates of `research-assets.md` (Quaternius Ultimate Crops
  Pack CC0, Sketchfab maize and coffee tree CC-BY, paid models on TurboSquid, Free3D, ArtStation, Fab, itch.io). None was
  downloaded, bought or integrated: licences were partly unconfirmed and none provides the stage sequence required.

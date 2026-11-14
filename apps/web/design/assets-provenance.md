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


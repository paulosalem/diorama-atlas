# Browser engine study

An isolated, local comparison of the existing Three.js Marrakech courtyard and
Douro Valley vineyard with Babylon.js, PlayCanvas and an actual Unity URP Web
player. The original builders remain the baseline. The folder name is retained
to reuse the Unity project and its compiler caches, not as a separate
implementation for each place.

## Run

From the repository root, install the atlas dependencies with `npm ci`, then:

```sh
npm ci --prefix experiments/marrakech
npm start --prefix experiments/marrakech
```

In another terminal:

```sh
npm run export --prefix experiments/marrakech
npm run build:unity --prefix experiments/marrakech
# The same programs, with the outdoor configuration:
npm run export --prefix experiments/marrakech -- --scene douro
npm run build:unity --prefix experiments/marrakech -- --scene douro
```

Open **http://127.0.0.1:4307/lab/**. The server binds to loopback and explicitly
disables the atlas's optional paid generation services. `PORT` changes its port;
set `ATLAS_URL` on export and inspection commands when using another port.
Choose **Douro Valley** in the Place selector, or open
**http://127.0.0.1:4307/lab/?scene=douro** directly.

### The holdable Douro miniature

The separate Babylon experiment is at
**http://127.0.0.1:4307/lab/miniature.html**. It does not replace the original
vineyard or change the four-engine comparison. The same authored miniature is available
in the main Atlas at `/?scene=douro-vineyard&version=miniature`, beside the
grounded **Landscape** experience, now rendered directly in **Three.js**.
The historical Babylon renderer and cross-engine exporter live in this
experiment's `web/rendering/` directory. They use this experiment's dependencies;
the main app neither loads Babylon nor requires an export or experimental server.

```sh
node experiments/marrakech/export.mjs --scene douro-miniature
node experiments/marrakech/check-miniature.mjs
```

Its two 30-metre-wide floating slices retain the quinta, furnishings, real apertures,
grape foliage, individual fruit, dry-stone construction and the four original
eye-level cameras. Three terraced flights lead toward a small river landing.
The opposite bank rises through four planted terraces into rounded hills with
irregular groves, shrubs, herb flowers and photographic grass. Ground pigment
follows the same planting patches, leaving a worn contour path clear.
A 2.4-metre air gap divides the two river halves; both sections rotate
together. Each has a closed underside and geological faces exposing thin soil,
schist, quartz veins and branching roots. The compressed hills, geology and river
bend are interpretations, not a surveyed location.
The boat has an open, ribbed hull rather than a dark surface on a solid object.
A harvest corner beside the quinta adds a timber pergola, gently moving linen,
a planked table and bench, woven baskets with real cavities, individual grapes,
two ceramic cups, a notebook, rumpled cloth, planted pots and worn paving.
The working yard adds a car, bicycle, wheelbarrow, tool rack, harvest crates,
grass patches and gravel. A supported riverside railway on the opposite bank
carries a detailed red-and-cream regional railcar, with glazing, seats, bogies,
sleepers, rail fastenings and loose ballast. It is an imagined line, not a
reconstruction of a real train or surveyed route.

The whole-piece, river, underground and opposite-hills views use native Babylon orbit controls;
the four original focused views, harvest corner, working yard and railway retain in-place
looking, for eleven viewpoints in total. Drag or use arrow keys on
the canvas, scroll/pinch to zoom the object, and return to the whole miniature
at any time. A view can be linked with `?view=geology`, for example.

Lighting uses a local HDR environment, a warm directional source, filtered
shadows, ambient occlusion, a planar river reflection and restrained bloom.
Native GPU instances preserve foliage and stone detail. Native grape, broadleaf
and grass wind, river movement, the floating boat and the imported linen morph
animation all respect the motion control and reduced-motion preference.
The bounded export keeps the highest
authored geometry levels throughout, since users can orbit beyond named views.
Overview framing fits the actual geometry bounds on desktop and compact screens.
Shadows use native PCF filtering. Static views reuse their shadow and reflection
maps; movement refreshes these at 10 Hz, and camera changes refresh reflections
immediately. No foliage, fruit or geological detail is removed for this optimization.
The moving hull also masks the river shader, keeping water out of the open boat.

English and Brazilian Portuguese text share the atlas language preference.
Narration uses the browser's available voice, explicitly disclosed in the
interface; no new voice recording or paid provider request is made. It starts
only on request and stops when the view changes or the page becomes hidden.
Local recorded nature sounds also start off, duck during narration, stop when
hidden, and release their audio graph on mute or disposal. Reduced motion
freezes environmental movement.

The inspection command saves desktop and compact views, the four exact
1280 × 900 original eye-level views, the new harvest corner, underground and
whole-object captures, aperture
measurements, interaction/audio/disposal checks, and separate same-camera
Babylon performance samples for the miniature and original valley. Use
`--output <directory>` to keep a distinct run. `--capture-only` skips audio and
motion exercise, not the geometry and interaction checks. Generated evidence
belongs under `outputs/miniature-douro/`; it is not an aesthetic approval.
The checker exercises actual decoded ambient audio. Narration dispatch uses a
mock browser speech endpoint; hidden-page handling uses synthetic visibility
events. It also checks native leaf-wind coverage, the linen's actual morph
weights while moving and paused, and the empty harvest basket's cavity.
These checks do not establish audible voice quality or an operating-system
backgrounding result.

The 2026-11-03 greenery-and-harvest pass on Apple M2 measured 14.0 FPS for the
miniature and 15.2 FPS for the original Babylon valley in sequential,
independent runs at the same paused 1280 × 900 arrival camera. The earlier,
sparser two-piece run measured 17.7 FPS for the miniature and 8.4 FPS for the
original valley; the variation also cautions against ranking engines from one
local sample. The richer scene now contains 250,639 instances and approximately
97 MiB of exported geometry and embedded textures, up from 176,843 and 78 MiB.
This is a substantial experiment, not a mobile performance guarantee.
Matched before images and source are in `outputs/miniature-douro/cozy-before/`;
the final render, motion, geometry and timing report is in
`outputs/miniature-douro/cozy-final/`.
The Copilot app's embedded browser also loads the scene, but its moving overview
was much slower on this machine (approximately 2 FPS). That is not a matched
benchmark; use a regular Chromium browser for evaluating the current experiment.

Unity requires an activated Editor with Web Build Support. The build command
uses the recorded project version in the standard macOS Unity Hub installation;
on other installations, set `UNITY_EDITOR` to the Editor executable. It uses
Unity's batch interface, glTFast's editor importer and the native Web build
pipeline, not a JavaScript imitation of Unity. The first compilation is much
slower than subsequent builds.

The exported geometry, embedded textures, Unity caches and compiled player are
generated locally and ignored by Git. Keep adequate disk space for Unity's
import and compiler caches. Rebuild them using the commands above rather than
checking these large artifacts into the atlas.

## What is compared

All four windows use the original camera positions, targets and fields of
view, the full-scale architecture, furnished connected rooms, real openings,
carved joinery and detailed everyday objects. The baseline uses the original
viewer and renderer directly; only its surrounding interface and animation clock
are adapted to the comparison. The native ports import the same geometry and PBR
textures into their own rendering engines.
Marrakech has six matched viewpoints; Douro has four: arrival, close vines,
terrace steps and the quinta interior.

The ports are deliberately not pixel-identical. Engine-specific light units,
tone mapping, shadowing and reflection models require independent tuning:

| Version    | Rendering treatment                                                                                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current    | Existing Three.js pipeline, patina, contact shadows, reflections and atmosphere                                                                                                                       |
| Babylon.js | HDR image-based lighting, PCF shadows, SSAO, ACES, bloom, planar fountain reflections, native steam particles and imported linen morph animation                                                      |
| PlayCanvas | Filtered HDR lighting, a courtyard-local reflection capture, cascaded PCF shadows, CameraFrame SSAO/ACES/bloom, native steam particles, fountain normal-map motion and imported linen morph animation |
| Unity      | Native URP, linear lighting, HDR sky, soft sun shadows, SSAO, local reflection probe, custom Fresnel water shader, ACES/bloom, native steam particles and Animator linen animation                    |

The table describes Marrakech. Outdoors, Babylon uses cascaded shadows, native
leaf wind and translucency, and a planar river reflection. PlayCanvas uses
native instancing, anchored leaf wind and a separate, clipped reflection camera
with the atlas's shared advected-water shader. Unity uses bounded GPU-instance
draws, view/reflection frustum culling, native wind, outdoor bounce lighting and
a clipped planar river camera. Its water shader uses the same anti-aliased wave
function translated to HLSL. Frozen PlayCanvas and Unity reflection views are
reused until the camera or motion clock changes; geometry is not removed to
achieve that optimization.

These are real-time browser renders, not prerecorded videos or cloud streaming.
The original custom shaders are not carried by glTF alone. The export preserves
per-piece variation and the exact aging parameters for all eligible materials
(36 in Marrakech, 22 in Douro).
Babylon and PlayCanvas run the shared metre-scaled aging masks in their native PBR
shaders. Unity receives generated Shader Graph extensions using the same masks,
translated to HLSL, while retaining glTFast's original texture, normal and
clearcoat processing. These include plaster wear, cracks, wood marks, clay
variation, fabric fading, metal oxidation, roughness variation and fine relief.
Artwork, foliage, glass and luminous surfaces remain protected.
Babylon and Unity specialize shaders by material profile, so a wooden surface
does not evaluate the plaster, stone and metal treatments. Per-material seeds
remain independent when programs are cached. Unity persists repaired tangent
frames as generated mesh assets so its native build cannot discard them.

Texture filtering and the original renderer's stochastic scan resampling still
differ between engines. This comparison uses each engine's own lighting,
reflections and post-processing rather than claiming pixel-identical rendering.
Exports combine separate alpha masks with base-color textures, preserving
irregular surface-wear edges in native engines rather than exporting opaque
rectangles. Such patches retain their local UVs instead of repeating their
mask in world space; unsupported transformed mask UVs fail explicitly.

### Douro export and collection integration

The original unfinished Douro draft was recovered from Git snapshot `69cb463`.
It is now a released destination in the main collection and static build, with
Landscape and Miniature experiences. Open `/?scene=douro-vineyard&inspect=1`
for the grounded view. Neither narration generation nor paid asset generation
is used by this study.

The outdoor export retains 569,741 instances in 1,024 authored groups instead of
expanding them into individual imported objects. `instances.bin` stores
column-major world matrices and linear RGBA colors; the manifest records strict
byte ranges and spatial bounds. Babylon uses thin instances, PlayCanvas uses
interleaved native instance buffers, and Unity submits bounded batches of at
most 1,023 instances. Unity mirrors X to match glTFast's coordinate convention.

Native ports use the highest authored LOD needed by any matched viewpoint,
without overlapping near and far levels. The original Three.js viewer retains
its dynamic LOD selection. GPU-rendered distant foliage projections are baked
from the original local geometry, not substituted with generated landscapes.
Physical-scale material projection and luminance-normalized scanned pigment
are exported explicitly because glTF alone cannot preserve their shader hooks.
The original broad material variation and stochastic filtering are not
pixel-identical in the native renderers.

There are no newly sourced characters, purchased assets or uncredited models.
All architectural assets, scanned materials and sound recordings retain the
repository's [existing provenance](../../docs/assets.md). The additional sky
comes from the already bundled, credited outdoor daylight collection.

## Evaluation

Use the common viewpoint controls for matched framing and **Open alone** for
full-size inspection. Four simultaneous engines compete for the same GPU, so
their in-grid frame rates are not independent benchmarks. Unity reports its
actual player frame rate through a native Web bridge, not the JavaScript wrapper's
animation-loop frequency. PlayCanvas and the current viewer likewise report
their own rendering measurements.

Motion follows reduced-motion preferences and can be paused. Sound is shared
across the comparison, starts off, can be muted, and stops when the document is
hidden. The comparison intentionally does not inherit remembered atlas audio
consent. Reloading starts silent again.

```sh
npm run check --prefix experiments/marrakech
npm run check --prefix experiments/marrakech -- --scene douro
# Narrow an iteration without rebuilding or exercising unrelated renderers:
npm run check --prefix experiments/marrakech -- --engines babylon,playcanvas --output ../../outputs/engine-comparison/iteration
npm run check
npm run test:browser
```

The experiment check opens each engine separately, captures every matched viewpoint
and a compact layout, checks browser errors and the presence of architecture and
native animations, rejects an empty or black courtyard render, checks Babylon's
compiled material profiles, exercises actual animation advance/freeze, reduced-motion
changes, disposal, shared navigation, and audio opt-in/mute/hidden-page handling.
It saves evidence in
`outputs/engine-comparison/inspection/` for Marrakech, or
`outputs/engine-comparison/douro-vineyard/inspection/` for Douro.
`report.json` records actual readiness
time and eight frame-rate samples per engine, taken separately at the same
1280 × 900 default view with motion paused. These measurements depend on the
device and other running applications; run without a simultaneous Unity build.

The 2026-11-02 Douro run on Apple M2, with each renderer loaded independently
after Unity compilation finished, recorded median arrival-view rates of
25.1 FPS (Three.js), 14.5 (Babylon), 17.0 (PlayCanvas) and 1.4 (Unity).
Unity's port is functional but its current browser performance is not suitable
for production. These measurements describe these implementations, not the
engines' performance ceilings. Reduced haze and stronger lighting improve
contrast; they do not remove the original landscape's repeated planting forms
or substitute for better terrain and vegetation assets.

The untouched source archive and original six screenshots are preserved under
`outputs/engine-comparison/`. Douro has its own source archive and four original
screenshots under `outputs/engine-comparison/douro-vineyard/`.
Visual realism remains a human judgement. An engine
port and a successful build do not establish photorealism or the maximum quality
achievable with that engine.

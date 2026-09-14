# Outdoor collection

Ten anonymous, culturally grounded outdoor settings extend the atlas. These are
original fictional places, not attempted replicas of landmarks or real businesses.
Regional traditions guide construction, proportions, materials, ordinary objects
and atmosphere; they do not prescribe an exact photographed layout.

The map locates each setting's **region of inspiration**, not a fictional street
address. The globe preview and scene header identify the places as imagined.
Existing indoor environments remain separate and unchanged in construction.

## Settings

| Imagined environment            | Regional inspiration    | Scene identifier             |
| ------------------------------- | ----------------------- | ---------------------------- |
| Newar Potters' Square           | Kathmandu Valley, Nepal | `newar-potters-square`       |
| Central Asian Madrasa Courtyard | Uzbekistan              | `central-asian-madrasa`      |
| Balinese Subak Terraces         | Bali, Indonesia         | `balinese-subak-terraces`    |
| Venetian Boatyard Canal         | Venetian Lagoon, Italy  | `venetian-boatyard`          |
| Bahian Neighborhood Square      | Bahia, Brazil           | `bahian-neighborhood-square` |
| Andean Stone Lane               | Andean highlands, Peru  | `andean-stone-lane`          |
| Swahili Coastal Verandah        | Swahili coast, Tanzania | `swahili-verandah`           |
| Naxi Canal Quarter              | Yunnan, China           | `naxi-canal-quarter`         |
| Tunisian Terrace Café           | Tunisian coast          | `tunisian-terrace-cafe`      |
| Lao Temple Court                | Northern Laos           | `lao-temple-court`           |

Open an environment with `/?scene=IDENTIFIER&inspect=1`. The optional `view`
parameter selects a named viewpoint. For local rendering diagnostics, dynamically
import `getActiveViewer()` from `/src/client/viewer/panorama-viewer.js` inside an
asynchronous browser evaluation. The controller exposes `runtime`, `camera`,
`renderer`, `scene`, `selectView(key)`, `lookAt(point)`, `elapsed`,
`frameDurations` and `dispose`; there is no window-global inspection alias.

Each setting has four walking-scale viewpoints, full look-around controls,
four detail annotations, opt-in recorded ambience and attributed photographic
style references. Outdoor zoom extends to an 18-degree vertical field of view;
the interior zoom range is unchanged.

## Art direction

Build coherent places rather than collections of recognizable landmarks. Their
charm comes from plausible daily life: a paused pottery task, a shaded tea table,
a welcoming doorway, a small garden, tools under repair, or sunlight crossing
well-used paving. Materials and architectural proportions remain locally
grounded. Avoid decorative clutter, exaggerated decay, branded businesses,
invented sacred inscriptions and generic cultural stereotypes.

Photographs are evidence of the source traditions, not photographs of the
fictional settings. Their actual locations, dates, authors and licenses remain
accurate in `public/outdoors/references.json`. Source names may therefore appear
in photo attribution, but not as the identity or address of a modeled scene.
Original generated prop artwork is identified separately from documentary
photographs. The first such asset is the illustrated _Field Notes_ cover,
generated with GPT Image 2.5 Sunburst at maximum quality. Its prompt, exact model,
usage and image hash are recorded in `public/outdoors/generated/manifest.json`.
Good licensed downloads are preferred to additional generation.

Generic scanned material channels and the outdoor HDR environment are stored
locally, with provenance in `public/outdoors/materials/manifest.json`. They are
not scans of the buildings in the source photographs. Reference photographs
are displayed with attribution, not pasted onto geometry.

The **About & credits** box is available from both the globe and scene headers.
It collects source photographs, scanned materials, Earth imagery, software,
generated-art provenance and all eleven licensed audio assets, with a searchable
list and links to source pages. Audio attribution, processing history, source
rights and verified file hashes are retained in `public/audio/manifest.json`.
Run `npm run build:credits` after publishing new asset manifests.

## Rendering

Dedicated builders in `src/client/environments/outdoors/` share
`outdoor-kit.js`, which extends the existing
environment construction tools. It supplies local material scans, metre-scale
geometry, configured directional shadows, calibrated sky fill and instanced
foliage. `outdoor-daylight.js` uses a licensed photographic PureSky HDRI,
aligning its sun with the scene's intended azimuth; terrain and buildings remain
actual 3D geometry. Outdoor rendering uses AgX without decorative bloom.
`outdoor-water.js` supplies angle-dependent tinted
planar reflections and subtle world-space ripples.
`outdoor-material-scale.js` keeps photographic grain at physical scale on
shared and instanced geometry, with restrained broad surface variation.
`src/client/environments/shared/paper-props.js` supplies image-textured books and gently curled prints,
keeping the printed artwork separate from the actual paper geometry.

Static geometry is merged by material; instanced and animated geometry remains
independent. Rendering and asset loading do not require an image-generation
service. The global **Soundscape** panel controls opt-in local audio through the
shared controller: recorded ambience and music can be enabled and mixed
independently. Inspect the audio state with `getAtlasAudio()` from
`/src/client/main.js`. Each outdoor scene has an explicitly selected profile:
licensed recorded birds, with sparse paper-handling, workshop or café events
where appropriate. These illustrative recordings do not establish local species,
regional authenticity or a recording location within the imagined setting.
Outdoor profiles contain no generated ambient effects and do not present
unrelated recordings as ocean or water sounds. See
[Soundscapes](soundscapes.md) for playback and persistence behavior.

This remains authored real-time 3D, not photogrammetry or a claim of perfect
photographic realism. Human judgement of beauty, atmosphere and cultural
coherence is separate from mechanical checks.

## Reproduce the review

Run `npm start`, `npm test`, then `npm run test:outdoors`.
The browser check requires Playwright's full Chromium installation
(`npx playwright install chromium`), using accelerated Chromium on macOS.
Individual scene identifiers can be supplied after `npm run test:outdoors --`.

The check visits all ten settings and their forty viewpoints, captures the
surroundings behind each arrival, and verifies geometry, directional-shadow
projection, sky-fill calibration, details, reference panels, zoom limits,
opt-in audio, globe entry, a narrow viewport and two existing interiors.

Results go to `outputs/outdoor-review/validation.json`; a complete run has
`scope: "complete-collection"`. The script publishes actual rendered previews
under `public/outdoors/previews/` and builds
`/outputs/outdoor-review/index.html`. Preview images are renderer captures,
not photographs or generated concept images.

`node scripts/fetch-outdoor-assets.mjs --verify` checks the locally stored source
package. The acquisition command uses the manifests and requires curl and
macOS sips for photographic resizing and verification.

The gallery stages the collection for a human visual walkthrough. The requested
three additional comprehensive inspections use the independent non-author
review in `agentic-tests/outdoors/`, with fresh captures on immutable app
snapshots and fixes between passes. Every pass records every criterion for each
of the ten settings. A failed photographic-read judgement must remain a failure,
even when the functional checks pass.

The three historical completed reviews and comparison report are available at
`/outputs/agentic-tests/2026-09-14/index.html`: 30 setting inspections and
300 criterion judgements, with fresh rendered evidence. The final photographic
read remains **0/10 pass**. These are detailed real-time environments, but they
must not be described as indistinguishable from photographs. A bench-support
artifact found in the last Naxi inspection was subsequently repaired and checked;
the original review findings remain unchanged.

Those reviews describe their preserved application snapshots, not a fresh
assessment of the organized source tree or shared audio controller. Migration,
passing functional checks and updated previews do not supersede their findings.

For a new independent review, create a separate snapshot:

```sh
node scripts/snapshot-outdoor-review.mjs --snapshot-dir outputs/agentic-tests/new-review/application
cd outputs/agentic-tests/new-review/application
ATLAS_CACHE_DIR=.cache PORT=4185 node src/server/index.mjs
```

The snapshot copies canonical `src/` (including the server), scripts, tests,
documentation, bundled scene data, public assets, installed dependencies and
local scene caches. It records source hashes, rejects concurrent source changes
and makes the copied source files read-only. Dependencies are copied, not linked
back to the author workspace. Keep reviewer evidence outside the application
snapshot and stop only the server process started for that pass. Select and run
the independent rubric as described in [the agentic suite](../agentic-tests/README.md).

## Atlas-wide surface patina

The later surface update applies to all 22 atlas entries, including the existing
interiors. `src/client/environments/shared/surface-patina.js` uses distinct mineral, timber, ceramic, metal,
textile and leather treatments: localized fractures, finish loss, uneven fading,
handling marks and changes in roughness. Transparent surfaces, foliage and
printed artwork are protected.

`src/client/environments/shared/surface-variation.js` preserves a deterministic identity for individual boards,
stones and other pieces through geometry batching. Their tone and reflectivity
vary independently. Unstructured scanned grain uses coordinated stochastic
sampling across diffuse, normal and roughness maps; authored tile patterns and
model texture atlases are not scrambled. This reduces repetition without making
construction arbitrarily crooked.
Plain terracotta floors additionally choose between the scan's individual tile
images, keeping grout aligned while varying the actual photographed surface of
each tile. Decorative motifs remain intact.

Before/after evidence is at `/outputs/patina/index.html`. Reproduce it with
`node scripts/capture-patina.mjs before`, then `after` following a surface change,
and `node scripts/build-patina-comparison.mjs`. These comparisons are separate
from the earlier three photographic-realism reviews.

## Water and printed details

`src/client/environments/shared/water-flow.js` supplies coherent advected wave fields and analytic slopes for
outdoor reflections and courtyard water. Different scales move at different
rates; unresolved detail fades with distance. Fountain impacts and caustics are
localized and irregular rather than imposing identical rings across a surface.
The Naxi waterline light uses the same noise family rather than regular sine
stripes.

`src/client/environments/shared/print-catalog.js` describes original fictional layouts made from attributed
botanical plates and collected artwork. `npm run build:prints` produces local
image assets for covers, backs, spines, open pages, container labels, drawer
cards, record sleeves and appropriate wall prints. No image-generation service
is called. The maintenance builder uses Pillow and the local macOS Georgia/Arial
fonts; the running app only needs the published images.

Container labels conform to their bottle or jar surfaces. Printed artwork is
protected from the general patina shader, while its physical paper, binding and
surrounding objects retain their material treatment. Source rights and original
layout provenance appear in About & credits; refresh it with
`npm run build:credits` after rebuilding the library.

Run `npm run test:water-prints` to load every atlas scene, verify actual image
materials, and capture printed details and time-separated water views. The
resulting study is at `/outputs/water-prints/index.html`. It is a targeted
improvement record, not a replacement for the earlier photographic-read reviews.
After all scene checks pass, this command publishes the actual arrival renders
and refreshes `public/previews/credits.json` for all twelve interiors, including
the riad. The manifest distinguishes the 1440 × 1000 browser viewport from each
actual `#canvasMount` crop and records PNG dimensions, hashes and reduced-motion
capture settings. Superseded generated-preview descriptions remain history,
not claims about the current rendered previews.

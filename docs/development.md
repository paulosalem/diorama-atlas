# Development

Start with [the philosophy](philosophy.md), [quality standard](diorama-standard.md)
and the affected [scene briefs](scenes/README.md). Technical checks support that
direction; they do not replace it.

## Local setup

Use Node.js **22.13+ on 22.x, or 24+** and npm. `.nvmrc` selects the maintained
development line.

```sh
nvm use                    # Optional, if nvm is installed
npm ci
npx playwright install chromium # Required for browser checks, not startup
npm start                  # http://127.0.0.1:4183
npm run dev                # Alternative: restart on imported server-source changes
```

Set `PORT=4300` to choose another port. The server binds to loopback.
Browser source uses native JavaScript ES modules and an import map: refresh
after changes; there is no frontend compilation or hot-module replacement.
All experiences render their authored Three.js geometry directly. Startup and
static publication require neither scene exports nor a headless browser.

For the exact static hosting arrangement:

```sh
npm run build:pages
npm run preview:pages       # http://127.0.0.1:4196/diorama-atlas/
```

The bundled app needs no key, database or generated cache. See
[deployment](deployment.md) before publishing.

## Repository map

| Path                                 | Responsibility                                                   |
| ------------------------------------ | ---------------------------------------------------------------- |
| `src/client/catalog/`                | Place definitions, saved-place loading and geography             |
| `src/client/world/`                  | Earth, markers, miniatures and previews                          |
| `src/client/viewer/`                 | Rendering, viewpoints, narration, controls and credits           |
| `src/client/environments/shared/`    | Reusable geometry, materials, print, water and audio mechanisms  |
| `src/client/environments/riad/`      | Marrakech's dedicated environment                                |
| `src/client/environments/interiors/` | Six room families, depth, props and everyday activity            |
| `src/client/environments/outdoors/`  | Dedicated outdoor compositions and shared outdoor helpers        |
| `src/client/localization/`           | Global language state and presentation dictionaries              |
| `src/client/rendering/`              | Three.js Miniature presentation, cameras and geometry inspection |
| `src/server/`                        | Local HTTP, saved scenes and optional provider operations        |
| `data/scenes/`                       | Seven versioned saved packages, including distinct variants      |
| `public/`                            | Approved runtime assets, previews and provenance                 |
| `scripts/`, `tests/`                 | Maintenance, captures and regression checks                      |
| `docs/`, `.github/skills/`           | Human and agent development guidance                             |

Six curated definitions, seven saved interiors and eleven outdoor definitions
form the 24-scene collection. Preserve unique IDs and saved-package provenance.

Unfinished entries are explicitly marked `draft: true` and excluded
from the bundled collection. Opt in locally with `&draft=1` on a scene URL;
the header identifies the preview, and static hosting rejects this option.
Draft scripts do not count as completed recordings. Promotion removes the
flag only after narration, cultural/visual review and all release checks pass.
Related variants are deliberate entries, not duplicate files to delete.

The [Roman domus](scenes/roman-domus.md) uses a dedicated interior builder
under `src/client/environments/domus/`. Open
`?scene=roman-domus&inspect=1`; use W/A/S/D or the on-screen directional
pad to walk, and drag or use arrow keys to look. Named viewpoints remain available.
Its shared walking helper uses body-clearance tests and substepped wall sliding;
architectural footprints also prevent detail markers appearing through walls.
Reduced motion stops scenery, not walking. `tests/browser/domus.spec.js` checks
physical connectivity, controls, public navigation, compact layouts and localization.
Inspect its recorded narration with `node scripts/check-narration.mjs
--scene roman-domus --base-url http://127.0.0.1:4183`.

Append `&version=miniature` for its peer miniature, or use the Miniature / Interior
buttons. Both use one furnished runtime; orbit/zoom and cutaway controls belong
to the miniature, while walking belongs to Interior. Both presentations have
recorded narration, reusing the same player and exact household passages.
Switching preserves both camera poses. Static batch roots keep independently
visible architectural layers batched without merging them into the furnishings.
The miniature sections walls and their paintings, not household objects.

Capture all miniature compositions with `node scripts/capture-interiors.mjs
--phase after --scene roman-domus --version miniature
--output-dir outputs/domus-miniature --base-url http://127.0.0.1:4183`.
Use a separate output directory from the environment captures. Miniature
manifests retain their representation and cannot overwrite environment previews.

Every place's original visit and Miniature are versions of one catalog destination,
not separate map entries. `?scene=<id>&version=miniature` opens its Three.js object
viewer. Complete generated interiors use the same family-based shell mechanism.
Routing uses experience identity, not engine names. Original recordings remain
available; Douro's added yard and railway views explicitly set `narration: false`.
Miniatures and object details use prerecorded OpenAI speech and bilingual text,
with the same global audio ownership. Run `scripts/prepare-narration.mjs` to
inventory missing passages; paid generation requires an explicit durable budget.

Miniatures reuse authored meshes and instances, live cloth and foliage, water
reflections and shared weathering. Opening interiors separate actual roof,
entrance and ceiling assemblies before batching; landscapes physically section
geometry and cap closed solids without filling cavities. Explicit per-place
bounds and camera directions live in `catalog/miniature-compositions.js`.
Never replace a real cut with a dark plane or a shader-only mask. Overview
cameras fit current bounds; focused cameras follow their object's section.
The `open=1` URL parameter restores an open shell. Reduced motion applies the
same exact final positions without animation. Douro retains its accepted cameras.
The historical Babylon, PlayCanvas and Unity comparisons remain isolated under
`experiments/marrakech/`, with their own dependencies and exporter.

Outdoor definitions may explicitly select `daylight: "summer"` for the bundled
clear-sky profile. Omitting it retains the collection's broken-clouds baseline.
The shared daylight loader aligns the directional sun, background and reflection
environment; unknown profiles fail rather than silently selecting another sky.
Keep new profiles licensed, locally bundled and represented in the detail manifest.

The local catalog merges bundled packages with `.cache/generated-scenes/`
by scene ID. That directory can contain unique work: **back it up before
clearing caches**. `ATLAS_CACHE_DIR` selects a separate writable cache.
Generated review output belongs in ignored `outputs/`; test output belongs in
`test-results/`. Neither is needed to visit the app or run the ordinary tests.

## Validation

```sh
npm run check              # ESLint, Prettier, Node tests
npx playwright install chromium
npm run test:browser       # Isolated local server, real browser, provider disabled
npm run test:pages         # Fresh static export, all-scene project-path checks
```

Use hardware-accelerated Chromium. The shared preflight logs its renderer;
CI rejects software GPUs and runs browser jobs on Apple Silicon with Metal.
Do not reduce scene detail or weaken checks to make a software runner pass.
Run GPU-heavy suites sequentially rather than competing for one device.
CI distributes the local-server suite over four isolated runners with Playwright's
`--fully-parallel --workers=1 --shard=N/4`. Test-level sharding balances the expanded
collection while the single worker keeps GPU use sequential on each runner.
All assertions and the 20-minute job limit remain. Local `npm run test:browser`
still runs the entire suite.

Additional checks against an already-running app:

```sh
npm run test:outdoors -- newar-potters-square
npm run test:water-prints
node scripts/check-narration.mjs --scene riad
```

The outdoor and water/print checks use `ATLAS_URL`; narration uses `--base-url`.
Inspect the scripts and their documentation before running them: outdoor and
water/print checks also publish preview images after successful collection
checks.

### Matched visual comparisons

Preserve the baseline **before editing**. The interior tools default to an
app on port 4195; use `--base-url` to target your server.

```sh
npm run capture:interiors -- --phase before --base-url http://127.0.0.1:4183 --output-dir outputs/my-visual-pass
# Implement the change.
npm run capture:interiors -- --phase after --base-url http://127.0.0.1:4183 --output-dir outputs/my-visual-pass
npm run compare:interiors -- --input-dir outputs/my-visual-pass --app-url http://127.0.0.1:4183
# Only after inspecting and approving the rendered result:
npm run previews:publish -- --input outputs/my-visual-pass/after/capture.json
```

Before captures cannot be overwritten. Use identical original cameras, viewport
and motion settings; add separate evidence for newly connected spaces.
The same capture tool accepts an outdoor `--scene ID`; an unfinished place
also requires `--include-drafts` and a local server. Its default collection
remains the thirteen interiors. Use `--all --version miniature` to capture all
24 Miniatures and their named views, or `--scene ID --version miniature` for
one place. The Whole capture begins closed; selecting an interior detail opens
its shell. Capture the opened Whole state separately when comparing the opening.
The domus opens in cutaway mode by default and captures its five shared-runtime
compositions; `open=0` restores its roof for closed-envelope inspection.
Serve the generated comparison directory separately: the application does not
expose `outputs/`. See [outdoor review](outdoor-collection.md),
[narration verification](narration.md) and the
[agentic review rubric](../agentic-tests/README.md) for specialized checks.

The three-pass realism report uses the scene IDs recorded in its input files,
not the size of today's catalog. All passes must cover the same nonempty set.
This keeps historical reviews reproducible when the collection grows.

### Comparable rendering measurements

```sh
node scripts/measure-dioramas.mjs --scene textile --scene andean-stone-lane \
  --base-url http://127.0.0.1:4183 --seconds 5 --output outputs/my-pass/performance.json
```

Use `--view garden` or another named viewpoint for a matched detail measurement.
`--source-ref COMMIT` serves the revision's `/src/` without changing the checkout;
it retains current public assets, so preserve changed asset bytes separately.
`--include-drafts` permits explicitly selected local unfinished scenes.

The measurement utility runs scenes sequentially at the paused original arrival,
1280x900 and device scale 1. It records the actual rendering device, frame
intervals, resource counts, finite attributes, original views and complete-frame
draw/triangle totals, including reflections and postprocessing. Output is
immutable. Use the same device, viewport and duration for the preserved source
and the refinement; run no competing GPU tasks. Frame rate varies with machine
load and is not a universal hardware claim.
When navigation changes the canvas height, use `--render-height N` on both
measurements to match the actual render area. The utility adjusts the browser
height, verifies the requested canvas size, and records both viewport and
canvas dimensions. Compare matching presentations and geometry; a Miniature
overview and a full-scale arrival are different workloads, not a speedup claim.

The comparison gallery accepts mixed indoor/outdoor captures. A connected-space
panel is shown only when the capture includes a `passage` view; every scene also
links directly to its live explorer.

Publish inspected outdoor-only capture manifests with
`npm run previews:publish -- --input PATH --environment outdoor`. Interior
captures retain the default destination. Keep the two families in separate
publication manifests; both retain unselected preview provenance.

## Optional generation

The Node server retains OpenAI-backed scene definitions, reference images,
textures, detail speech and visual review. The browser is an explorer, not a
scene-generation editor. Generated definitions use known room-family builders;
they do not automatically produce arbitrary bespoke geometry.

Provider operations require an explicitly supplied `OPENAI_API_KEY` and may
incur charges. This includes uncached concept/narration `GET` and `HEAD`
requests. Prompts, speech text and submitted review images may leave the machine.
Obtain permission for the exact operation and inspect its scope before sending
anything; never include secrets or private material in client assets or logs.

The app does not automatically read `.env`. If needed, keep it untracked and
explicitly use Node's `--env-file` option. Never expose the local provider-enabled
server publicly: it has no authentication, authorization or quota system.
The static Pages edition is the supported public delivery path.

Use the dedicated [narration](narration.md) and [asset](assets.md) guides rather
than ad hoc generation or downloads. Preserve recipes, source rights, exact
models, immutable hashes and credits. Tests run with paid services disabled.

## Release identity

`package.json` and the root entries in `package-lock.json` identify **1.0.0**.
The README and [changelog](../CHANGELOG.md) use the display form **v1.0.0**.
Use the package manager to update future versions without implicitly creating
a Git tag; publish commits, tags or GitHub releases only when authorized.
Never present an uncommitted change as the deployed public version.

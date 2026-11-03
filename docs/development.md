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
npx playwright install chromium
npm start                  # http://127.0.0.1:4183
npm run dev                # Alternative: restart on imported server-source changes
```

Set `PORT=4300` to choose another port. The server binds to loopback.
Browser source uses native JavaScript ES modules and an import map: refresh
after changes; there is no frontend compilation or hot-module replacement.
Startup runs `prepare:dioramas` to export the native Babylon miniature from local
authored geometry and materials. It caches the result under ignored
`public/dioramas/`; source changes invalidate the cache. This preparation is
provider-free and requires Playwright Chromium.

For the exact static hosting arrangement:

```sh
npm run build:pages
npm run preview:pages       # http://127.0.0.1:4196/diorama-atlas/
```

The bundled app needs no key, database or generated cache. See
[deployment](deployment.md) before publishing.

## Repository map

| Path                                 | Responsibility                                                  |
| ------------------------------------ | --------------------------------------------------------------- |
| `src/client/catalog/`                | Place definitions, saved-place loading and geography            |
| `src/client/world/`                  | Earth, markers, miniatures and previews                         |
| `src/client/viewer/`                 | Rendering, viewpoints, narration, controls and credits          |
| `src/client/environments/shared/`    | Reusable geometry, materials, print, water and audio mechanisms |
| `src/client/environments/riad/`      | Marrakech's dedicated environment                               |
| `src/client/environments/interiors/` | Six room families, depth, props and everyday activity           |
| `src/client/environments/outdoors/`  | Dedicated outdoor compositions and shared outdoor helpers       |
| `src/client/localization/`           | Global language state and presentation dictionaries             |
| `src/client/rendering/`              | Shared native Babylon rendering and authored-scene export       |
| `src/server/`                        | Local HTTP, saved scenes and optional provider operations       |
| `data/scenes/`                       | Seven versioned saved packages, including distinct variants     |
| `public/`                            | Approved runtime assets, previews and provenance                |
| `scripts/`, `tests/`                 | Maintenance, captures and regression checks                     |
| `docs/`, `.github/skills/`           | Human and agent development guidance                            |

Five original definitions, seven saved interiors and eleven outdoor definitions
form the 23-scene collection. Preserve unique IDs and saved-package provenance.

Unfinished outdoor entries are explicitly marked `draft: true` and excluded
from the bundled collection. Opt in locally with `&draft=1` on a scene URL;
the header identifies the preview, and static hosting rejects this option.
Draft scripts do not count as completed recordings. Promotion removes the
flag only after narration, cultural/visual review and all release checks pass.
Related variants are deliberate entries, not duplicate files to delete.

Douro's Landscape and Miniature are versions of one catalog destination, not
separate map entries. `?scene=douro-vineyard&version=miniature` opens its native
Babylon viewer. Original Landscape recordings remain available; its added yard
and railway views explicitly set `narration: false`. Miniature uses requested
browser speech for all eleven views, with the same global audio ownership.

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
CI distributes the local-server suite over two isolated runners with Playwright's
`--shard=1/2` and `--shard=2/2`; each retains a single worker, all assertions and
the 20-minute job limit. Local `npm run test:browser` still runs the entire suite.

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
remains the twelve interiors.
Serve the generated comparison directory separately: the application does not
expose `outputs/`. See [outdoor review](outdoor-collection.md),
[narration verification](narration.md) and the
[agentic review rubric](../agentic-tests/README.md) for specialized checks.

The three-pass realism report uses the scene IDs recorded in its input files,
not the size of today's catalog. All passes must cover the same nonempty set.
This keeps historical reviews reproducible when the collection grows.

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

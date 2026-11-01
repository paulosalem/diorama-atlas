# Diorama Atlas

**A world of small places, explored from the inside.**

Diorama Atlas is a local web application for exploring culturally inspired
interiors and outdoor spaces. Start with an interactive Earth, choose a place, and step into a
full-scale Three.js environment with named viewpoints, close-up detail markers,
and explanatory text.

The included collection contains **22 places across 18 geographic settings**:
12 interiors plus ten imagined outdoor settings inspired by Newar, Central Asian,
Balinese, Venetian, Bahian, Andean, Swahili, Naxi, Tunisian and Lao traditions.
These are culturally grounded interpretations, not replicas of landmarks,
surveyed buildings, photogrammetry, or authoritative historical records.

## Run locally

Use **Node.js 22.13+ on the 22.x line, or Node.js 24+**, and npm. A modern browser
with WebGL 2 support and hardware acceleration is recommended.

```sh
# If you use nvm:
nvm use

npm ci
npm start
```

Open **http://127.0.0.1:4183**. No API key, database, or build step is needed to
explore the included collection. The server listens on loopback only.

```sh
npm run dev        # Restart the server when its imported source changes
PORT=4300 npm start
```

Browser modules are served directly using native ES modules and an import map.
After editing browser source or styles, refresh the page; there is no hot module
replacement or production bundler.

## Explore

- **Globe:** drag to rotate, scroll to zoom, or open **Places** to jump to a
  geographic setting. Hover a marker to preview its places; click to enter.
- **Interior:** drag or use the arrow keys to look around. Scroll or press
  `+` / `-` to zoom; use the viewpoint buttons to move through the room (six in
  the Marrakech riad, five in each other interior).
- **Details:** choose **Show details**, then select a marker to read about an
  object or architectural feature. **Reset view** restores the first viewpoint.
- **Outdoors:** explore four viewpoints per setting, with closer zoom for small
  details. **References** shows the credited photographs used as regional style
  references; map markers indicate regions of inspiration, not street addresses.
- **About:** browse and search all image, material, model, print and audio credits.
- **Language:** choose **English (US)** or **Português (Brasil)** globally.
  Interface text, place descriptions, viewpoints and narration follow the choice
  without moving your camera or rebuilding the environment.
- **Narration:** all 22 places have prerecorded arrivals and focused-view
  explanations in both languages: 202 recordings across 101 views.
  A quiet floating panel shows the spoken
  paragraph and play/pause controls. Playing once enables future entry/view
  narration; view selection or a sustained close look selects the relevant
  recording. You can minimize the panel, and **Mute all** disables narration too.
  **Show details** pauses the guide and replaces its panel with the object caption;
  closing details restores the guide without restarting it.
- **Return:** select **Back to world** or press `Escape`. The globe remembers its
  orientation for the browser session.
- **Soundscape:** enable recorded place ambience and music independently.
  Follow each place's musical selection, or keep the shared Atlas theme playing
  as you explore. Both start off on your first visit. Your sound choices and
  volumes are remembered in a cookie across places and future visits; audio credits
  are in the same panel. Hiding the tab pauses playback, and only one Atlas tab
  plays at a time. If your browser blocks restored playback, select **Resume**.
  Existing detail **Listen** uses browser speech synthesis outdoors and in
  Portuguese, and the separate narration API described below for English
  interiors. All included entry/view recordings are bundled locally.

Direct links use `/?scene=kissaten`. Add `&inspect=1` for expanded viewing or
`&view=bar` for a particular viewpoint; viewpoint names vary by environment.

## Repository layout

```text
src/
  client/
    catalog/              Place descriptions and geographic settings
    world/                Globe, markers, and miniature landmarks
    viewer/               Rendering, controls, details, references, credits, audio UI
    environments/
      shared/             Geometry helpers and shared material loading
      interiors/          Room families, connected spaces, detail, and soundscapes
      outdoors/           Ten settings, photographic daylight, foliage, and water
      riad/               Detailed Marrakech environment
    main.js               Browser entry point
    styles.css
  server/                 HTTP application, persistence, and optional AI services
data/scenes/              Seven bundled saved scene packages from the import
public/                   Earth imagery, preview images, and material maps
tests/                    Catalog, HTTP, and browser regression tests
docs/                     Architecture, asset provenance, and historical notes
index.html                HTML shell and Three.js import map
```

Five original place definitions live in the client catalog. Seven saved scene
packages are versioned under `data/scenes/`, so a fresh checkout has the same
interior collection without depending on someone else's cache. Ten outdoor
definitions live in `src/client/catalog/outdoor-catalog.js` and use dedicated
geometry builders, not generated approximations.

Local generated scenes, reference images, narration, and textures live in
`.cache/`. Local scenes override bundled scenes with the same ID. **Back up
`.cache/generated-scenes/` before clearing caches**: it can contain saved work,
not just disposable downloads. Set `ATLAS_CACHE_DIR` to use a different writable
cache directory.

## Optional AI services

The Node server retains the imported OpenAI-backed endpoints for reference images,
narration, scene generation, texture generation, and visual review. The current
browser interface is an explorer, not a scene-generation editor.

If you deliberately want to use these endpoints, supply `OPENAI_API_KEY` in the
server's environment. **These operations can incur charges**, including an
uncached narration or reference-image `GET`/`HEAD` request. Scene prompts, narration
text, and submitted review images may be sent to OpenAI. Do not send private
material without considering that data flow.

Without a key, the bundled globe and interiors still work. Cached optional media
can be served; uncached AI-dependent operations report that generation is
unavailable. Preview images and rendering materials are bundled locally.

The application does not automatically load `.env` files. If you choose to use
one, keep it untracked and explicitly load it with Node's `--env-file` option.
Never put a key in client source.

This is a **local prototype, not an authenticated public service**. Do not expose
it to the internet or treat it as deployment-ready.

## Development

```sh
npm run check             # ESLint, formatting, and Node regression tests
npm run format            # Apply the shared formatting conventions
npx playwright install chromium
npm run test:browser      # Real browser checks against an isolated local server
npm run test:outdoors     # All outdoor viewpoints and controls; app on port 4183
npm run test:water-prints # All 22 places: actual print images and timed water views
node scripts/check-narration.mjs # All bilingual views, actual playback, audio signal checks and captures
npm run build:credits    # Rebuild consolidated local attribution
```

Browser checks run with AI disabled and cover the globe, all 22 environments and
their 101 viewpoints, details, audio ownership/preferences, mobile-width navigation,
and error recovery. The outdoor and water/print scripts write local evidence to
ignored `outputs/`; set `ATLAS_URL` to target a different running server.
Test artifacts go to ignored `test-results/`. GitHub Actions runs repository
checks on Node 22 and 24 and browser checks on Chromium.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development conventions,
[architecture](docs/architecture.md) for runtime boundaries, and
[asset provenance](docs/assets.md) before adding or redistributing media.
See [soundscape design and extension](docs/soundscapes.md) and
[audio sources](docs/audio-sources.md) for acquiring, licensing and composing
additional recordings and music.
See [narration](docs/narration.md) and [localization](docs/localization.md) for the
bilingual collection, view triggers, generation provenance and global language setting.
See [outdoor collection and visual refinements](docs/outdoor-collection.md) for
source photography, scanned daylight/materials, surface patina, natural water,
image-based printed props, and the limits of the visual realism achieved so far.

### Matched visual comparisons

The [collection realism pass](docs/collection-realism.md) continues the approved
Codex work: rooms beyond doors and windows, meaningful signs of use, restrained
movement, and optional local ambience. Subsequent atlas-wide work also refines
Marrakech with surface variation, printed imagery and more natural water.

For a future visual pass, capture its baseline before editing:

```sh
npm run capture:interiors -- --phase before --output-dir outputs/my-visual-pass
# Make and inspect the scene changes, then capture matching views:
npm run capture:interiors -- --phase after --output-dir outputs/my-visual-pass
npm run compare:interiors -- --input-dir outputs/my-visual-pass
# Once the rendered results are approved, refresh the globe thumbnails:
npm run previews:publish -- --input outputs/my-visual-pass/after/capture.json
```

These commands expect the application at `http://127.0.0.1:4195`; use `--base-url`
on capture and `--app-url` on comparison to change it. Before captures cannot be
overwritten. Serve the generated directory locally to use its comparison gallery;
the application intentionally does not expose `outputs/`.

## Import and licensing

This repository was recovered from Codex checkpoint tree
`22bff408076328be379d026a4de1cf6125e1cb0f` and reorganized without changing the
original project folder. Dependencies, runtime caches, old
screenshots, and review output are not project source. The imported interior
rebuild notes are retained as [historical context](docs/history/interior-rebuild.md).

No project-wide license has been selected. Asset-specific credits and licenses
are documented separately; do not assume that every imported asset has the same
redistribution terms.

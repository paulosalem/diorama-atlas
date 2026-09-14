# Architecture

## Runtime

Diorama Atlas is a single local Node HTTP process plus a browser application.
There is no frontend framework, database, or build pipeline. The two runtime
dependencies are Three.js for rendering and the OpenAI SDK for optional server
operations.

```text
Browser: index.html -> src/client/main.js
  |
  +-- catalog + GET /api/generated-scenes
  |                  |
  |                  +-- bundled data/scenes/
  |                  +-- writable cache/generated-scenes/ overrides
  |
  +-- no scene query: world globe + place previews
  |
  +-- ?scene=<id>: viewer -> outdoor, riad or interior-family builder
                             |
                             +-- shared geometry/material helpers
                             +-- local public/ material maps

Node: src/server/index.mjs -> createAtlasServer()
  +-- explicit static-file allowlist
  +-- API routes -> scene persistence, generation jobs, optional media
  +-- optional OpenAI client (server-side only)
```

## Browser boundaries

`catalog/` contains the original five place definitions, ten fictional outdoor
settings, saved-place loading, and geographic matching. `world/` renders Earth and miniature landmarks, places
interactive markers, and remembers camera orientation in session storage.

`viewer/` owns rendering, camera controls, postprocessing, details, references,
consolidated credits, narration controls, and navigation. Outdoor definitions use
`environments/outdoors/`; otherwise it chooses the dedicated riad builder for
`scene.id === "riad"` and `environments/interiors/` for the remaining places.

`localization/` owns the global en-US/pt-BR preference and presentation dictionaries.
Subscriptions update text in place without replacing original definitions,
rebuilding geometry, or disturbing camera and audio state. Original definitions
remain unchanged because the family dispatcher depends on their source fields.

Marrakech's `scene-narration.js` panel reuses the viewer's single narration audio
element. Local prerecorded clips are chosen by global language and named view;
`narration-triggers.js` also requires physical proximity and sustained gaze.
The shared audio controller coordinates consent, ownership, ducking and mute.
This pilot does not silently add paid requests when entering other scenes.

The interior dispatcher selects a cafe, tavern, herb shop, bookshop, workshop, or
kitchen using the definition's title, request, and blueprint. Generated content
does not automatically become arbitrary new geometry: it is interpreted through
these room families.

The non-riad families share an architectural depth pass and a separate life and
atmosphere pass. Both run before geometry batching. Connected spaces are actual
geometry, not background photographs. Animation and audio resources belong to
their environment and are released with it. Recorded ambience shares an audio engine
under `environments/shared/`; app-level optional music has a separate owner and
continues across internal navigation. The soundscape panel exposes separate
channel controls and credits from the bundled audio manifest. See
[soundscapes](soundscapes.md) for mixing, media provenance and lifecycle details.

Environment builders return a runtime with a scene group, named viewpoints,
hotspot anchors, an asset-readiness promise, animations, and cleanup. The viewer
waits for materials and owns the render loop. Environment-specific resources are
disposed on navigation; the browser entry handles page-history restoration.
The first published frame waits for image/model readiness and material-specific
surface patina. Both environment builders stamp deterministic per-object seeds
before batching; shared scan sampling preserves world scale and avoids repetitive
surfaces. Artwork, transparency, foliage and luminous surfaces are protected
from inappropriate aging.

Outdoor rendering uses a local photographic PureSky environment, aligned sunlight,
AgX tone mapping and restrained ambient occlusion without decorative bloom.
Shared water flow drives multiscale motion and planar reflections; each water
path retains its own capture/disposal contract. Image-based books, curved labels,
illustrated pages and contextual prints share the local print catalog and
readiness-aware image loader. All geometry and public asset URLs survive the
organized-layout integration, including each setting's original viewpoints.

`getActiveViewer()` exports the current viewer controller for local inspection
and capture tools. It provides the runtime, camera, renderer, selected-view
control (`selectView` and `lookAt`), animation time, recent frame durations, and idempotent disposal.
It is not a global browser variable or a server endpoint. Reduced motion freezes
environment animation time; optional sound requires a user gesture and stops
when the page becomes hidden. Hidden-page playback does not resume automatically.
Internal navigation retains the common musical theme but stops outgoing local
audio before loading the next room, and disposes outgoing visual runtimes.
A validated one-year cookie preserves enabled channels, volumes and music mode;
fresh visits without saved consent remain silent. BroadcastChannel ownership
prevents competing Atlas tabs. Browser-blocked restoration offers Resume without
discarding the saved choice.

Shared material loading lives under `environments/shared/`, while its original
texture paths remain under `public/riad/materials/`. Keeping those asset URLs
stable avoids changing imported provenance manifests or render behavior.
Additional scans, photographic references, daylight and models live under
`public/outdoors/`; print images and source provenance live under
`public/print-library/`. `scripts/build-credits.mjs` combines those manifests and
recorded-audio credits for the About dialog.

## Server boundaries

| Module                | Responsibility                                                      |
| --------------------- | ------------------------------------------------------------------- |
| `index.mjs`           | Read startup settings and listen on `127.0.0.1`                     |
| `app.mjs`             | Construct an isolated HTTP server without listening at import time  |
| `paths.mjs`           | Resolve repository, bundled-data, and writable-cache locations      |
| `api.mjs`, `http.mjs` | Dispatch requests and provide HTTP helpers                          |
| `static.mjs`          | Serve only the browser's explicitly permitted files                 |
| `scenes.mjs`          | Load and merge bundled and locally saved scene packages             |
| `data/`               | Imported reference prompts and narration descriptions               |
| `generation/`         | AI requests, scene schemas, package normalization, jobs, and review |
| `media/`              | Concept-image, narration, and texture caching and delivery          |

Tests and tools can construct a server without opening a fixed port:

```js
import { createAtlasServer } from "./src/server/app.mjs";

const server = await createAtlasServer({
  cacheDir: "/absolute/path/to/a/test-cache",
  apiKey: "",
});
server.listen(0, "127.0.0.1");
```

An empty `apiKey` disables the default provider even if the parent process has
`OPENAI_API_KEY`. `openaiClient: null` also disables provider calls, and a mock
client can be injected for deterministic generation tests.

Paths are resolved from the server module's location, not the shell's working
directory. `ATLAS_CACHE_DIR` overrides the writable cache root; an explicit
factory `cacheDir` takes precedence. Relative cache paths resolve against the
repository root. The default port is 4183, overridden by `PORT`.

## Persistent content

The bundled seven packages under `data/scenes/` retain their imported envelopes:
scene definition, creation timestamp, prompt hash, model, and any supplied review
or generation metadata. Loading bundles first, then local packages by `scene.id`,
keeps the included collection reproducible while allowing saved local changes.

The writable cache has four subdirectories:

| Directory           | Contents                                                     |
| ------------------- | ------------------------------------------------------------ |
| `generated-scenes/` | Saved scene packages, including potentially unique user work |
| `concepts/`         | Cached reference images and metadata                         |
| `narration/`        | Cached speech                                                |
| `textures/`         | Generated texture images and metadata                        |

Missing writable directories are created as needed. Malformed saved packages
fail with a filename and diagnostic rather than silently removing places.
Generation jobs and in-flight request registries are per-server, in memory;
job polling is not a durable queue across restarts.

## HTTP API

These are the retained prototype endpoints, not an authenticated public API.

| Method and path                           | Request or response                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `GET/HEAD /api/generated-scenes`          | `200`, `{ scenes }`; bundled and locally saved definitions                        |
| `POST /api/generated-scenes`              | `{ prompt, depth? }`; `202` with `{ job }`, or `200` for cached completion        |
| `GET/HEAD /api/generated-scenes/jobs/:id` | `200`, `{ job }`; unknown jobs return `404`                                       |
| `POST /api/generated-scenes/:id/review`   | `{ screenshot: "data:image/png;base64,..." }`; `200`, `{ reviewed: true, scene }` |
| `GET/HEAD /api/concepts/:scene/:variant?` | PNG reference; variant defaults to `hero`; accepts `?refresh=1`                   |
| `GET/HEAD /api/narration/:scene/:detail`  | MP3 narration; accepts `?refresh=1`                                               |
| `GET/HEAD /api/textures/:id`              | Cached PNG texture                                                                |
| `GET/HEAD /favicon.ico`                   | `204`                                                                             |

Unsupported methods return `405`; malformed JSON or missing required input
returns `400`. Unknown media returns `404`. An uncached reference image or
narration request without a provider returns `503`.

Generation is asynchronous: a new request without an API key still creates a job
and returns `202`. Polling then returns `200` with a failed job whose
`error.statusCode` is `503`. Clients must inspect the job state rather than treat
every successful poll as successful generation.

JSON responses use `no-store`. Concept images and narration cache for one day,
textures for one year with `immutable`, and static files use `no-cache`.

The imported provider fallback order is explicit:

| Operation                                        | Model candidates, in order                                  |
| ------------------------------------------------ | ----------------------------------------------------------- |
| Reference images and generated textures          | `gpt-image-1.5`, `gpt-image-1`                              |
| Scene generation, reference analysis, and review | `gpt-4.1-mini`, `gpt-4o-mini`                               |
| Speech                                           | `gpt-4o-mini-tts` with `sage`, then `tts-1-hd` with `alloy` |

Fallback occurs for provider statuses `400`, `403`, or `404`. These are preserved
prototype settings, not a promise of continued provider model availability.

## Static files and operational limits

The server serves the root HTML shell, `src/client/`, `public/`, and the Three.js
browser entry/core modules and add-ons. It does not serve arbitrary repository
files, server implementation, saved packages directly, other dependencies,
credentials, or review outputs. Traversal and symlink escapes are rejected.

These boundaries are not authentication. The retained API can perform
provider-backed operations when enabled, and some media GET/HEAD requests generate
content on a cache miss. Keep the application local; a public deployment would
need a separate design for authentication, authorization, quotas, and operation
costs.

## Validation

Node tests cover collection integrity, geographic mapping, HTTP behavior, local
state isolation, and persistence. Playwright starts a separate server with AI
disabled and exercises the real module graph and local assets across every
included environment. Its API guard prevents generation requests during browser
regressions. Rendering still requires visual inspection: passing assertions alone
does not establish historical accuracy or visual quality.

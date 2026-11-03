# Contributing

Begin with the [project philosophy](docs/philosophy.md),
[diorama quality standard](docs/diorama-standard.md) and the relevant
[scene brief](docs/scenes/README.md). The concise
[README](README.md) is the visitor-facing introduction;
[development](docs/development.md) contains setup, tooling and operational detail.
Repository [agent skills](docs/agent-skills.md) make recurring procedures reusable.

## Local workflow

1. Use the Node version in `.nvmrc` and run `npm ci`.
2. Start the application with `npm run dev`.
3. Make changes in the appropriate client, server, or data directory.
4. Run `npm run check`. For rendering, navigation, static-path, or catalog changes,
   also run `npm run test:browser` after installing Playwright's Chromium.

There is no compilation step: this project uses JavaScript ES modules. ESLint
checks syntax and common programming errors; it is not a TypeScript type checker.
Prettier owns formatting. Keep `package-lock.json` synchronized with dependency
changes, and do not hand-edit it.

## Keep the boundaries clear

- Browser source belongs in `src/client/`. It must not import server modules,
  secrets, or filesystem APIs.
- HTTP routing, local persistence, and provider calls belong in `src/server/`.
  Keep startup separate from reusable application construction.
- Reusable rendering helpers belong in `environments/shared/`; room-specific
  geometry stays with its environment.
- Versioned saved scene packages belong in `data/scenes/`. Preserve their
  provenance metadata and unique scene IDs.
- Static browser assets belong in `public/`. Add source and license information
  when introducing an image, model, or material.
- Generated output belongs in ignored `outputs/` or `.cache/`, not beside source.

## Adding or changing a place

Create or revise `docs/scenes/<scene-id>.md` first. State the cultural purpose,
anonymous setting, distinctive composition, actual viewpoint keys, material and
atmospheric direction, references, implementation entry points and boundaries
on interpretation. Add its link to the collection index; keep related variants
distinct rather than merging them as apparent duplicates.

The original five definitions are in `src/client/catalog/scene-catalog.js`.
Additional bundled places use the existing saved-package format in `data/scenes/`.
The API merges those packages with local saved scenes by ID.
Outdoor definitions instead live in `src/client/catalog/outdoor-catalog.js`,
with dedicated builders in `src/client/environments/outdoors/`. Preserve their
fictional-setting disclosure, regional markers, and accurate photographic sources.

Provide a unique ID, title, geographic context, explanatory text, detail points,
and a matching `public/previews/<scene-id>.png`. Check the geographic match rules
in `src/client/catalog/place-locations.js`; an entry that matches no setting will
not appear on the globe.

The interior dispatcher chooses among existing room families based on the place
definition. A new room family needs a builder, four primary viewpoints plus a
connected-space viewpoint, hotspot anchors, material readiness, and resource
cleanup. Do not assume a generated
scene definition creates bespoke geometry automatically.
Outdoor runtimes provide four spatially distinct viewpoints and the same
readiness/disposal contract. Use the shared recorded soundscape infrastructure
and global controller, never a second player or application shell.

Shared surface variation is applied before batching and surface patina after
asset readiness. Preserve shader hook composition and artwork protection.
Printed props use the local print catalog and image-material loader; update
their manifests and `npm run build:credits` when changing imagery. Use
`npm run test:outdoors` and `npm run test:water-prints` for affected visual work,
and inspect matched captures rather than treating geometry counts as realism.

Update the collection assertions and browser scenarios when intentionally
changing the bundled collection. Inspect the actual rendered result, not just
successful HTTP responses.

Before completion, verify the scene's regional marker, preview, references,
credits, all details/views, en-US/pt-BR interface text and guided recordings,
audio lifecycle, reduced motion, compact layouts and static project-path loading.
Follow the matched baseline and human-review requirements in the quality standard.

## Documentation and releases

Keep the README short, inviting and focused on cultural enrichment and visiting.
Put procedures in dedicated guides and link them through `docs/README.md`.
Scene briefs describe the existing implementation and identify intended
directions as such; do not promote reference aspirations to claims of fidelity.

The package and lockfile already identify version `1.0.0`; display it as
`v1.0.0` in release documentation. Keep them aligned for later releases.
Commits, tags, pushes, repository visibility, licenses and releases require
explicit authorization. Preparing documentation does not authorize publication.
Before making the source repository public, review asset rights and Git history;
removing a file from the current tree does not remove earlier committed copies.

## Tests and privacy

Tests must not use a developer's API key or modify their saved scenes. Server
tests should use temporary cache directories; browser tests use their own server,
an empty API key, and a guard against generation requests.

Do not add credentials, `.env` files, dependency installations, screenshots, or
unreviewed generated media to Git. No license is implied by accepting a file into
this repository; record asset provenance explicitly.

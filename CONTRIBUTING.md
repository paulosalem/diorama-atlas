# Contributing

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

The original five definitions are in `src/client/catalog/scene-catalog.js`.
Additional bundled places use the existing saved-package format in `data/scenes/`.
The API merges those packages with local saved scenes by ID.

Provide a unique ID, title, geographic context, explanatory text, detail points,
and a matching `public/previews/<scene-id>.png`. Check the geographic match rules
in `src/client/catalog/place-locations.js`; an entry that matches no setting will
not appear on the globe.

The interior dispatcher chooses among existing room families based on the place
definition. A new room family needs a builder, four primary viewpoints plus a
connected-space viewpoint, hotspot anchors, material readiness, and resource
cleanup. Do not assume a generated
scene definition creates bespoke geometry automatically.

Update the collection assertions and browser scenarios when intentionally
changing the bundled collection. Inspect the actual rendered result, not just
successful HTTP responses.

## Tests and privacy

Tests must not use a developer's API key or modify their saved scenes. Server
tests should use temporary cache directories; browser tests use their own server,
an empty API key, and a guard against generation requests.

Do not add credentials, `.env` files, dependency installations, screenshots, or
unreviewed generated media to Git. No license is implied by accepting a file into
this repository; record asset provenance explicitly.

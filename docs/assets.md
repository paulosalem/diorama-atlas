# Asset provenance

Assets needed by the explorer are served from `public/` and remain versioned so
the included collection works without network downloads or paid generation.
Existing attribution manifests are preserved rather than replaced with a
project-wide licensing assumption.

| Asset group                 | Source and status                                                                                             | Manifest                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Earth texture               | NASA Earth Observatory, Blue Marble Next Generation, August 2004                                              | [`public/earth/credits.json`](../public/earth/credits.json)                               |
| Shared scanned materials    | Poly Haven; recorded as CC0 in the imported manifest                                                          | [`public/riad/materials/manifest.json`](../public/riad/materials/manifest.json)           |
| Interior plastered stone    | Poly Haven; recorded as CC0 in the imported manifest                                                          | [`public/interiors/materials/manifest.json`](../public/interiors/materials/manifest.json) |
| Place previews              | Eleven local renders of the current interiors; Marrakech retains its imported generated reference             | [`public/previews/credits.json`](../public/previews/credits.json)                         |
| Saved scene packages        | Imported generated definitions, retaining model, timestamp, prompt, and review metadata where supplied        | `data/scenes/`                                                                            |
| Recorded ambience and music | Wikimedia Commons recordings with public-domain dedications or CC BY 4.0; Kevin MacLeod music under CC BY 4.0 | [`public/audio/manifest.json`](../public/audio/manifest.json)                             |

Audio credits are also available in the app's **Soundscape** panel. Local license
evidence, creator/source links, processing notes and file hashes accompany the
recordings. See [audio acquisition](audio-sources.md) and
[soundscape composition](soundscapes.md) before extending the library.

The scene packages and preview images are interpretive material, not
photographic evidence that a particular building exists. Cultural descriptions
have not been independently fact-checked as part of repository organization.

Before public distribution, review the relevant source terms, confirm generated
image rights and provenance, and choose an explicit project license. This
repository does not currently declare one.

The rendered previews are captured from each interior's original main viewpoint
with reduced motion enabled. `npm run previews:publish` updates them from an
after-capture manifest and records the source scenes and material manifests.
Marrakech's reference image is intentionally left unchanged.

## What is not source

Local generated reference images, audio, textures, and new saved scenes remain
under ignored `.cache/`. Saved scene JSON may be valuable user work: back it up
before deleting that directory.

The import also contained seven unused binary models with no accompanying
attribution manifest. They were moved to ignored
`outputs/imported-assets/atlas-models/` in the recovery workspace rather than
included in the runtime asset set. No active browser module loads them. They
are not part of a fresh checkout; establish provenance before reintroducing them.

Old screenshots, review galleries, dependency folders, and agent session logs were
not promoted into repository source. The original project and its Codex checkpoint
were left untouched.

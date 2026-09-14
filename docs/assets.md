# Asset provenance

Assets needed by the explorer are served from `public/` and remain versioned so
the included collection works without network downloads or paid generation.
Existing attribution manifests are preserved rather than replaced with a
project-wide licensing assumption.

| Asset group                 | Source and status                                                                                             | Manifest                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Earth texture               | NASA Earth Observatory, Blue Marble Next Generation, August 2004                                              | [`public/earth/credits.json`](../public/earth/credits.json)                                     |
| Shared scanned materials    | Poly Haven; recorded as CC0 in the imported manifest                                                          | [`public/riad/materials/manifest.json`](../public/riad/materials/manifest.json)                 |
| Interior plastered stone    | Poly Haven; recorded as CC0 in the imported manifest                                                          | [`public/interiors/materials/manifest.json`](../public/interiors/materials/manifest.json)       |
| Place previews              | Local renders of all current interiors, including Marrakech; outdoor thumbnails are also actual renders       | [`public/previews/credits.json`](../public/previews/credits.json)                               |
| Outdoor photographs         | Twenty-one credited regional style references; these do not depict the fictional modeled settings             | [`public/outdoors/references.json`](../public/outdoors/references.json)                         |
| Outdoor base materials      | Licensed local scanned surfaces and sky imagery                                                               | [`public/outdoors/materials/manifest.json`](../public/outdoors/materials/manifest.json)         |
| Outdoor detail assets       | Attributed artwork, CC0 scans, foliage, PureSky daylight and licensed 3D props                                | [`public/outdoors/detail-assets/manifest.json`](../public/outdoors/detail-assets/manifest.json) |
| Generated cover artwork     | One explicitly requested Image 2.5 Field Notes cover, with prompt/model/usage evidence                        | [`public/outdoors/generated/manifest.json`](../public/outdoors/generated/manifest.json)         |
| Printed objects             | Original fictional layouts composed locally from licensed real artwork; five additional botanical sources     | [`public/print-library/manifest.json`](../public/print-library/manifest.json)                   |
| Saved scene packages        | Imported generated definitions, retaining model, timestamp, prompt, and review metadata where supplied        | `data/scenes/`                                                                                  |
| Recorded ambience and music | Wikimedia Commons recordings with public-domain dedications or CC BY 4.0; Kevin MacLeod music under CC BY 4.0 | [`public/audio/manifest.json`](../public/audio/manifest.json)                                   |

The Marrakech narration pilot adds twelve original AI-voiced recordings, with
exact text, language, model, voice, instructions and hashes in
[`public/narration/manifest.json`](../public/narration/manifest.json).
These are generated outputs under the recorded provider terms, not CC0 field
recordings or human performances. See [narration](narration.md).

All categories are searchable in **About**, generated from their provenance
manifests with `npm run build:credits`. Audio credits are also available in the app's **Soundscape** panel. Local license
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
`npm run test:water-prints` captures the current image-based details across all
22 environments and publishes their arrival thumbnails, including Marrakech.

## What is not source

Local generated reference images, audio, textures, and new saved scenes remain
under ignored `.cache/`. Saved scene JSON may be valuable user work: back it up
before deleting that directory.

The import also contained seven unused binary models with no accompanying
attribution manifest. These are not versioned runtime assets; preserved local
copies may remain in `public/atlas-models/` or historical review directories.
No active browser module loads them. Establish provenance before introducing
them into the runtime or committing them.

Old screenshots, review galleries, dependency folders, and agent session logs were
not promoted into repository source. The original project and its Codex checkpoint
were left untouched.

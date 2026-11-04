# Asset provenance

Assets needed by the explorer are served from `public/` and remain versioned so
the included collection works without network downloads or paid generation.
Existing attribution manifests are preserved rather than replaced with a
project-wide licensing assumption.

| Asset group                 | Source and status                                                                                                                 | Manifest                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Earth texture               | NASA Earth Observatory, Blue Marble Next Generation, August 2004                                                                  | [`public/earth/credits.json`](../public/earth/credits.json)                                     |
| Shared scanned materials    | Poly Haven; recorded as CC0 in the imported manifest                                                                              | [`public/riad/materials/manifest.json`](../public/riad/materials/manifest.json)                 |
| Interior plastered stone    | Poly Haven; recorded as CC0 in the imported manifest                                                                              | [`public/interiors/materials/manifest.json`](../public/interiors/materials/manifest.json)       |
| Place previews              | Local renders of all current interiors, including Marrakech; outdoor thumbnails are also actual renders                           | [`public/previews/credits.json`](../public/previews/credits.json)                               |
| Outdoor photographs         | Twenty-five credited regional style references, including four for the Douro vineyard; none depicts the fictional modeled setting | [`public/outdoors/references.json`](../public/outdoors/references.json)                         |
| Outdoor base materials      | Licensed local scanned surfaces and sky imagery                                                                                   | [`public/outdoors/materials/manifest.json`](../public/outdoors/materials/manifest.json)         |
| Outdoor detail assets       | Attributed artwork, CC0 scans, foliage, PureSky daylight and licensed 3D props                                                    | [`public/outdoors/detail-assets/manifest.json`](../public/outdoors/detail-assets/manifest.json) |
| Generated cover artwork     | One explicitly requested Image 2.5 Field Notes cover, with prompt/model/usage evidence                                            | [`public/outdoors/generated/manifest.json`](../public/outdoors/generated/manifest.json)         |
| Printed objects             | Original fictional layouts composed locally from licensed real artwork; five additional botanical sources                         | [`public/print-library/manifest.json`](../public/print-library/manifest.json)                   |
| Saved scene packages        | Imported generated definitions, retaining model, timestamp, prompt, and review metadata where supplied                            | `data/scenes/`                                                                                  |
| Recorded ambience and music | Wikimedia Commons recordings with public-domain dedications or CC BY 4.0; Kevin MacLeod music under CC BY 4.0                     | [`public/audio/manifest.json`](../public/audio/manifest.json)                                   |

The collection includes 476 original OpenAI-voiced recordings (153.36 MB), covering
105 guided viewpoints, 104 object details and 134 Miniature views across the
23 bundled scenes in English and Portuguese. Identical passages share recordings, with
exact text, language, model, voice, instructions and hashes in
[`public/narration/manifest.json`](../public/narration/manifest.json).
These are generated outputs under the recorded provider terms, not CC0 field
recordings or human performances. See [narration](narration.md).

The separately gated [Roman domus draft](scenes/roman-domus.md) adds 40 recorded
passages in the same narration manifest and 11 inspected archaeological photographs
in [`public/domus/references.json`](../public/domus/references.json).
[`public/domus/manifest.json`](../public/domus/manifest.json) preserves source,
author, license, retrieval and hash evidence. These references include museum and
excavation photographs, not photographs of the invented household. Two supply
painted surfaces in the draft. Their recorded licenses also appear in About.
These additions do not change the released collection totals above.

The [Douro vineyard](scenes/douro-vineyard.md) adds four inspected Commons
photographs, a generic CC0 ground scan, two small photographic grape-leaf
cutouts, a higher-resolution green leaf and an inspected CC0 clear-sky HDR.
The sky was photographed in South Africa and is used only for daylight, sky and
reflections; the river and hills remain modeled. The green leaf's original photograph
was taken in Morocco and is a botanical surface reference, not evidence of a
Douro cultivar. Its full-resolution original, mask, processing and hashes are
preserved under CC BY-SA 4.0; the earlier cutouts retain CC BY-SA 2.0.
These are photographs and adapted textures, not newly generated images or
measured botanical scans. Its eight bilingual narration recordings are included
in the collection totals above.

All categories are searchable in **About**, generated from their provenance
manifests with `npm run build:credits`. Audio credits are also available in the app's **Soundscape** panel. Local license
evidence, creator/source links, processing notes and file hashes accompany the
recordings. See [audio acquisition](audio-sources.md) and
[soundscape composition](soundscapes.md) before extending the library.

The scene packages and preview images are interpretive material, not
photographic evidence that a particular building exists. Cultural descriptions
have not been independently fact-checked as part of repository organization.

The Pages export retains the source terms and generated-asset provenance above.
It does not grant a new project-wide open-source license. Original application
content remains reserved; third-party assets retain their individual licenses.
Unused imported models are excluded from the current source tree and public
deployment. Their historical copies have [verified attribution](history/asset-provenance.md).

The rendered previews are captured from each interior's original main viewpoint
with reduced motion enabled. `npm run previews:publish` updates them from an
after-capture manifest and records the source scenes and material manifests.
`npm run test:water-prints` captures the current image-based details across all
23 environments and publishes their arrival thumbnails, including Marrakech.

## What is not source

Local generated reference images, audio, textures, and new saved scenes remain
under ignored `.cache/`. Saved scene JSON may be valuable user work: back it up
before deleting that directory.

The v1.0.0 cleanup removed twenty obsolete root screenshots and seven unused
binary models that initially lacked an attribution manifest from the current source
tree. Exact copies and a SHA-256 manifest were preserved locally under ignored
`outputs/repository-cleanup-v1.0.0/`; that archive is neither a runtime dependency
nor part of the public export. No active browser module used the removed models.

This cleanup does not rewrite Git history. Before public-source publication,
all seven historical models were matched byte for byte to pinned Khronos
sample assets. Their CC0/CC BY terms, creators, trademark exceptions and hashes
are recorded in [historical model attribution](history/asset-provenance.md).
They remain unused and are not restored to the application. Review provenance
and usage requirements before reintroducing any model.
Review galleries, dependency folders and agent logs remain local artifacts.
Unique generated scenes and the original reference workspace were left untouched.

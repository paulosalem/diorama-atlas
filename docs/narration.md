# Narration

All **22 bundled dioramas** have original, prerecorded cultural explanations
in **en-US** and **pt-BR**, using OpenAI's `gpt-4o-mini-tts` model and `cedar`
voice. The collection contains **202 recordings for 101 views**, totaling
66.94 MB: six views in Marrakech, five in each of the other eleven interiors,
and four in each of the ten outdoor settings. Each arrival introduces the
place's cultural value; focused views discuss the visible architecture,
materials, work, or connected space. The voice is explicitly disclosed as
AI-generated. No new images or replacement environments were generated for
this narration expansion.

The global language selector changes both interface text and the recording,
without rebuilding the scene or moving the camera. The compact floating panel
shows the spoken paragraph, play/pause, elapsed time, automatic narration consent,
and a minimize control. Longer paragraphs remain scrollable.

Opening **Show details** pauses the guided voice and temporarily replaces its
panel with the object caption. Closing details restores the guided paragraph
without restarting it. This keeps both listening modes usable on compact
screens rather than covering one caption with another. Short landscape windows
give the panel enough height to retain its playback controls, while object-detail
text scrolls independently of its Listen button.

## Playback and consent

The first visit is silent until **Play** or the narration setting is enabled.
Playing explicitly enables subsequent automatic narration on arrival and view
changes. Browsers that block automatic playback show a visible Play request.
Existing audio cookies retain their music, ambience and volume choices; the new
optional `narrationEnabled` field starts off. **Mute all** turns all three choices
off and saves them. Language is a separate global preference.

Clicking a named view selects its narration. Moving within 1.1 metres of its
viewpoint and looking toward its subject (direction cosine at least 0.94) for
1.1 seconds also selects it. The existing look/zoom controls provide another
route: at 45 degrees field of view or closer, a nearby, same-level subject must
fill more of the view than its authored framing (footprint ratio at most 0.85)
and be within a focused gaze cone (direction cosine at least 0.99).
This lets visitors look toward a subject and zoom closer without clicking its
viewpoint or requiring unsupported free-walking controls. The collection checks
include real mouse-look and wheel input in Marrakech, the Oaxaca workshop,
and the Newar square, not only camera positions injected by tests.
A sustained look triggers once, not on every frame; it never replays the arrival
paragraph merely because the visitor looks away from a detail.
Pausing suspends proximity triggers until another deliberate playback/view choice.
Reduced motion freezes scenery animation, not gaze detection or sound.

The viewer owns one narration `HTMLAudioElement`, reused by prerecorded scene
narration and existing detail narration. It coordinates with `atlas-audio`
ownership and ducking; music and ambience soften while narration plays.
Navigation, page hiding, another tab claiming playback and **Mute all** cancel
the outgoing voice. Language changes stop the old recording before starting the
new one. No playback path calls a paid provider or downloads remote audio.

## Source and generation

`scripts/prompts/opening-narration.json` is the original text and direction.
`public/narration/manifest.json` preserves model, voice, language, exact text,
instructions, generation time, request ID and file SHA-256. Generated output
terms are documented separately from the licensed field-recording library;
the narration is not labeled CC0 or a human location recording.

Scripts describe anonymous interpretations, not surveyed buildings. Cultural
context was checked against UNESCO's regional heritage descriptions and
firsthand or institutional accounts of weaving, listening cafés, herbal
commerce, and neighborhood dining; source links are retained with the relevant
arrival scripts and recordings. Focused texts describe the actual authored
views. Religious ornaments are not assigned invented meanings, herbal shops
do not offer medical advice, and related interior variants have distinct
paragraphs rather than copies of one generic introduction.

Generation is explicit and paid:

```sh
node scripts/generate-opening-narration.mjs \
  --scene riad --locale en-US --locale pt-BR \
  --model gpt-4o-mini-tts --voice cedar

node scripts/generate-opening-narration.mjs \
  --scene riad --locale en-US --locale pt-BR \
  --view fountain --view tea --view cedar --view doorway --view upstairs \
  --model gpt-4o-mini-tts --voice cedar

# Select several complete scenes, with a no-charge preflight first:
node scripts/generate-opening-narration.mjs \
  --scene textile --scene newar-potters-square --all-views \
  --locale en-US --locale pt-BR \
  --model gpt-4o-mini-tts --voice cedar --dry-run
```

Supply `OPENAI_API_KEY` only to the generation process, never to browser source.
Matching assets are checksum-verified and reused without an API key. Changed
inputs require a new asset ID rather than silently replacing provenance.
Every selected cache entry and recipe is validated before any paid request.
`--concurrency 1` is the default; an explicit value from 1 to 4 bounds requests.
One writer checkpoints each successful recording in the manifest. On a failure,
no new work is dispatched, in-flight work finishes, and the command exits with
an error. Rerunning the same selection reuses completed recordings. Run only one
generation command at a time; do not edit scripts or rebuild credits during it.

The viewer selects support from the manifest, not a Marrakech-only condition.
An additional custom scene without recordings retains its ordinary detail
controls and does not show a broken guided-narration panel. A malformed manifest
or a missing language/view in a registered scene produces a visible retry state.
Adding a new bundled scene requires scripts and recordings for every runtime
view in both languages.

## Verification and listening

```sh
npm run check
npm run test:browser
node scripts/check-narration.mjs
# Or a bounded family check:
node scripts/check-narration.mjs --scene textile --scene newar-potters-square
```

The collection checker uses isolated preferences, blocks paid endpoints, plays
every selected recording through the real viewer, checks both languages against
every runtime viewpoint, and verifies disposal. It decodes every MP3, measures
duration, signal level and clipping, checks finite geometry, and saves rendered
views and timing evidence under `outputs/narration-collection/`. Unit checks
also verify exact scripts, request fingerprints, hashes, bilingual coverage,
and individual credits. No MP3 is requested before explicit consent.

The detailed geometry, existing cameras, patina, printed objects, water, and
local ambience are preserved. Voice character, pronunciation, pacing, cultural
interpretation, and the floating presentation remain subject to human listening
and visual judgement; technical checks do not establish photorealism.

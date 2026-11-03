# Soundscapes

## Listening intent

A visitor enables sound, enters a small place, and hears the space extend beyond
the camera: water in the courtyard, cups behind a counter, pages in the reading
room. Music is a separate choice, never a substitute for environmental detail.
The observable outcome is that moving between viewpoints changes the direction,
distance and enclosure of nearby sounds without losing the quiet overall mix.

All twenty-two bundled environments use recorded sound. The common palette is composed
for each architectural family and each outdoor setting, including generated interior variants; it is not a claim
that the recordings were made in those exact locations. Music is a contemporary,
interpretive accompaniment, not a historical reconstruction.

## Controls and consent

**Soundscape** is available on the globe and in every environment. Its panel has
independent ambience and music toggles and volumes, a music selection, **Mute all**,
and an **About the sound & credits** disclosure.

- Both channels default to enabled on a first visit, but playback still waits
  for an explicit **Resume**. Default settings are not saved consent: no audio
  context is created and no recording is requested or decoded until the visitor
  starts playback or an enabled choice is restored from the preference cookie.
  Existing saved mute choices and volumes are preserved; narration remains off
  until selected separately.
  Opening the panel only requests the small credit manifest.
- **Follow the place** uses the selected local track where available and the
  shared Atlas theme elsewhere. **Atlas theme everywhere** keeps the common theme
  uninterrupted while navigating the collection.
- Enabled channels, both volumes and music selection are saved for one year in
  the `atlas-audio-preferences` cookie (`Path=/`, `SameSite=Lax`). Choices follow
  the visitor between the globe, all environments, reloads and later browser sessions.
  On the globe, ambience can be enabled in advance for the next place.
- Restoring an enabled choice attempts playback only in the active document.
  If the browser requires another gesture, the channel offers **Resume** and
  explains that the choice is already saved. Browser restrictions do not silently
  clear consent or turn the saved preference off.
- Hiding the page stops playback, cancels loading, and releases its audio graphs.
  Returning requires an explicit **Resume**. Mute can also cancel pending loading.
- Only one same-origin Atlas tab in the browser profile owns playback. Starting
  audio in another tab stops the previous tab's ambience and music, even if both
  embedded panes report that they are visible. The older tab explains where its
  playback went. A handover does not disable the shared saved preferences.
- **Mute all** saves ambience, music and narration as off. Disposal and page hiding only stop
  playback; they never rewrite saved choices. Cookie failures are shown explicitly.
- All 22 bundled scenes have [prerecorded bilingual guided narration](narration.md).
  It shares one player with detail narration and lowers ambience and music while
  speech plays. Additional object-detail narration uses explicitly requested
  browser speech outdoors or the narration API indoors. Both modes participate
  in playback ownership and stop on tab handover or **Mute all**.
- Audio does not depend on animation time. Reduced motion still permits listening
  and moving between viewpoints, without re-enabling visual animation.

## Composition

| Environment                 | Recorded layers and placement                                                         | Musical choice                       |
| --------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------ |
| Marrakech                   | Fountain in the central basin, birds above the courtyard, occasional tea service      | Middle Eastern-inspired instrumental |
| Kyoto cafes                 | Distant room conversation, counter dishes, preparation-room work surfaces             | Quiet jazz                           |
| Istanbul and Lisbon taverns | Low conversation, service-room dishes, occasional utensils                            | Shared theme                         |
| Hanoi herb shops            | Paper parcels, wooden drawers, a subdued exterior                                     | Shared theme                         |
| European bookshop           | Pages at the main desk and in the reading room, distant birds                         | Shared theme                         |
| Oaxaca workshop             | Sparse work-surface and paper handling, courtyard birds                               | Shared theme                         |
| Kerala kitchen              | A low hearth, utensils, pantry crockery and garden birds                              | Shared theme                         |
| Outdoor squares and lanes   | Subdued distant birds, sparse workshop handling or café service, selected per setting | Shared theme                         |
| Outdoor courts and terraces | Subdued birds with occasional pages or tea service at local activity areas            | Shared theme                         |

Outdoor profiles are keyed by the ten exact scene IDs, with no enclosed-room
portal filtering. They reuse the licensed illustrative palette conservatively;
they do not claim local bird-species or cultural performance authenticity.
No fountain recording is presented as ocean surf or canal water. More specific
outdoor field recordings remain a future acquisition, not synthesized placeholders.

This is an intentionally small shared palette, not an exhaustive ethnographic
sound library. For greater specificity, replace a layer with verified local
recordings rather than increasing clutter, adding intelligible speech, or
stereotyping a place through generic "exotic" music. Do not use recognizably
inappropriate bird species, machinery, language or performances.

## Implementation

`src/client/environments/shared/` owns the reusable audio implementation:

- `soundscape-profiles.js`: family composition, metre-scale source locations,
  conservative relative levels, event spacing and local music assignments.
- `recorded-soundscape.js`: gesture-first Web Audio startup, local loading,
  buffer decoding, overlapping loop fades, sparse events, spatial rendering,
  narration ducking, inspection and complete playback disposal.
- `audio-library.js`: shared credit-manifest loading and validation.
- `atlas-audio.js`: the two independent channels, saved choices, immediate
  outgoing-scene audio cleanup and exclusive music replacement.
- `audio-preferences.js`: validation and cookie persistence, independent of
  the current playback state.
- `audio-focus.js`: same-origin BroadcastChannel handovers. Timestamp/ID ordering
  resolves concurrent claims; every losing player cancels pending loads as well
  as active sources. The channel is closed on disposal.

Environment builders own their ambience controller; the application owns music.
The viewer updates listeners from the actual camera, including its orientation
and height. HRTF panning and inverse-distance attenuation locate sound in the
room. A conservative low-pass filter across the modeled rear-room boundary
suggests enclosure; this is an approximation, not acoustic ray tracing.

Long recordings are decoded once per active controller, not once per loop.
Adjacent loop voices overlap with gain envelopes to avoid hard seams. One-shot
events wait for their own duration plus a random interval, so they cannot pile
up. Nodes disconnect when each voice ends. Music changes dispose the outgoing
controller before starting its replacement; only adjacent voices of the same
loop overlap. Muting disconnects output synchronously and aborts
requests before closing the context. Stopping releases buffers rather than
retaining a growing decoded cache.

Internal navigation retains the application shell, allowing the common theme to
continue. Local ambience and local music are stopped at the beginning of navigation,
not after the next environment finishes loading. The outgoing Three.js
environment, controls, listeners and renderer
are still disposed before the next scene is built. Ctrl/Cmd-click and external
links retain native browser behavior.

## Adding or replacing media

See [audio sources and licenses](audio-sources.md) for the actual collection,
download provenance and acquisition instructions. Every bundled file must appear
in `public/audio/manifest.json`; the app renders those same credits.

1. Confirm permission to redistribute the **recording and composition**, not
   merely use a soundtrack in a finished video. Prefer CC0, documented
   public-domain dedications, or CC BY. Avoid NC,
   ND, unclear uploads, and libraries prohibiting raw-file distribution.
2. Preserve source URLs, creator, exact license/version, acquisition date,
   license evidence, source and output hashes, and every edit. A public-domain
   composition does not make a modern performance public domain.
3. Listen for voices, modern machinery, obvious cuts, electrical hum, and
   cultural or ecological mismatch. Verify suitability yourself; tags are not
   evidence of authenticity.
4. Trim at sensible boundaries, remove excess silence, and normalize
   conservatively. Prefer compressed MP3 for broad browser support. Keep
   ambience short enough for modest decoded memory, without a conspicuous
   repeating event. Keep musical phrasing intact.
5. Add a manifest entry, then reference its ID in a family profile. Use source
   positions corresponding to actual objects or connected spaces, not arbitrary
   stereo effects. Events need long enough intervals for a calm room.
6. Tune with headphones and speakers at the default volumes. Test all original
   viewpoints and connected spaces; foreground detail must not overwhelm the
   room, and music must not mask the evidence of daily life.

Do not hotlink playback to a third-party host, ship a secret API key, or require
network generation. New assets belong under `public/audio/`, with their licenses,
not the ignored runtime cache.

## Verification and human judgement

Run `npm run check` and `npm run test:browser`. Browser coverage must include real
local asset decoding, mute during loading, failed requests and retries, repeated
toggles, page hiding, narration ducking, scene changes, credits, keyboard dialog
behavior, and compact layouts. Inspect `getAtlasAudio().inspection` from
`src/client/main.js` and `getActiveViewer()` for live resource information.

Compare frame timings with audio off and on using the same scene, camera,
viewport and reduced-motion preference. Record decoded-buffer bytes and ensure
source counts remain bounded over loop boundaries and drop to zero on mute.
Do not reduce visual detail to meet an audio performance budget.

Before images and original source are preserved under `outputs/soundscapes/`.
These are local review artifacts, not distributed assets. Passing checks proves
playback and lifecycle behavior, not that the mix sounds natural: the running
listening walkthrough remains subject to human judgement.

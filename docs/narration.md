# Narration

Marrakech is the first bilingual narration pilot. Its arrival and five focused
views have original, prerecorded cultural explanations in **en-US** and
**pt-BR**, using OpenAI's `gpt-4o-mini-tts` model and `cedar` voice. The arrival
recordings last about 29 and 38 seconds; focused recordings last 14–23 seconds.
The voice is explicitly disclosed as AI-generated.

The global language selector changes both interface text and the recording,
without rebuilding the scene or moving the camera. The compact floating panel
shows the spoken paragraph, play/pause, elapsed time, automatic narration consent,
and a minimize control. Longer paragraphs remain scrollable.

## Playback and consent

The first visit is silent until **Play** or the narration setting is enabled.
Playing explicitly enables subsequent automatic narration on arrival and view
changes. Browsers that block automatic playback show a visible Play request.
Existing audio cookies retain their music, ambience and volume choices; the new
optional `narrationEnabled` field starts off. **Mute all** turns all three choices
off and saves them. Language is a separate global preference.

Clicking a named view selects its narration. Moving within 1.1 metres of its
viewpoint and looking toward its subject (direction cosine at least 0.94) for
1.1 seconds also selects it. A sustained look triggers once, not on every frame.
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

Generation is explicit and paid:

```sh
node scripts/generate-opening-narration.mjs \
  --scene riad --locale en-US --locale pt-BR \
  --model gpt-4o-mini-tts --voice cedar

node scripts/generate-opening-narration.mjs \
  --scene riad --locale en-US --locale pt-BR \
  --view fountain --view tea --view cedar --view doorway --view upstairs \
  --model gpt-4o-mini-tts --voice cedar
```

Supply `OPENAI_API_KEY` only to the generation process, never to browser source.
Matching assets are checksum-verified and reused without an API key. Changed
inputs require a new asset ID rather than silently replacing provenance.

The recordings describe a fictional courtyard informed by Moroccan architecture,
not a surveyed building. Voice character, timing and the floating presentation
remain subject to the user's listening judgement.

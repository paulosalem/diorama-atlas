---
name: narrate-dioramas
description: Add or revise Diorama Atlas cultural narration and global English/Brazilian Portuguese text. Use for prerecorded arrivals, focused-view passages, voice generation, transcript behavior and bilingual coverage.
---

# Narrate dioramas

Read [narration](../../../docs/narration.md), [localization](../../../docs/localization.md),
the scene brief and the current runtime views. A narration explains the cultural
value of what is actually visible, not a generic travel description.

1. Author a short arrival paragraph and a distinct passage for every supported
   view in **en-US and pt-BR**. Use a serious, measured documentary voice.
   Preserve anonymity and interpretive caveats; verify cultural claims against
   sources, including local/institutional accounts where available. Do not
   invent sacred meanings, medical advice or authentic inscriptions.
2. Update `scripts/prompts/opening-narration.json` and global presentation
   dictionaries. Translation applies to controls, descriptions, errors and
   transcripts—not only audio. Keep scene IDs, view keys and cameras stable.
   Use `prepare-narration.mjs` to inventory and append missing Miniature and
   object-detail passages, reusing exact existing text in the same language.
3. Use `generate-opening-narration.mjs --help`, then an explicit scene/view,
   language, model and voice selection with `--dry-run`. The current collection
   uses `gpt-4o-mini-tts` and `cedar`; do not silently substitute voices or models.
   Report the pending generation scope and obtain permission before paid calls.
4. Run one bounded generation writer with `--max-cost-usd` and `--budget-file`.
   The usage-bearing speech stream records actual token costs; unresolved calls
   keep their safety reservation across retries. Never reset a spent budget.
   Reuse verified matching assets; changed
   inputs require new asset IDs, not overwritten provenance. Preserve exact
   text, instructions, fingerprints and audio hashes. Never print credentials.
5. Rebuild credits. Use the existing shared narration element, floating panel,
   play/pause and look/view triggers. Preserve ducking, single-tab ownership,
   locale changes, saved consent, blocked-autoplay Resume, mute, page hiding
   and scene-exit cancellation. Do not create an independent player.
6. Run source/browser checks and `check-narration.mjs` for the selected scenes.
   Verify every view/language pair, actual playback and decoding, matching text,
   signal level, clipping and release. Inspect real look/zoom triggers as well as
   named-view clicks. Check transcript and detail controls by bounds and
   hit-testing on compact portrait **and landscape** layouts.

Keep the whole visit provider-free. Guided views, object details and Miniatures
all use bundled OpenAI recordings, including on Pages; never fall back to browser
speech or initiate paid requests during playback. New custom scenes
without recordings may omit a guided panel, but a new **bundled** scene is not
complete until its full bilingual coverage is present.

Technical checks do not approve voice character, pronunciation, pacing or
cultural interpretation. Present a listening walkthrough for human judgment.

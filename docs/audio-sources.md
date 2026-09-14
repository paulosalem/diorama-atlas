# Recorded sound palette

The bundled audio consists of **real environmental/object recordings and
official instrumental music recordings**, not synthesized ambience. The
palette is shared interpretively across scenes; it is not a documentary
collection of recordings made in the depicted places.

The authoritative inventory is
[`public/audio/manifest.json`](../public/audio/manifest.json). Its
`{ "assets": [...] }` structure records, for every asset:

- Stable ID, title, creator, source page, direct download, recording type,
  license name and URL.
- Served URL beginning `/public/audio/`, duration in seconds, byte count,
  and intended looping or sparse one-shot use.
- Complete local edit history, SHA-256 of the served file, and SHA-256 of the
  downloaded original.
- Ready-to-display attribution and the served URL of adjacent license
  evidence. Environmental assets also link to preserved per-file source
  metadata and license declarations.
- Measured integrated loudness and true peak, channel count, and estimated
  decoded float32 sample bytes at a 48 kHz playback-context rate.

The mandatory fields are `id`, `title`, `creator`, `sourceUrl`, `license`,
`licenseUrl`, `file`, `kind`, `description`, `edits`, and `sha256`. `edits` is
an array of strings; `kind` is `ambience`, `foley`, or `music`. All IDs and
served paths remain stable after shortening and normalization.

Acquired on **2026-09-14**. The eleven media files total **7,368,786 bytes**
(7.37 MB decimal / 7.03 MiB), below the 25 MB target. License texts and
provenance are additional small text files.

## Environmental recordings and sparse foley

| ID                   | Source creator | Duration |   Bytes | Intended use                                               |
| -------------------- | -------------- | -------: | ------: | ---------------------------------------------------------- |
| `fountain-courtyard` | aldor          |     28 s | 336,710 | Continuous fountain water; Marrakech courtyard             |
| `garden-birds`       | ezwa           |     28 s | 336,710 | Quiet shared exterior/garden layer                         |
| `room-murmur`        | ezwa           |     26 s | 312,886 | Very quiet, obscured next-room activity; cafes and taverns |
| `service-dishes`     | starlite       |    3.5 s |  42,675 | Occasional dish handling in service rooms                  |
| `paper-pages`        | planish        |  3.370 s |  41,108 | Occasional book page or paper handling                     |
| `wood-work`          | thore          |  2.351 s |  28,883 | Occasional wooden board/utensil contact                    |
| `wood-drawer`        | Gravity Sound  |      2 s |  24,808 | Occasional shop/dispensary drawer movement                 |
| `cooking-fire`       | ezwa           |     22 s | 264,925 | Quiet real hearth crackle; Kerala kitchen                  |

All of these except `wood-drawer` carry **public-domain author dedications**
preserved by Wikimedia Commons from PDSounds. The original creators, not the
Commons transfer uploader, are credited. They are explicitly **not** labelled
CC0. PDSounds required contributors to release their recordings into the public
domain, with unrestricted commercial use; each included file separately
contains a named-author `PD-author` declaration. The dedicated rights are in
the **recording itself**, not an underlying old musical composition.

`wood-drawer` is **CC BY 4.0**, by Gravity Sound. Its Commons file page retains
the individual grant and links to the original artist's free-library release
and archived permission pages. The old artist page currently returns 404;
the retained provenance is the Commons per-file documentation, not a claim
that the retired original page was successfully retrieved.

See [`PUBLIC-DOMAIN-PDSOUNDS.txt`](../public/audio/licenses/PUBLIC-DOMAIN-PDSOUNDS.txt),
[`CC-BY-4.0.txt`](../public/audio/licenses/CC-BY-4.0.txt), and the individual
`public/audio/licenses/<id>.txt` files. The `licenses/sources/` directory
preserves the retrieved Commons metadata, original source descriptions,
original download links, permission statements, and per-file wikitext
license declarations.

### Processing and arrangement

- Environmental files are mono, 44.1 kHz, 96 kbit/s MP3. Music is stereo,
  44.1 kHz, 160 kbit/s MP3. All were prepared from the acquired originals,
  not from the previous delivered MP3 edits.
- Two-pass EBU R128 normalization targets **-23 LUFS integrated** and
  **-4 dBTP**, leaving a 1 dB encoding margin below the **-3 dBTP** delivery
  ceiling. Exported MP3s were decoded and measured again; corrections were
  rendered from lossless intermediates where needed. Continuous ambience
  and music measure -23.01 to -22.99 LUFS.
- Short wooden transients prioritize peak protection over extra compression:
  `wood-work` measures -26.91 LUFS / -3.39 dBTP and `wood-drawer`
  -25.30 LUFS / -3.19 dBTP. Other foley measures -23.10 to -22.99 LUFS.
  These exceptions are explicit in each asset's `loudness` and `edits`.
  Every file measures **at or below -3 dBTP** after encoding.
- The four ambience beds have a one-second complementary tail/head
  crossfade, arranged as a circular loop without adding synthetic noise.
  Their durations are **22–28 seconds**, all below 30 seconds. The crossfade
  follows normalization; final loudness and loop boundaries are measured
  after encoding.
- Foley is deliberately **short**, with 25 ms edge fades. Do not stretch it
  into a constant noise bed or loop it continuously. Schedule single events
  at irregular, restrained intervals with substantial quiet between them.
- `room-murmur` originates in a real next-room group recording. Two 280 Hz
  low-pass stages and three circular time offsets obscure separate voices;
  this is intentionally indistinct background activity, not foreign-language
  dialogue. Keep it much quieter than close object activity. Do not represent
  it as a recording of Moroccan, Japanese, Turkish, Portuguese or Vietnamese
  conversation.
- Music is normalized to the same predictable loudness target as ambience.
  It still needs a restrained playback gain and gentle transitions; matching
  loudness does not mean music and close foley should be equally prominent.

### Decoded-memory budget

At a **48 kHz playback-context rate**, loading every asset as float32 PCM
requires approximately **136,869,060 sample bytes** (130.53 MiB), down from
219,986,600 bytes (209.80 MiB) for the earlier long palette: a **37.8%**
reduction. These figures exclude browser, decoder, compressed-buffer and
node overhead. MP3 byte size alone is not a decoded-memory budget.

The largest single music buffer is `music-atlas-theme`: **42,130,288 bytes**
(40.18 MiB). Load the active scene's palette and selected music on demand,
and release or evict unused buffers rather than decoding the whole library
at startup. `decodedBytesAt48000Hz` makes this cost explicit per asset; it is
an estimate for 48 kHz, not a promise about every device's context rate.

### Cultural and acoustic limits

The fountain was recorded in **Toulouse, France**, and the garden birds in
the **Belgian countryside**. They are useful quiet material/atmosphere
references, not evidence of local bird species or place-authentic sound.
Use the bird layer cautiously and quietly in tropical scenes.

The dish source documents putting dishes away; it does **not** specifically
identify a porcelain cup. The work-surface source is a wooden board with
cutlery; it is **not a loom recording**. These can serve as restrained interpretive foley, but
must not be labelled literal loom, fibre or tea-ceremony recordings.
The fire is dry grass burning in an open fireplace, not simmering food.

Suggested sharing:

- **Marrakech:** fountain and distant birds; optional interpretive
  `music-marrakech`.
- **Kyoto cafes and variants:** quiet room activity, occasional dishes;
  optional `music-kissaten`.
- **Istanbul and Lisbon service rooms:** quiet room activity, occasional
  dishes and work-surface contacts.
- **Hanoi herb shops:** paper and drawer handling; sparse distant
  exterior birds where appropriate.
- **Imagined Central European bookshop:** paper and drawer movements;
  avoid filling the reading room with a constant crowd.
- **Oaxaca weaving workshop:** sparse work-surface foley as
  explicitly interpretive accents, not a claim of an actual recorded loom.
- **Kerala kitchen:** quiet hearth, work-surface activity and very
  restrained garden birds.

## Music: composition and recording rights

The music files were downloaded directly from the official
`incompetech.com/music/royalty-free/mp3-royaltyfree/` links selected by the
artist's catalog. The original source hashes are retained separately from
the newly normalized/edited deliverable hashes. **Desert City retains its
full duration**; the other two tracks are shorter opening excerpts with
gentle end fades. No track exceeds 120 seconds. Both composition and the
artist's supplied recording are covered by
the individual-track **CC BY 4.0** offer. No paid Standard License,
subscription, or noncommercial restriction is being substituted.

| ID                  | Official title / ISRC                                                                                             |  Duration |     Bytes | Role                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | --------: | --------: | ----------------------------------------------------- |
| `music-atlas-theme` | [Dream Culture](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1300046) / USUAN1300046           | 109.714 s | 2,195,374 | Calming piano/percussion app theme                    |
| `music-marrakech`   | [Desert City](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100564) / USUAN1100564             |  89.365 s | 1,788,386 | Interpretive Middle-Eastern-style percussion/dulcimer |
| `music-kissaten`    | [Local Forecast - Slower](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1300011) / USUAN1300011 |  99.740 s | 1,996,321 | Relaxed modern jazz-hybrid cafe music                 |

All three are by **Kevin MacLeod**. The artist describes _Desert City_ as
“Middle Eastern atmospheric, sort of chill”; this is **not** a claim that it
is Moroccan, traditional, Arabic classical music, or historically authentic
to the scene. _Local Forecast - Slower_ is a modern jazz hybrid, not a
historical Kyoto recording.

The _Dream Culture_ and _Local Forecast - Slower_ excerpts end at 32
nominal four-beat bars using the catalog tempos of 70 and 77 BPM. They fade
out over 3.429 and 6.234 seconds respectively, rather than stopping sharply;
both have 25 ms onset fades. This is a metric-guided edit, **not a
score-verified or listener-verified claim about phrase boundaries**.

The original catalog describes _Desert City_ as easy to loop and the
complete _Local Forecast - Slower_ as cleanly looping. Existing `loop` flags
retain their transport intent, but the shortened jazz excerpt now repeats
with a gentle fade, not a claimed sample-perfect original seam. The piano
theme remains finite (`loop: false`). Use gentle transport transitions when
repeating music, and judge the shorter musical arcs by listening.

Required visible credits, also supplied in the manifest:

> “Dream Culture” Kevin MacLeod (incompetech.com)  
> Licensed under Creative Commons: By Attribution 4.0 License  
> https://creativecommons.org/licenses/by/4.0/

> “Desert City” Kevin MacLeod (incompetech.com)  
> Licensed under Creative Commons: By Attribution 4.0 License  
> https://creativecommons.org/licenses/by/4.0/

> “Local Forecast - Slower” Kevin MacLeod (incompetech.com)  
> Licensed under Creative Commons: By Attribution 4.0 License  
> https://creativecommons.org/licenses/by/4.0/

Keep an easily discoverable in-app credits surface with title, author, source
and license links. The repository documentation alone does not replace
visible application attribution. Preserve the Gravity Sound attribution
and note its local edits as well. The manifest credits additionally state
that music was normalized and, where noted, excerpted with fades for Diorama
Atlas. None of the creators endorses this app.

[`incompetech-license-evidence.txt`](../public/audio/licenses/incompetech-license-evidence.txt)
preserves the official FAQ's explicit distinction between composition and
recording rights, its attribution requirements, and the individual-track
license template. Each track's evidence file includes its official catalog
entry, ISRC, attribution, source URL, download URL and hash. The complete
CC BY 4.0 legal text is retained adjacent to the recordings.

## Validation and remaining human judgement

The files are downloaded media, not HTML login/error responses. The retained
[`verification.json`](../public/audio/licenses/verification.json) report records
the technical results. Validation
decodes every complete recording and excerpt, checks nonempty finite sample
data and MP3 headers, and compares every served byte count and SHA-256 with
the manifest. Environmental loop boundaries, integrated loudness and true
peak are checked after MP3 decoding, as are the duration limits.
The manifest durations are decoded media durations rather than catalog
rounding.

Loudness measurements use the delivered channel layout, including stereo
music, rather than a diagnostic mono downmix. Retained true-peak figures
measure the decoded MP3, not only the pre-encoding intermediate.

These are technical checks, not a claim that human listening has occurred.
Final listening in the running app should assess low-level room intelligibility,
fountain/background noise, scene balance, event density, music transitions
and cultural fit. No automated speech-recognition result is being presented
as proof of anonymization or historical authenticity.

Audio must remain silent until explicitly enabled, support immediate muting,
stop while the page is hidden, and release runtime resources on disposal.
These files do not themselves implement that playback lifecycle.

## Source access notes

For another Commons recording, begin with its **file-description page**, not a
search-engine preview. Retrieve the original URL and per-file rights metadata:

```sh
mkdir -p .cache/audio-curation
curl --fail --location --retry 3 --get \
  'https://commons.wikimedia.org/w/api.php' \
  --data-urlencode 'action=query' \
  --data-urlencode 'format=json' \
  --data-urlencode 'prop=imageinfo' \
  --data-urlencode 'iiprop=url|extmetadata' \
  --data-urlencode 'titles=File:Fountain in toulouse.ogg' \
  --output .cache/audio-curation/source-metadata.json
```

Inspect `imageinfo[].url` and `imageinfo[].extmetadata` before downloading.
Also preserve the file page's named-author permission declaration; an uploader's
name alone is not a rights grant. Fetch sequentially, honor rate limits, and
reject unclear provenance.

For Incompetech, search the official catalog, retain the selected track's **ISRC**
and individual license, and use the official Download link. Do not infer that
an unrelated artist or mirror has the same terms. Preserve originals in the
ignored curation directory, edit from those originals rather than repeatedly
re-encoding delivered MP3s, then add the final asset and evidence to the manifest.
The app's playback and credit entry must reference that same ID. See
[adding media to the soundscape](soundscapes.md#adding-or-replacing-media) for
selection, mixing and integration.

- Commons' public API and original-media URLs worked. Some concurrent API
  requests returned 429; serialized retrieval with retry succeeded.
- The old PDSounds links are retained as provenance; Commons preserves both
  the recordings and their named-author dedication evidence.
- Incompetech's track pages render from its official `pieces.json`. The
  individual ISRC selection, attribution template, catalog entries, official
  downloads, license page and FAQ were checked together, rather than treating
  a JavaScript-only empty page as license evidence.
- OpenGameArt discovery returned minimal pages or 404s; it was not used.
  Freesound's blocked/login-like route was not needed.
- A real mint-handling candidate was downloaded but rejected: its selected
  excerpt was dominated by isolated impulses and was too quiet between them
  to make a useful restrained foley asset. It is not bundled.
- **No Sonniss files**, restrictive sound-library licenses, paid APIs,
  synthetic replacement sounds, or generated imitations are included.

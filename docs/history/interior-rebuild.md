# Interior rebuild — 2026-09-13

> Historical notes imported from Codex. The validation claims below describe that
> earlier session, not the current repository checks. Source paths have since
> moved under `src/client/`; referenced review galleries and validation artifacts
> are not included in a fresh checkout.

Replaced the eleven remaining atlas entries with full-scale interiors. The approved Marrakech riad scene and its material files are unchanged. All entries retain their original titles, descriptions, reference images, and saved definitions.

The new collection has six scene families: Kyoto kissaten, Istanbul/Lisbon dining rooms, Hanoi herb shops, Oaxaca weaving, Kerala courtyard kitchen, and European bookshop. Every entry has four eye-height viewpoints, drag/keyboard look controls, zoom, expandable viewing, and connected detail markers.

Removed the old primitive scene builders and recursive box overlays from main.js. The shared environment kit owns geometry, scanned materials, window openings, lighting, reflection maps and cleanup. The original riad controller was replaced by a controller that accepts each environment’s viewpoints. The previous generated texture/review pathway no longer overwrites these rebuilt spaces.

References: existing hero images and descriptions under .cache/concepts and .cache/generated-scenes. Materials: existing CC0 Poly Haven maps documented in public/riad/materials/manifest.json, plus plastered_stone_wall documented in public/interiors/materials/manifest.json. Reference images are design guides; these are interpretive reconstructions, not measured surveys or photogrammetry. The result remains visibly computer-rendered.

## Validation

- Twelve atlas entries render, with four working viewpoint buttons each (48 screenshots in this folder).
- Reset, keyboard look/zoom, detail selection, narrow-screen controls, and Escape from expanded viewing passed.
- No browser runtime or console errors in the recorded run; no non-GET requests were made.
- Repeated Kyoto/Istanbul switching returns to the same geometry and texture counts: 53 geometries / 44 textures for Kyoto; 37 geometries / 48 textures for Istanbul. Explicitly owned PMREM maps fix the discovered per-scene reflection leak.
- Final material refinements include neutral glass, legible cabinet labels, correctly oriented fabric mapping, aged plaster, and period bookshop lamps.
- See validation.json for recorded performance and interaction results. Performance figures are short local browser samples, not a device-independent benchmark.

## Review

The original workspace had a gallery at `outputs/interior-review/index.html`.
That generated output is not included or served by the organized repository.
Run `npm start` and use `http://127.0.0.1:4183/?scene=ENTRY_ID&inspect=1` to
inspect a live entry.

## File recovery

The original project had been evicted by iCloud, and reads hung. Shell diagnostics identified a stalled iCloud file-provider worker. Restarting that worker restored the project files. No Finder work by the user was needed. Rebuild edits were made only after the existing source became readable.

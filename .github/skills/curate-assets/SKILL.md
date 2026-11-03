---
name: curate-assets
description: Find, inspect, license and integrate Diorama Atlas photographs, material scans, models, printed imagery or recorded audio. Use when adding realistic references or replacing placeholder media; preserve provenance and consolidate About credits.
---

# Curate assets

Read [asset provenance](../../../docs/assets.md), the affected scene brief and
the relevant [outdoor](../../../docs/outdoor-collection.md) or
[audio acquisition](../../../docs/audio-sources.md) guide.

1. Identify the exact gap and viewing scale. Prefer approved local assets or
   suitable licensed downloads over unnecessary generation. Do not acquire
   more material merely to increase the asset count.
2. Inspect the actual photograph, texture, model or recording. Verify subject,
   physical scale, orientation, quality and cultural/period suitability.
   Distinguish generic scans from measurements of the referenced building.
3. Verify redistribution terms at the original source, including authorship,
   attribution, modifications and relevant recording/composition rights.
   An accessible URL is not permission. Do not use unverified, incompatible,
   noncommercial or no-derivatives media where the intended distribution or
   adaptation is not permitted.
4. Preserve source URL, creator, license/version/link, retrieval evidence,
   processing, local path and cryptographic hash in the existing manifest.
   Generated assets additionally need exact prompt, provider/model, recipe and
   disclosure. Obtain task-specific permission before paid generation; never
   expose keys or private input in an artifact.
5. Integrate through the shared readiness-aware loaders. Use real imagery for
   covers, pages, labels and appropriate wall prints; retain physical paper and
   curved label geometry. Preserve artwork when applying patina. Models need
   plausible scale, support and complete disposal, not just a successful load.
6. Rebuild consolidated attribution with `npm run build:credits`, then inspect
   About, language behavior and asset links on both local and static paths.
   Run relevant manifest/hash, browser and rendered-detail checks.

Keep only approved runtime material in `public/`. Put rejected downloads and
review output in an explicitly named ignored evidence directory; preserve
valuable originals before cleanup. Never redistribute an unverified legacy model
just because it previously appeared in the repository.

For audio, use the shared recorded soundscape profiles/controller and keep
the mix illustrative. Do not mislabel species, recording locations or water
sounds. For printed layouts, use the existing print-library builder and record
its source imagery rather than creating an uncredited one-off texture.

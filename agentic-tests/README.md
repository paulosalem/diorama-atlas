# Agentic visual reviews

The outdoor-realism suite evaluates the actual running 3D environments, not
implementation intent or geometry counts. Follow Paulo's user-level
`agentic-tests` skill for selection, independent runners, isolation and evidence.

Run the selector before dispatch:

```sh
python ~/.agents/skills/agentic-tests/scripts/select_tests.py agentic-tests/outdoors
```

The author must not grade the result. For the requested three additional passes,
use a fresh independent runner for each complete collection review, fix findings
between passes, and keep each pass under its own `outputs/agentic-tests/` folder.
Each pass must report every criterion for every one of the ten settings.

Photographic appearance is a visual acceptance criterion. A functional pass does
not imply a photographic pass, and an obviously computer-rendered view must not
be called hyperrealistic. Keep failed findings and evidence rather than weakening
the rubric to match the implementation.

## Snapshot isolation

Create a new snapshot with
`node scripts/snapshot-outdoor-review.mjs --snapshot-dir outputs/agentic-tests/REVIEW/application`.
The command copies canonical source, bundled scene data, tools, public assets,
installed dependencies and local caches. Its `review-snapshot.json` records
source hashes; copied source is read-only and no dependencies link back to the
author workspace. From the snapshot directory start
`ATLAS_CACHE_DIR=.cache PORT=4185 node src/server/index.mjs`.
The coordinator must verify its HTTP response and retain the exact process
handle for teardown, including when a review fails.

Set `ATLAS_REVIEW_URL` to that server and `SCRATCH` to a separate evidence
directory under `outputs/agentic-tests/REVIEW/`, outside the application snapshot.
All browser artifacts belong there. Do not modify, rebuild or install into the
snapshot. Browser diagnostics dynamically import `getActiveViewer()` from
`/src/client/viewer/panorama-viewer.js`; use `selectView(key)` and `lookAt(point)`
on the returned controller. There is no window-global viewer alias.

## Historical evidence

The three completed passes under `outputs/agentic-tests/2026-09-14/` remain
historical evidence from their original immutable snapshots: 30 setting
inspections, 300 criterion judgements, and a final photographic-read result of
**0/10 pass**. Preserve all pass findings and the separate Naxi support-repair
record. Neither organized-source migration nor shared recorded audio constitutes
a new visual verdict. Fresh reviews need new directories and independent runners;
do not rewrite earlier results or screenshots.

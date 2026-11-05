---
name: improve-diorama-realism
description: Deepen realism, atmosphere and meaningful detail in one Diorama Atlas scene, selected scenes, a family or the collection. Use for repeated realism passes; challenge the latest result, implement perceptible improvements and preserve matched evidence without treating previous approval as a ceiling.
---

# Improve diorama realism

**Every invocation starts a new search for what still looks or feels artificial.**
An approved scene, completed checklist, previous improvement pass or successful
test is a baseline, never a reason to return "already realistic enough."
Double down on observation, physical relationships and perceptible fidelity,
not automatically on object counts, dirt, saturation, bloom or expense.

This skill authorizes improvement only within the user's requested scope.
For inspection without edits, use [review-dioramas](../review-dioramas/SKILL.md).
For a new place, use [create-diorama](../create-diorama/SKILL.md), which includes
this correction discipline from the beginning.

## Required context and scope

Read `AGENTS.md`, the entire [quality standard](../../../docs/diorama-standard.md),
[philosophy](../../../docs/philosophy.md), affected
[scene briefs](../../../docs/scenes/README.md),
[capture and verification guide](../../../docs/development.md), and the
[generalized examples](references/examples.md). Consult previous evidence and
the [collection realism record](../../../docs/collection-realism.md), but inspect
the current running scene yourself.

Interpret the text after `/improve-diorama-realism` as the scope and direction,
not as arguments to a new CLI:

```text
/improve-diorama-realism riad
/improve-diorama-realism douro-vineyard, textile
/improve-diorama-realism all Lisbon variants
/improve-diorama-realism all dioramas
/improve-diorama-realism douro-vineyard miniature; focus on ground and life
/improve-diorama-realism riad again; push beyond the previous pass
```

Resolve names and IDs against the current catalog, not a hardcoded scene count.
If no target is supplied, use an unambiguous current scene; otherwise ask which
scene or collection. List the exact targets, variants and experience versions.
A focus directs improvement priorities; it does not waive the other quality
criteria. Do not interpret "again" as repeating the previous edits.

Preserve cultural setting, maintained condition, approved composition, cameras,
navigation and unique saved variants. A new engine, floating presentation,
characters, simulated vehicles or major redesign is not implicitly authorized.
Shared-helper changes require checking every affected consumer; explicitly
record the expanded regression scope rather than quietly redesigning it.

## 1. Establish a fresh, recoverable baseline

- Inspect the working tree and preserve unrelated changes. Save the current
  source and before captures before editing; do not reset or replace prior work.
- Start a unique evidence directory under
  `outputs/realism-improvements/<run-id>/`. Never overwrite an earlier invocation.
  Record source identity, dirty state, target IDs/versions, cameras, viewport,
  motion setting and renderer. Link the previous run when one exists.
- Verify server responsiveness and actual viewer readiness. Capture every named
  view, reverse/connected views, closest supported details and compact layouts.
  Add time-separated water/motion evidence and an opt-in listening inspection.
- Record comparable frame timings and resource counts. Run GPU-heavy checks
  sequentially. Track wall-clock time and reassess slow or unproductive work.

The immediate before state must be today's source, not an older flattering
baseline. Retain earlier approved references as additional regression evidence.

## 2. Find the strongest remaining evidence of artificiality

First ask, without a checklist: **What makes this look rendered, staged, empty,
weightless, repetitive or unlike an inhabited place? What breaks the feeling
of being there?** Then inspect every row below for every target and variant.

| Lens                         | Look for and improve                                                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Place and composition        | Cultural specificity, mood, time/weather logic, focal hierarchy and beauty; avoid generic motifs, showroom staging and universal warm filters                    |
| Space and construction       | Real thick apertures, useful connected spaces, parallax, clear routes, human scale, credible joints, support/contact and actual cavities                         |
| Material truth               | Physical grain scale/direction, distinct optical response, piece-level variation, anti-repetition and exposure/use-specific patina; protect ornament and imagery |
| Occupation and microdetail   | Related tools and tasks, interrupted activity, readable functional parts, cloth weight/contact, small purposeful disorder and signs of maintenance               |
| Printed objects              | Actual covers/pages/labels/menus/sleeves/wall imagery, curved labels, paper thickness and handling; not blank colors or meaningless marks                        |
| Terrain and living structure | Shaped terrain, grounded stones, worn routes, coherent planting/soil, connected stems, leaf curvature and fruit; no green blobs or identical stamps              |
| Light and atmosphere         | Architectural daylight, practical sources, bounce, contact shadows, darker recesses, truthful reflections and restrained motivated particles                     |
| Water and motion             | Irregular coherent flow and reflections, appropriate scale, wet edges, local disturbance, hull/bridge/bank clearance; anchored, asynchronous foliage and cloth   |
| Sound and explanation        | Believable spatial ambience, sparse events, appropriate optional music, readable bilingual narration and unobtrusive controls; no competing players              |
| Experience and durability    | Close/reverse views, narrow and short-landscape layouts, motion/audio consent, navigation, static paths, performance and complete resource cleanup               |

Compare actual renders with appropriate real photographic references at spatial,
construction and object scales. A generated reference is an art-direction aid,
not documentary evidence. Mark non-applicable lenses with a reason; an absence
such as no water does not require adding water.

### Refresh the photographic evidence when needed

The existing reference set is not a ceiling either. If it lacks a close-up,
reverse angle, construction detail or lighting condition, or a pass is running
out of well-grounded improvement ideas, seek additional real photographs.
Look for comparable objects and materials at multiple scales: overall profile,
cross-section and joints, then grazing-light or macro views of grain, cracks,
chips and surface relief. Inspect the actual images, not search thumbnails.

Record the source, rights and the specific observation each useful image adds.
Separate an observed feature from an inference about hidden construction.
Use new evidence to discover finer details and plausible alternatives, not to
copy a different culture or redesign the scene without authorization. Prefer
suitable licensed sources; downloading/reusing imagery must respect its rights.
Do not substitute invented details or unapproved paid image generation when
photographic evidence is missing.

Record concrete findings, not only ratings. Use a ledger with target/view,
visible defect, physical or perceptual cause, proposed correction, expected
visible gain, evidence and status. Rank by effect on presence and correctness;
fix broken space or lighting before spending the pass on tiny hidden props.

When a user identifies one impossible junction or repetitive surface, treat it
as evidence of a possible construction or material rule failure. Audit its
siblings and the shared mechanism, not only the circled pixels. Use the
[construction-to-experience checks](references/examples.md#construction-to-experience-checks)
to examine layout, shared boundaries, negative space, roofs, finish, activity
and light together. Apply only the relationships appropriate to the setting;
irregularity, attached buildings, distressed paint and warm sun are not universal
requirements.

Even when the old checklist passes, examine the next weaker scale or relationship:
an open room may still be empty, varied wood may still have oversized grain,
and moving water may still have unrelated reflections. Do not invent defects
or damage a good composition just to create a diff.

## 3. Implement a coherent improvement, not a cosmetic workaround

For each target, choose corrections that will produce an identifiable improvement
in the supported experience. State the intended before/after difference before
editing. Address interacting causes together: a tool implies a task, a surface,
ground contact, lighting and perhaps a sound source.

Work from dependencies outward: route and elevation logic; adjoining solids
and intentional voids; functional object shapes; material variation; activity
and atmosphere. Fix a generic layout or unclosed stair margin before disguising
it with pots. Fit shared walls, unequal parcels and roof junctions explicitly;
increasing polygon density cannot correct disconnected construction by itself.
Retain purposeful openings and distinguish architectural plausibility from
any claim of engineering safety.

### Refine actual shape, not only its material

Actively look for primitives still standing in for complex forms. A wooden stick
is not adequately described by a textured box: depending on its manufacture
and condition, it has taper, bends, changing cross-sections, softened or chipped
edges, knots, splits, end structure and fine surface relief. Investigate equivalent
shape complexity in stone, pottery, bark, cloth, metalwork and other materials.

Increase polygon density and refine topology where the observed form needs it.
Use shaped profiles, local subdivision, sculpted/procedural meshes or actual
geometric displacement to resolve fine irregularities, fissures and relief.
Many small polygons can be necessary; the current mesh density is not a quality
ceiling. Subdivision without shape change, arbitrary vertex noise and a crack
texture painted on a smooth box do not establish this improvement.

Judge silhouette, parallax, contact, self-shadow and grazing-light response
from close, oblique and reverse views. Use geometry wherever those relationships
need actual depth; retain normal/roughness textures for detail they can faithfully
represent. Do not narrow the supported zoom or hide an object to excuse a coarse
mesh. A maintained, planed board may keep its overall straight construction;
nuance should follow evidence rather than turn all timber into damaged branches.

Measure the cost, reuse/instance compatible rich meshes and concentrate density
where the form demands it. Distance simplification must restore the fine shape
on approach without visible degradation. Optimize the implementation to support
greater fidelity; if a genuine resource limit blocks it, report that explicitly
rather than quietly reverting to primitives or declaring them sufficient.

Reuse the shared environment, rendering, water, print and audio mechanisms.
Keep scene-specific composition separate. A generated packet cannot implement
new geometry merely by describing it; fix the appropriate family builder when
the requested detail exceeds its capabilities. Use licensed bundled assets first.
No paid generation, new engine installation, extra agents, publication or
destructive cleanup is authorized by this skill alone.

Do not hide failures with camera changes, darkness, extra overlapping surfaces,
weaker assertions, omitted variants, lower detail or a more favorable benchmark.
Preserve truly animated objects and printed/transparent materials when batching
or exporting. Optimize visibility and redundant render work, not away the detail
the user is meant to inspect.

Preserve unrelated procedural results as well as authored placements: adding
geometry or assigning texture scale must not inadvertently advance a shared
random sequence and rearrange existing plants, paving or props. Prefer stable,
independent variation inputs when extending shared mechanisms. Group meshes by
compatible geometry attributes and material behavior; a new vertex-color
attribute can invalidate an otherwise familiar batch. Verify actual assembly,
the affected shared consumers and resource disposal after such changes.

## 4. Correct and re-inspect completely

The default invocation includes the initial inspection followed by **three
complete correction/re-inspection rounds** for each target. Each round follows
the complete lens table and all affected views/variants, using fresh rendered
evidence after corrections. Three topic checks or three reviews of one screenshot
are not three rounds. Fix new regressions before pursuing further embellishment.

Explicit user limits take precedence. If time, permission, missing assets or
unavailable rendering prevents the scope or rounds from being completed, record
what remains and report the invocation as partial or blocked. Never substitute
an approval for missing inspection.

Compare the latest result both with this invocation's baseline and with earlier
approved evidence. Record what improved, what regressed, what remains artificial,
and the next worthwhile frontier. A regression is not paid for by improvements
elsewhere. Correct it before calling the affected change complete.

## 5. Verify, preserve and hand over this increment

Follow the development guide: `npm run check`, relevant `npm run test:browser`
cases, physical-clearance/cavity/contact probes, image/water/narration studies
and static-path checks when affected. Verify real motion and freezing, sound
opt-in/mute/hide/ownership, repeated navigation and disposal. Update focused
regressions for the defects actually corrected. Automated checks do not judge
the sound mix, beauty or photographic believability.

Separate route-clearance, construction-contact, support and cavity evidence.
Probe across a person's width and height, around stair/landing margins, at
shared boundaries and at the actual footprints of new objects. Check against
existing props, not only terrain. Ensure a probe hits the intended surface,
not the tested object's own geometry. Apply representation transforms before
probing sectioned miniatures, and visually inspect the same relationships.

Record the actual camera position, orientation and field of view after controls
settle, not just the requested pose; orbit controls can override manual framing.
Keep original comparison views and add discoverable bilingual close views where
new detail would otherwise remain inaccessible. Respect the narration contract:
reuse only genuinely matching passages, explicitly mark supported non-narrated
inspection views, or leave unapproved recording work pending. Do not silently
drop required narration or spend a prior recording budget again.

Inspect matched after captures and the running result. Every requested target
must have a demonstrable perceptual or physical improvement; an untouched target
is not improved because a sibling passed. If no improvement can be demonstrated,
report that honestly as an incomplete result rather than manufacturing changes.

Keep a concise report in the run's evidence directory: scope, baseline,
findings/corrections by round, matched evidence, comparable performance,
verification, unresolved limitations and next frontier. Keep past failed
judgments intact. Update the affected scene briefs and actual rendered previews
only after inspecting the result; preserve asset attribution and media consent.

Present the running result for human judgment and identify precisely what is
ready versus blocked. A bounded improvement pass can finish; **the scene is
never declared exempt from further realism work**. On the next invocation,
resume from the latest preserved result, re-evaluate prior findings, and seek
the next meaningful gain rather than replaying an old fix or accepting an old
approval as the endpoint.

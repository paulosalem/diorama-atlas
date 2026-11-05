---
name: create-diorama
description: Create a culturally grounded Diorama Atlas landscape and/or interior together with its required peer miniature, with photographic ambition from the start. Use for new places, variants, families and generated-scene pathways; verify spatial depth, fine detail, material truth, life and atmosphere together.
---

# Create a diorama

Build a place worth lingering in, not a generic room filled with recognizable
objects. **Beauty, regional feeling, physical plausibility and fine detail are
joint requirements.** None may be postponed as a later realism pass.

## Mandatory paired deliverables

**Every new diorama must always include both its landscape and/or interior
and its corresponding miniature.** This applies to new places, variants,
environment families and generated-scene pathways. Neither representation is
an optional follow-up.

The miniature must be a **full interactive view, peer to the interior or
landscape**, with its own direct link, orbit/zoom controls and a clear switch
between representations. A small model attached to the globe marker does
**not** satisfy this requirement.

It must be an actual rendered 3D representation of the same place,
with coherent architecture, layout, materials and cultural identity at its
intended viewing scale. A screenshot, preview card, map pin or unrelated generic
symbol does not replace it. Reuse shared scene information and rendering
mechanisms rather than allowing the two representations to describe different
places.

Integrate both into the app, make both discoverable, and show the user where
to open each in the handoff. An interior-only or landscape-only link is not
a complete delivery. If either representation is missing or unfinished, report
that explicitly and keep the diorama unfinished.

## Required context

Read `AGENTS.md`, the [philosophy](../../../docs/philosophy.md), **the entire
[quality standard](../../../docs/diorama-standard.md)** and its
[conversation-derived decisions](../../../docs/history/design-decisions.md).
These are part of this skill, not optional background. Inspect the running
Marrakech scene and an appropriate existing family. Read the nearest
[scene briefs](../../../docs/scenes/README.md), architecture and asset guidance.
Read the [generalized realism examples](../improve-diorama-realism/references/examples.md)
and their [construction-to-experience checks](../improve-diorama-realism/references/examples.md#construction-to-experience-checks)
for transferable lessons, not a list of props to copy.

## 1. Define the cultural proposition

Write `docs/scenes/<scene-id>.md` before implementation: region, anonymous place
type, period where relevant, ordinary activity, maintenance condition, mood,
what the visitor should learn, spatial sequence, materials, views and sources.
Include the miniature's composition and how visitors reach both representations.
If choosing locations, present candidates before building when requested.

**Search for and inspect many, many real photographic references, not just a
handful of representative images.** Build a broad, varied reference set across
the architectural setting, construction, ordinary activity and smallest
meaningful objects. Seek genuinely different viewpoints rather than many
near-duplicates: distant and exterior views, views from within buildings,
courtyards, streets and alleys, and views looking both inward and outward
through thresholds. Include eye-level approaches, turns, reverse and oblique
angles, upper/lower levels, close-ups and grazing-light details. Aerial views
and attractive facade photographs alone cannot establish what being inside
the place feels like or how its spaces connect.

Inspect the actual photographs, not just captions or search thumbnails. Record
exact sources and rights, what each useful image reveals, and which questions
remain unanswered. Prefer suitable licensed downloads or approved existing
assets. Supplement references with generation only when needed and explicitly
authorized for this task; generated imagery does not replace photographic
evidence.

**Keep searching for more photographs whenever doubts remain**, before and
during implementation and every correction round. Revisit uncertain spatial
relationships, hidden sides, proportions, materials, construction and fine
relief with targeted new searches. Do not freeze the reference set after initial
research, infer an unseen arrangement as fact, or treat a large image count as
proof that a specific question is answered. If adequate evidence remains
unavailable, record the uncertainty and distinguish an authored interpretation
from an observed feature.

Invent a plausible neighborhood, building or landscape—not a poor replica of a
named landmark. Add charm without mixing incompatible traditions, fabricating
historical authority, sacred inscriptions or community endorsement.

In the brief, plan the expected evidence at three scales: arrival/composition,
working or connected space, and closest-supported construction/prop detail.
Identify likely artificial-looking failure modes and their physical remedies.
Account for imagery, ground/plant structure, water if present, motion, sound,
bilingual explanation and performance before populating the scene. Missing
assets or unsupported geometry are dependencies to resolve, not permission for
a blank cover, sealed doorway or generic furnished box in the delivered result.

## 2. Compose at every scale

Start with the spatial and lighting relationships, then construction, objects,
surface variation and microdetail. Do not let detailing disguise a weak layout.

- **Layout:** plan routes, elevations, thresholds, parcels and courts before
  placing repeated buildings. Where the references show incremental growth,
  use connected turns, changes of width and direction, concealed destinations
  and differently oriented frontages. Random rotation is not an irregular
  neighborhood; neither is a grid decorated with extra stairs. Preserve regular
  planning where that is what the place actually has.
- **Adjacency:** decide which structures are detached, share a wall or meet at
  an intentional joint. Model attached fabric as fitted construction, not a row
  of freestanding boxes with accidental slits. Reconcile unequal footprints,
  floor levels, foundations and roofs without duplicate boundary surfaces or
  windows opening into a neighbor's solid wall.
- **Depth:** thick walls, real apertures and recessed joinery; modeled rooms,
  passages, streets or gardens beyond them; clear sightlines and walk-scale
  clearance. Test that skirting, glazing and furniture do not secretly seal doors.
- **Construction:** supported structures, plausible proportions and contact;
  actual cavities in open drawers, pots and hearths. Geometry carries form and
  depth; textures carry grain and fine finish. Resolve rims, bindings, hinges,
  seams and functional tool parts; cloth has weight, folds and contact with the
  objects resting on it.
  Audit the negative spaces too: every wedge behind a stair, strip beside a
  landing and notch between a wall and terrain needs a plausible purpose or
  a fitted solid closure. Do not fill genuine routes, drainage or light wells.
- **Shape complexity:** primitives are a starting approximation, not a finished
  realism target. Refine taper, cross-sections, bends, edge wear, splits and
  fine relief with actual geometry and sufficient local polygon density.
  A wood stick needs its observed form, not merely a box with wood texture.
  Use fine meshes or geometric displacement where silhouette, parallax, contact
  or self-shadow demands depth; subdivision alone and random vertex noise do
  not reproduce a material's structure. Inspect close and grazing-angle views.
- **Matter:** correct physical texture scale and grain direction; variation
  between boards, stones, ceramic pieces and finishes, even in cared-for places.
  Break repetitive floors and scan tiling while preserving real joints and motifs.
- **Time and use:** locally motivated cracks, chipped paving, worn handles,
  selective peeling and dampness; a little purposeful disorder. No universal
  grime, indiscriminate decay or randomly crooked construction. Establish a
  specific interrupted activity and its related tools/materials, rather than
  filling unused space with unrelated props.
- **Living ground:** terrain-following planting, connected trunks/stems/leaves,
  curved foliage, varied ground cover, gravel/soil transitions and worn routes.
  Keep cultivated ground cultivated; avoid identical green stamps, solid
  woodland blobs or greenery that blocks work and circulation.
- **Imagery:** actual images on visible covers, pages, labels, sleeves and
  suitable wall prints; curved labels and physical paper. Match the elegance
  of _Field Notes_, not the same botanical motif everywhere.
- **Water:** coherent irregular multiscale flow, reflections and localized
  disturbance appropriate to the setting. No uniform sine stripes, synchronized
  ripples or duplicate effects layered over a defect. Preserve bank/bridge
  clearance, wet edges and depth cues; exclude water from open boat hulls.
- **Atmosphere:** architectural daylight, plausible practical lights, quiet
  recesses, convincing contact shadows, restrained motivated movement and
  illustrative local sound. Anchor leaves and weighted cloth, vary their motion,
  and place steam/embers where a source explains them. Calm composition, not a
  showroom or clutter inventory.

Judge these at the closest supported views, not only the hero framing. The full
quality standard supplies the rejection criteria for every item above.
Judge surface variation both within and between pieces; one flat tint per house,
roof or vessel is not sufficient. Compose everyday activity in several useful
places without obstructing circulation. Equipment needs a plausible route to
its location, containers need distinct functional forms, and mood should come
from motivated light rather than a global color wash.
Marrakech establishes care, not universal Moroccan decoration. Douro demonstrates
working terrain, life and inspectable construction, not a requirement for every
scene to contain a car, train, river or floating geological cutaway.

For generated scenes, keep
[`src/server/generation/prompts.mjs`](../../../src/server/generation/prompts.mjs)
aligned with this direction. Respect the packet's existing schema and supported
builders. A greater recursive depth should resolve relationships and functional
detail, not simply increase clutter. Extend the family implementation when
necessary; descriptive text and generated reference images are not evidence
that the requested geometry or sensory behavior exists.

## 3. Integrate one complete experience

Reuse `src/client/environments/shared/` and the relevant family helpers. Keep
scene composition separate; a generated definition is not a bespoke builder.
Wire the catalog, regional globe marker, preview, detail points, referenced
sources, credit manifests and local/static paths. Wire the miniature as well;
do not treat the marker or preview as proof that the miniature is complete.

Provide an arrival, useful close views and a connected-space view. New interior
families ordinarily follow four primary views plus the connected-space view;
outdoors use at least the established four distinct views. Preserve all approved
existing cameras when extending a scene.

Write a short cultural introduction and every focused-view passage in en-US
and pt-BR. Use the shared narrator, floating transcript and global localization.
Obtain explicit approval before recording through a paid provider; preserve
immutable recipes and asset provenance. Do not declare a bundled scene complete
with missing narration, translations, imagery, depth or atmosphere.

Keep unfinished work explicitly `draft: true`, available only through
the local `&draft=1` preview. A blocked recording or visual review must not
silently enter the released catalog. Retain full checks for every bundled scene;
promote a draft only when its complete experience passes those same checks.

Use the shared audio controller: no parallel player or app shell. Respect saved
choices, first-use Resume, independent narration consent, ducking, tab ownership
and page-hide cancellation. Reduced motion must stop scenery motion, not controls.

Batch compatible static geometry while retaining animated objects. Explicitly
own and dispose of every geometry, material, texture, render target, audio graph,
request, timer and listener.
Keep unrelated procedural arrangements stable when adding detail. Verify
attribute compatibility when batching richer meshes, and check actual scene
assembly; isolated geometry tests do not establish that the full builder works.

## 4. Prove the place, not just the build

Preserve source and matched before captures for any revised scene. Inspect all
affected families and variants, original cameras, close details, reverse views
and newly connected spaces. Inspect the miniature's actual rendered output too,
including its agreement with the environment, legibility at its displayed size,
navigation between representations, compact layouts and resource cleanup.
Each review begins with an open-ended defect search
and then applies **all** cultural, spatial, visual, atmospheric and usability
criteria. Honor requested review counts; the original outdoor commission
required three complete re-inspections after the initial inspection.

Use the correction loop in
[improve-diorama-realism](../improve-diorama-realism/SKILL.md) as part of creation,
not a deferred future task: by default, follow the initial inspection with three
complete correction/re-inspection rounds. Do not count constructing the scene
as its review. Respect explicit user limits and report unfinished review honestly.
For a new scene without a predecessor, preserve its first inspectable build as
the correction baseline; for a variant, also retain its approved parent views.
Compare against real references as well as earlier renders so an initially weak
baseline does not become the definition of success. Prior approval never makes
the current scene exempt from further scrutiny.

Follow [development verification](../../../docs/development.md): source checks,
real browser and static-path checks, relevant image/narration/water studies,
clearance probes, reduced motion, audio controls, repeated navigation and cleanup.
Probe route width and height, stair margins, construction contacts, object
footprints and cavities separately. A clear route centerline does not rule out
an impossible stair corner or a bicycle intersecting an existing doorstep object.
Measure performance against the same scene/camera/viewport baseline. Optimize
implementation, never silently remove required richness.

Correct defects and preserve failed findings rather than relabeling them.
Publish preview images only from inspected actual renders. Hand over both the
running environment and miniature, with explicit access instructions, concise
evidence and honest remaining limits. Do not claim photorealism,
cultural authority or human approval because an automated check passed.

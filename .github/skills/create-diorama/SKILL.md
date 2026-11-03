---
name: create-diorama
description: Create a culturally grounded Diorama Atlas interior, outdoor setting, variant or environment family with photographic ambition from the start. Use for new places and generated-scene pathways; plan and verify spatial depth, fine detail, material truth, life and atmosphere together.
---

# Create a diorama

Build a place worth lingering in, not a generic room filled with recognizable
objects. **Beauty, regional feeling, physical plausibility and fine detail are
joint requirements.** None may be postponed as a later realism pass.

## Required context

Read `AGENTS.md`, the [philosophy](../../../docs/philosophy.md), **the entire
[quality standard](../../../docs/diorama-standard.md)** and its
[conversation-derived decisions](../../../docs/history/design-decisions.md).
These are part of this skill, not optional background. Inspect the running
Marrakech scene and an appropriate existing family. Read the nearest
[scene briefs](../../../docs/scenes/README.md), architecture and asset guidance.
Read the [generalized realism examples](../improve-diorama-realism/references/examples.md)
for transferable lessons, not a list of props to copy.

## 1. Define the cultural proposition

Write `docs/scenes/<scene-id>.md` before implementation: region, anonymous place
type, period where relevant, ordinary activity, maintenance condition, mood,
what the visitor should learn, spatial sequence, materials, views and sources.
If choosing locations, present candidates before building when requested.

Find and inspect real photographs of the architectural setting, construction
and smallest meaningful objects. Record exact sources and rights. Prefer
suitable licensed downloads or approved existing assets. Supplement references
with generation only when needed and explicitly authorized for this task.
Seek additional photographs whenever the initial set leaves shape, construction
or fine relief uncertain. Include close-ups, oblique/reverse angles and
grazing-light views; record what each reveals rather than freezing the reference
set before the smallest details have been understood.

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

- **Depth:** thick walls, real apertures and recessed joinery; modeled rooms,
  passages, streets or gardens beyond them; clear sightlines and walk-scale
  clearance. Test that skirting, glazing and furniture do not secretly seal doors.
- **Construction:** supported structures, plausible proportions and contact;
  actual cavities in open drawers, pots and hearths. Geometry carries form and
  depth; textures carry grain and fine finish. Resolve rims, bindings, hinges,
  seams and functional tool parts; cloth has weight, folds and contact with the
  objects resting on it.
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
sources, credit manifests and local/static paths.

Provide an arrival, useful close views and a connected-space view. New interior
families ordinarily follow four primary views plus the connected-space view;
outdoors use at least the established four distinct views. Preserve all approved
existing cameras when extending a scene.

Write a short cultural introduction and every focused-view passage in en-US
and pt-BR. Use the shared narrator, floating transcript and global localization.
Obtain explicit approval before recording through a paid provider; preserve
immutable recipes and asset provenance. Do not declare a bundled scene complete
with missing narration, translations, imagery, depth or atmosphere.

Keep unfinished outdoor work explicitly `draft: true`, available only through
the local `&draft=1` preview. A blocked recording or visual review must not
silently enter the released catalog. Retain full checks for every bundled scene;
promote a draft only when its complete experience passes those same checks.

Use the shared audio controller: no parallel player or app shell. Respect saved
choices, first-use Resume, independent narration consent, ducking, tab ownership
and page-hide cancellation. Reduced motion must stop scenery motion, not controls.

Batch compatible static geometry while retaining animated objects. Explicitly
own and dispose of every geometry, material, texture, render target, audio graph,
request, timer and listener.

## 4. Prove the place, not just the build

Preserve source and matched before captures for any revised scene. Inspect all
affected families and variants, original cameras, close details, reverse views
and newly connected spaces. Each review begins with an open-ended defect search
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
Measure performance against the same scene/camera/viewport baseline. Optimize
implementation, never silently remove required richness.

Correct defects and preserve failed findings rather than relabeling them.
Publish preview images only from inspected actual renders. Hand over the running
place, concise evidence and honest remaining limits. Do not claim photorealism,
cultural authority or human approval because an automated check passed.

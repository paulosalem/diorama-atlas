---
name: create-diorama
description: Create a new culturally grounded Diorama Atlas interior, outdoor setting, variant or environment family. Use for a new place or generated-scene pathway; enforce the full Marrakech-level spatial, material, atmospheric and cultural quality contract.
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

## 1. Define the cultural proposition

Write `docs/scenes/<scene-id>.md` before implementation: region, anonymous place
type, period where relevant, ordinary activity, maintenance condition, mood,
what the visitor should learn, spatial sequence, materials, views and sources.
If choosing locations, present candidates before building when requested.

Find and inspect real photographs of the architectural setting, construction
and smallest meaningful objects. Record exact sources and rights. Prefer
suitable licensed downloads or approved existing assets. Supplement references
with generation only when needed and explicitly authorized for this task.

Invent a plausible neighborhood, building or landscape—not a poor replica of a
named landmark. Add charm without mixing incompatible traditions, fabricating
historical authority, sacred inscriptions or community endorsement.

## 2. Compose at every scale

Start with the spatial and lighting relationships, then construction, objects,
surface variation and microdetail. Do not let detailing disguise a weak layout.

- **Depth:** thick walls, real apertures and recessed joinery; modeled rooms,
  passages, streets or gardens beyond them; clear sightlines and walk-scale
  clearance. Test that skirting, glazing and furniture do not secretly seal doors.
- **Construction:** supported structures, plausible proportions and contact;
  actual cavities in open drawers, pots and hearths. Geometry carries form and
  depth; textures carry grain and fine finish.
- **Matter:** correct physical texture scale and grain direction; variation
  between boards, stones, ceramic pieces and finishes, even in cared-for places.
  Break repetitive floors and scan tiling while preserving real joints and motifs.
- **Time and use:** locally motivated cracks, chipped paving, worn handles,
  selective peeling and dampness; a little purposeful disorder. No universal
  grime, indiscriminate decay or randomly crooked construction.
- **Imagery:** actual images on visible covers, pages, labels, sleeves and
  suitable wall prints; curved labels and physical paper. Match the elegance
  of _Field Notes_, not the same botanical motif everywhere.
- **Water:** coherent irregular multiscale flow, reflections and localized
  disturbance appropriate to the setting. No uniform sine stripes, synchronized
  ripples or duplicate effects layered over a defect.
- **Atmosphere:** architectural daylight, plausible practical lights, quiet
  recesses, convincing contact shadows, restrained motivated movement and
  illustrative local sound. Calm composition, not a showroom or clutter inventory.

Judge these at the closest supported views, not only the hero framing. The full
quality standard supplies the rejection criteria for every item above.

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

Follow [development verification](../../../docs/development.md): source checks,
real browser and static-path checks, relevant image/narration/water studies,
clearance probes, reduced motion, audio controls, repeated navigation and cleanup.
Measure performance against the same scene/camera/viewport baseline. Optimize
implementation, never silently remove required richness.

Correct defects and preserve failed findings rather than relabeling them.
Publish preview images only from inspected actual renders. Hand over the running
place, concise evidence and honest remaining limits. Do not claim photorealism,
cultural authority or human approval because an automated check passed.

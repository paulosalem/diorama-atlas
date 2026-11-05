---
name: review-dioramas
description: Inspect or refine existing Diorama Atlas environments, including realism, atmosphere, material repetition, water, printed detail and connected spaces. Preserve matched baselines and verify every affected family and variant.
---

# Review and refine dioramas

For an implementation request to deepen realism, including repeated passes,
use [improve-diorama-realism](../improve-diorama-realism/SKILL.md). This skill
also supports inspection-only requests; those do not authorize edits or invoke
the improvement loop automatically.

Read the [quality standard](../../../docs/diorama-standard.md), affected
[briefs](../../../docs/scenes/README.md), and
[capture instructions](../../../docs/development.md). Determine whether the
request is inspection-only or authorizes changes. Do not silently redesign
approved composition, cameras, cultural setting or unrelated scenes.
Apply the shared [construction-to-experience checks](../improve-diorama-realism/references/examples.md#construction-to-experience-checks)
as questions, not a mandatory style or list of objects.

1. Preserve the current source and before images **before editing**. Name the
   scope, original cameras, viewport, motion setting and comparison baseline.
   Confirm the server is responsive and the viewer has reached its published
   ready state; loader disappearance alone is insufficient.
2. Inspect actual rendered arrivals, every named view, close details and
   reverse/connected views. Ask what looks wrong broadly before applying the
   full standard. Inspect all affected variants, not a representative favorite.
   Inspect each diorama's miniature too: it must exist, represent the same
   place coherently, and be discoverable alongside the landscape and/or interior.
   It must be a peer interactive view with orbit/zoom and direct navigation,
   not merely the small model attached to a globe marker.
   A missing miniature fails the complete-diorama requirement.
3. Record defects concretely: location, visible consequence, likely cause and
   criterion. Check blocked apertures, unsupported objects, false cavities,
   grain scale, repetition, blanket dirt, generic print, regular water and
   unmotivated light or motion. Examine cultural coherence and atmosphere too.
   Audit route topology and adjacency, not just individual objects: accidental
   gaps in attached construction, impossible stair corners, thin roof infills
   and courses detached from their supports. Inspect surface variation within
   pieces, everyday activity/access and functional prop construction. A user-
   identified defect is a reason to check sibling instances and the shared rule.
4. Fix causes in shared helpers when appropriate, retaining scene-specific
   intent and real animated geometry. Do not hide failures with a camera change,
   darker lighting, extra surfaces, weaker assertions or a lower detail level.
5. Capture matched after images and new connected-space evidence. Repeat every
   requested complete inspection with all criteria; do not count topic-specific
   checks as separate comprehensive passes. Keep failed historical reviews intact.
6. Run relevant source/browser checks, clearance probes, compact layouts,
   navigation, motion/audio preferences and disposal. Compare frame timing and
   resource counts under matched conditions. Run GPU-heavy checks sequentially.
   Separate human-clearance, boundary-contact, footprint and cavity probes;
   a clear centerline does not validate stair margins or nearby props. Apply
   miniature section transforms and verify probes hit their intended surfaces.
   Record settled camera transforms, not only requested poses. Check actual
   assembly after attribute/batching changes and preserve unrelated procedural
   arrangements when adding detail.
7. Present both the running environment and its miniature, with access
   instructions and evidence for human judgment. Regenerate
   distributed previews only after visual inspection; distinguish technical
   success from beauty, atmosphere and photographic-read approval.

Use the existing capture, comparison, outdoor and water/print scripts; inspect
their options and publishing side effects first. Store evidence in ignored
`outputs/`, not the repository root. For a requested independent agentic review,
follow [the existing rubric and snapshot procedure](../../../agentic-tests/README.md).
Do not launch additional agents, reviews or paid services merely because this
skill lists them as possible tools.

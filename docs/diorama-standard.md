# The diorama quality standard

**Every scene must be beautiful, culturally coherent, spatially convincing and
rich in meaningful detail.** The approved Marrakech environment established a
minimum, not an exception. This contract applies to new scenes, variants, new
families and generated-scene pathways. Do not deliver a generic furnished box
and defer the real environment until later.

Read this alongside [the philosophy](philosophy.md), the relevant
[scene brief](scenes/README.md), and the [design decisions](history/design-decisions.md)
that explain its nuances. Inspect Marrakech and a structurally relevant
existing family before choosing an implementation.

The target is photographic believability **and** a convincing feeling of being
there, not merely recognizable objects. Plan depth, construction, material truth,
evidence of life, lighting, motion, sound and close-view inspection together
from the start. A reference image, detailed description or higher polygon count
does not establish those qualities in the running scene.

## 1. Begin with a place and a reason

- Identify a region, cultural practice, building/landscape type, intended era,
  maintenance condition, ordinary activity, climate and time of day. State what
  the visitor should notice and learn. Do not begin with a shopping list of props.
- Design an **anonymous, plausible place**: a neighborhood, workshop, home,
  café, courtyard or working landscape. Do not attempt an inaccurate copy of a
  famous landmark, real business or recognizable street plan.
- Study real photographs at three scales: spatial organization, construction
  and materials, and small working details. Inspect the actual images, not only
  captions or search thumbnails. Keep their real source locations and licenses.
- Expand the photographic references when needed, including later improvement
  passes. Seek close-ups, reverse/oblique angles, cross-sections and grazing-light
  views that reveal construction and fine relief missing from the initial set.
  Record the new observations and distinguish evidence from inference.
- Regional references guide a coherent original composition. Artistic freedom
  may add atmosphere and charm, but cannot excuse incompatible architecture,
  fabricated cultural claims or an implausible object arrangement.
- Prefer suitable licensed downloads and existing approved assets. Generate
  complementary references or prop imagery only when needed and explicitly
  authorized. Historical permission for a particular image batch is not
  open-ended permission for future paid calls.
- Never confuse a source photograph, a generated reference, an authored texture,
  a generic material scan and a rendered scene capture. Label and credit each.

## 2. Make the space physically legible

| Requirement       | What must be perceptible                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Human scale       | Plausible proportions, thicknesses, reach, furniture sizes and circulation at the actual camera height                              |
| Real openings     | Wall thickness, recessed frames, reveals, thresholds, sill depth, hinges or joinery where appropriate                               |
| Connected places  | Furnished secondary rooms, offset passages, courtyards, streets, gardens or continuing terrain—not a flat picture behind an opening |
| Open sightlines   | No hidden wall panel, skirting, furniture, glazing or decorative overlay secretly sealing a route                                   |
| Construction      | Supported roofs, benches, balconies and vessels; contact rather than hovering or intersections; plausible seams and edge profiles   |
| Real cavities     | Drawer interiors, jar mouths, baskets, vessels and hearths have modeled empty space rather than a dark patch on a solid box         |
| Layered depth     | Parallax and occlusion reveal foreground, occupied main space, thresholds and further context when the camera moves                 |
| Useful viewpoints | An arrival, close details and a connected-space view; outdoors, multiple distinct walking-scale readings of the setting             |

Use geometry for silhouette, construction, depth and contact; use textures for
grain, fine relief and finish. Neither a high polygon count nor a high-resolution
image compensates for the wrong physical relationship. Small visible features
must remain resolved at the closest supported views, not merely at thumbnail
scale. Preserve approved existing cameras when extending a scene.

Primitives are approximations, not a permanent ceiling on shape complexity.
Actively refine them with sufficient polygon density, shaped topology and
geometric relief to capture the observed material. A wooden stick may need
taper, subtle bends, changing cross-sections, knots, splits, chips and fine grain
relief; a textured box cannot supply the same silhouette, parallax, contact or
self-shadow. Many small faces may be appropriate. Subdividing an unchanged box
or applying random noise is not the same as modeling these relationships.
Use normal/roughness maps where they faithfully carry fine finish, not as a
replacement for depth that supported close and oblique views expose. Preserve
sound construction and maintenance rather than making every object crooked or
broken. Optimize richer geometry through reuse, instancing and faithful distance
detail; do not reduce the available close views to hide coarse forms.

Resolve the parts that explain an object's function: rims, handles, hinges,
blades, stitches and bindings. Textiles need folds, weight and support; a cloth
should drape over edges and meet objects placed on it without intersection.
Introduce tools, furnishings or infrastructure as a coherent activity and
construction relationship, not isolated evidence that more props were added.

## 3. Make materials varied, not arbitrarily damaged

**Real life is full of small imperfections; care does not make matter uniform.**
Distinguish natural variation, manufacturing variation, wear and neglect.

- Timber grain, individual boards, stone inclusions, ceramic firing and cloth
  weave vary even in well-maintained places. Use restrained changes in color,
  roughness and finish, not one uniform tint per material.
- Carry grain direction and physical texture scale across pieces. Avoid giant
  wood grain, tiny stone blocks, stretched maps and inconsistent normal strength.
- Break conspicuous repetition in large floors, walls and roofs. Vary individual
  boards/stones and non-patterned scan sampling; identical long strips or regular
  color waves reveal the algorithm. Keep real joints and authored ornament intact.
- Place cracks, broken paving, chips, peeling paint, dampness, dust and handling
  marks where construction, weather and use explain them. Vary their location,
  scale and severity. Do not apply identical grime or distress to every surface.
- Well-cared-for places should remain cared for. Do not turn every scene into a
  ruin, force crookedness into sound construction, or mistake disorder for beauty.
- Preserve correct material response: stone is not plastic, paper is not glossy
  metal, glass is not opaque paint. Protect printed artwork, luminous materials,
  transparent surfaces and foliage from indiscriminate patina.
- Add **small, purposeful disorder**: loose fibre, a rumpled cloth, crumbs,
  partly cleared dishes, tools, correspondence, bundles or preparation materials.
  Their arrangement should imply a specific activity, not random clutter.

## 4. Give imagery and water the same attention

Books, labels, stickers, jars, paper packets, record sleeves and visible printed
material need actual image content, not plain colored covers or unreadable
decorative strokes. Use appropriate illustrated pages, contextual wall prints
or posters where they belong. The admired _Field Notes_ artwork is a benchmark
for elegance and tasteful integration—not a motif to paste into every culture.

Wrap labels around their containers; give paper thickness, edges, bindings,
curls or handling where visible. Keep scale, typography, language and depicted
subject compatible with the setting. Preserve original fictional layouts and
credited source artwork. Do not invent authentic-looking sacred text or imply
that unrelated botanical illustrations identify the contents of a medicinal jar.

Water must not expose evenly repeated waves, synchronized rings, regular stripes
or identical mirrored ripples. Its geometry, normal motion, reflections and
waterline light should belong to one coherent flow. Combine restrained scales
and rates with localized disturbance; adapt them to a sheltered canal, fountain,
irrigation channel or open sea. Respect banks, depth cues, contact and occlusion.
Do not stack duplicate water surfaces or solve a reflection defect with another
unrelated animated layer.

Reflections must respect banks and crossings, and water must remain outside
open hull interiors even while a boat moves. Wet margins, spill streams and
submerged caustics should follow the same physical setting and flow rather
than become independent decorative animations.

## 5. Build an atmosphere, not a display room

- Let lighting express the architecture: daylight through real openings, credible
  practical sources, shadow contact, soft bounce and cooler/darker recesses.
  Avoid uniformly lit surfaces, unmotivated glow and flattened depth.
- Keep a calm composition with a clear focal hierarchy. Beauty, material truth,
  everyday activity and regional feeling are joint requirements.
- Use motivated, restrained movement: foliage, fabric, steam, embers, water or
  a working object. Avoid synchronized motion and activity added merely to prove
  the scene is animated. Respect reduced motion.
- Shape terrain and planting together. Resolve connected stems, curved leaves,
  varied crowns, ground cover, stones and soil at appropriate viewing distances.
  Let ground pigment, grass patches and worn routes describe the same land use;
  do not replace working terrain with a lawn or use solid green masses as trees.
  Leaf motion must preserve attachment, and planting must not block circulation.
- Compose context-appropriate sound through shared recorded profiles. Never claim
  an illustrative recording documents the modeled place, or substitute an
  unrelated fountain for sea, canal or locally specific wildlife.
- Preserve first-use playback consent, saved mute choices, browser Resume,
  one-tab ownership, narration ducking, page-hide cancellation and full cleanup.
  Default-enabled sound preferences do not authorize an unsolicited first sound.
- Supply a short serious-toned cultural introduction and view-specific narration
  in en-US and pt-BR, with the matching text in the unobtrusive floating panel.
  All UI, details and errors—not only speech—must follow the global language.
- Use prerecorded OpenAI voices for guided passages, object details and Miniatures.
  Reuse identical text in the same language. Never substitute browser speech or
  make paid requests during a visit; obtain a generation budget before recording.

## 6. Integrate without reducing the standard

Reuse the shared geometry, image loading, material variation, patina, water and
audio helpers under `src/client/environments/`. Keep place-specific composition
separate. Extend a reusable mechanism when needed rather than copying an engine
or creating a competing application shell, music player or narration controller.

Batch compatible static geometry; retain real instancing and genuinely animated
objects. Explicitly own and dispose of geometries, materials, textures, render
targets, audio graphs, requests, timers and listeners. Avoid duplicate surfaces,
effects and reflection captures.

Wire catalog, regional marker, preview, details, viewpoints, references, credits,
localization, narration and both local/static navigation. Missing assets and
malformed content must fail visibly, never disappear behind a plausible fallback.
No public feature may depend on a developer's cache or a paid request.

Apply this standard to generated-scene instructions as well as authored builders.
Use supported schemas and geometry mechanisms; a generated packet or image
cannot create a bespoke room, real cavity or animation that its builder lacks.
Extend the implementation or report the missing capability explicitly. Do not
equate deeper recursive structure with more clutter.

Engine changes and alternative presentations preserve the same obligations.
An export must retain material variation, imagery, transparency, physical scale,
motion and resource ownership, not just geometry. A miniature reveals backs,
undersides, cut faces and gaps that must also withstand inspection. Neither a
new engine nor an export is a substitute for that quality.

Every landscape and interior must also have a corresponding **Miniature**
experience, without replacing its original visit. Landscapes are two genuinely
separated, complete sections, following the Douro treatment with place-specific
terrain, architecture and activity. Interiors are floating architectural
sections with an exterior shell that closes the room, then lifts upward and
sideways to expose the furnished interior and its connected spaces. Move the
actual roof, relevant facade and ceiling-mounted fittings; do not leave a second
roof or a screen of rafters obstructing the revealed room. Some faces may be
architectural cuts rather than complete facades. Add sparse, appropriate
surroundings, with most detail in the interior and its immediate exterior.

Use thick, physically cut boundaries, real cavities and closed undersides.
Preserve holes when capping geometry; keep clear air between sections. Retain
genuine movement, local optional sound, material detail and evidence of use.
Provide whole-object, detail and connected-space views, an accessible opening
control, exact reduced-motion endpoints, persistent open state and complete
resource disposal. Inspect the closed, opened, reversed and compact presentations
as well as the unchanged full-scale visit. These requirements also apply to
generated scenes handled by the supported environment families.

## 7. Demonstrate, inspect, correct

Before revising an environment, preserve its source and matched before images.
Afterward, capture the same original cameras, viewport and motion settings, plus
newly connected spaces. Inspect **every affected family and variant** at arrival,
detail and reverse/connected views—not only the strongest screenshot.

Each complete inspection must ask broadly what looks wrong, then check culture,
beauty, atmosphere, geometry, materials, microdetail, water, printed imagery,
lighting, sound and usability. Record specific defects and failed criteria.
For the original outdoor commissioning, the requirement was an initial
inspection **plus three complete re-inspections**, with corrections between
passes. Preserve that thoroughness when that review scope is requested; do not
count three isolated topic checks as three complete inspections.

Verify actual clear space at the relevant physical scale, finite geometry,
camera controls, navigation, compact and landscape layouts, motion preferences,
audio opt-in/mute, tab handover and disposal. Compare frame timings and resource
counts against a comparable baseline, not an unrelated scene or different
viewport. Optimize the implementation rather than silently removing detail.
Use `npm run check`, `npm run test:browser` and the relevant capture, narration,
outdoor, water/print and static-host checks from the [development guide](development.md).

**Completion requires the running result and honest evidence.** A build,
screenshot, numerical score or agent verdict alone does not establish visual
quality. Never call the scene photorealistic merely because it renders. Preserve
historical failed judgments and disclose remaining shortcomings; let human
judgment assess the finished experience.

## 8. Improve again without declaring a realism ceiling

Use [/improve-diorama-realism](../.github/skills/improve-diorama-realism/SKILL.md)
for repeated passes on one scene, several scenes, a family or the collection.
Its [examples](../.github/skills/improve-diorama-realism/references/examples.md)
generalize the Marrakech, interior, outdoor and Douro work without imposing the
same decorations or props everywhere.

Every invocation treats the latest result as a new baseline, even after approval.
Re-examine the actual render and references; find the next most consequential
physical or perceptual weakness and implement a demonstrable gain. Do not
return "already realistic enough," replay the same cosmetic fix, fabricate
defects, or blindly increase clutter, weathering, effects and geometry.

Creation incorporates the same correction discipline from its first inspectable
build. The creation and improvement skills default to an initial complete
inspection plus three complete correction/re-inspection rounds, unless the user
sets a different scope or limit. Each round covers all criteria and affected
views/variants. Other inspection requests retain their explicitly requested scope.

Keep successive evidence, unresolved shortcomings and the next improvement
frontier. A bounded invocation may finish with a verified improvement; that is
not a declaration that the scene is finally photorealistic or cannot improve.
If improvement or inspection cannot be demonstrated within available resources
and permissions, report a partial/blocked result, not invented success. Preserve
beauty, cultural coherence and previous gains while raising fidelity further.

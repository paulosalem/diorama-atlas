# Agent instructions

## Project direction

Read [the philosophy](docs/philosophy.md), [quality contract](docs/diorama-standard.md)
and the affected [scene briefs](docs/scenes/README.md) before scene work.
Use the repository's [agent skills](docs/agent-skills.md) for creation, repeated
realism improvement, visual review, asset curation, bilingual narration and publication. Their linked
quality requirements are mandatory, not optional context.

Maintain the v1.0.0 project as a complete, provider-free public explorer:
approved runtime assets are bundled, English and Portuguese cover the entire
interface, and dedicated scene briefs remain aligned with the catalog.
Keep research/review outputs out of source and preserve unique local work.

## Mandatory diorama quality standard

**Every diorama MUST ALWAYS receive the deep level of detail, connected
passageways, atmosphere, and realism established by the approved Marrakech
environment and the completed collection realism pass.**

This is the minimum standard, not an optional enhancement, a special treatment
for selected scenes, or work to postpone until the user asks again. It applies
to every new diorama, new environment family, and generated-scene pathway.
Do not deliver a generic furnished box and describe the realism work as a
future improvement.

Read [the collection realism design](docs/collection-realism.md) and inspect
the existing environments before creating or substantially revising a diorama.
Carry forward the approved approach while preserving each place's own cultural
setting, architecture, materials, and everyday activities. Do not copy
Marrakech's visual motifs into unrelated places.

Use [create-diorama](.github/skills/create-diorama/SKILL.md) for new scenes and
[/improve-diorama-realism](.github/skills/improve-diorama-realism/SKILL.md) for
one scene, selected scenes, a family or the full collection. Previous approval
and completed passes establish a floor, never "realistic enough." Each new
invocation must seek and demonstrate further meaningful improvement without
blindly adding clutter, damage, polygons or effects.

For creation, plan cultural references, spatial depth, construction, material
variation, life, light, motion, sound and close-view evidence together before
building. A generated description does not supply geometry its family builder
cannot construct. Do not postpone these obligations to a later enhancement.

### Required spatial depth

- Build real openings with wall thickness, recessed frames, reveals, thresholds,
  and appropriate joinery. Doors and windows must not look pasted onto walls.
- Continue openings into actual modeled spaces: furnished secondary rooms,
  passageways, courtyards, streets, gardens, or other context appropriate to the
  place. Use layered geometry, parallax, and occlusion to make depth perceptible.
- Keep passageways and sightlines genuinely open. Wall panels, skirting,
  furniture, glazing, and decorative overlays must not secretly block them.
- Model real cavities where an object implies one, including open drawers,
  containers, and hearth mouths. A dark surface on a solid box is not a cavity.
- Provide viewpoints that reveal the main space, close details, and at least
  one connected space or passageway. Preserve approved existing viewpoints when
  extending a scene.

### Required detail, atmosphere, and realism

- Use physically plausible scale, proportions, construction, and material
  response. Include tactile surfaces, fine geometric detail, restrained wear,
  varied finish, and believable imperfections.
- Refine primitive shapes with real geometric complexity where needed: taper,
  changing cross-sections, chipped edges, fissures and fine relief. Use enough
  polygons to capture the observed form; a textured box is not a finished wood
  stick, and subdivision without shape change is not added realism. Seek new
  close-up or oblique photographic references when existing images lack detail.
- Distinguish natural variation from neglect. Break repeated grain, identical
  pieces and regular discoloration while preserving joints, ornament and the
  maintenance condition. Cared-for timber and stone are not uniform.
- Give visible books, pages, labels, sleeves and appropriate wall prints real
  image content, physical paper and conforming labels, not plain color patches.
- Add culturally and functionally specific signs of ordinary use: preparation
  materials, tools, partly used objects, rumpled textiles, loose papers, crumbs,
  fibres, or similar evidence appropriate to the setting. Small, meaningful
  disorder should suggest occupation, not become random clutter.
- Let lighting express the architecture: daylight entering real openings,
  practical light sources, softer bounce, cooler or darker recesses, convincing
  shadows, and appropriate reflections. Avoid uniformly lit display rooms.
- Include restrained, motivated movement such as foliage, textiles, water,
  steam, embers, or working objects. Respect reduced-motion preferences.
- Make water, reflections and localized disturbance one irregular coherent
  flow appropriate to the setting. Keep banks, crossings and open hulls clear;
  do not conceal defects with duplicate water surfaces.
- Build living terrain with connected plants, varied ground cover and worn
  routes. Anchor asynchronous leaf/cloth motion; maintain support and contact
  for objects, textiles and infrastructure.
- Provide context-appropriate local ambient sound. It must remain silent until
  explicitly enabled, support muting, stop when the page is hidden, and release
  its resources on disposal. Never autoplay it.
- Keep the composition calm and legible. Realism comes from coherent physical
  relationships and evidence of use, not merely adding more objects.
- Preserve unobtrusive bilingual explanations, all useful views and global
  language/audio choices. New detail must remain inspectable on close views
  and usable on compact screens, not only attractive in an arrival screenshot.

### Required implementation and verification

- Reuse shared geometry, material, depth, atmosphere, and sound helpers under
  `src/client/environments/`. Keep scene-specific composition separate.
- Batch or instance compatible geometry, preserve genuinely animated objects,
  and explicitly own and dispose of geometries, materials, textures, audio,
  listeners, and other runtime resources. Avoid duplicate surfaces and effects.
- For revisions, preserve the current source and capture before images before
  editing. Produce matched after images with the same original cameras,
  viewport, and motion settings; also capture newly connected spaces.
- Inspect actual rendered output for every affected family and variant.
  Verify clear space through openings at the appropriate physical scale,
  finite geometry, viewpoint controls, navigation, compact layouts, animation,
  reduced motion, audio opt-in/mute, and cleanup.
- Measure performance against a comparable baseline. Optimize implementation
  rather than silently removing the required detail or atmosphere.
- Run `npm run check` and `npm run test:browser` for relevant source changes.
  Use the capture and comparison tools in the [development guide](docs/development.md).
  A successful build or test alone does not establish visual quality.
- Do not declare a diorama complete until this standard is implemented and
  inspected. Present the running result for human judgement; do not claim
  photorealism merely because the scene renders successfully.

## Workspace boundary

Make changes in the current repository. Historical Codex workspaces and their
transcripts are reference material, not the destination for implementation.

# Agent instructions

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
- Add culturally and functionally specific signs of ordinary use: preparation
  materials, tools, partly used objects, rumpled textiles, loose papers, crumbs,
  fibres, or similar evidence appropriate to the setting. Small, meaningful
  disorder should suggest occupation, not become random clutter.
- Let lighting express the architecture: daylight entering real openings,
  practical light sources, softer bounce, cooler or darker recesses, convincing
  shadows, and appropriate reflections. Avoid uniformly lit display rooms.
- Include restrained, motivated movement such as foliage, textiles, water,
  steam, embers, or working objects. Respect reduced-motion preferences.
- Provide context-appropriate local ambient sound. It must remain silent until
  explicitly enabled, support muting, stop when the page is hidden, and release
  its resources on disposal. Never autoplay it.
- Keep the composition calm and legible. Realism comes from coherent physical
  relationships and evidence of use, not merely adding more objects.

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
  Use the capture and comparison tools documented in [README.md](README.md).
  A successful build or test alone does not establish visual quality.
- Do not declare a diorama complete until this standard is implemented and
  inspected. Present the running result for human judgement; do not claim
  photorealism merely because the scene renders successfully.

## Workspace boundary

Make changes in the current repository. Historical Codex workspaces and their
transcripts are reference material, not the destination for implementation.

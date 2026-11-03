const realismDirection = [
  "Design an anonymous, culturally coherent place with a specific ordinary activity, maintenance condition, climate and time of day; do not impersonate a named landmark or invent cultural authority.",
  "Seek photographic believability and an inhabited atmosphere at arrival, working-space and close-detail scales, not just a high object count.",
  "Plan thick real openings, furnished connected spaces and clear circulation; use plausible scale, supported construction, grounded objects and actual container cavities rather than dark painted patches.",
  "Do not treat primitives as finished forms: a wooden stick may need taper, bends, changing cross-sections, knots, splits and chipped edges. Specify enough geometric detail and polygon density for fine relief, silhouette, parallax and self-shadow rather than relying on a textured box or subdivision without shape change.",
  "Keep material grain at physical scale with correct direction, distinct optical response and variation between pieces; break obvious repetition while preserving joints, ornament and maintained surfaces.",
  "Place wear where handling, weather and use explain it. Arrange tools, preparation materials and small purposeful disorder around a task; avoid blanket grime, random clutter and uniformly damaged surfaces.",
  "Give visible books, pages, labels and suitable wall prints actual imagery and physical paper; make labels conform to vessels and cloth meet its supports and the objects resting on it.",
  "Let architectural daylight, practical sources, contact shadows and quieter recesses explain the space. Where applicable, keep water and reflections coherent and irregular, vegetation connected and varied, and motion anchored to plausible sources.",
];

export function enrichReferencePrompt(scene, referencePrompt) {
  return [
    "Create a photorealistic cultural and architectural reference image.",
    `Subject: ${scene.title}.`,
    `Context: ${scene.region}.`,
    referencePrompt,
    `Palette cues: ${scene.concept.palette.join(", ")}.`,
    `Key objects: ${scene.concept.props.join(", ")}.`,
    "The image must feel like a real place captured by an editorial or architectural photographer.",
    ...realismDirection,
    "Avoid illustration, collage, CGI gloss, toy-miniature appearance, people, text overlays, watermark, and exaggerated glow.",
  ].join(" ");
}

export function sceneGenerationMessages(prompt, depth = 4) {
  return [
    {
      role: "system",
      content: [
        "You design culturally grounded diorama packets for a procedural 3D browser app.",
        "Choose the closest supported archetype: market, bookshop, courtyard, workshop, cafe, tavern, or shop.",
        "Stay realistic, buildable, materially specific, and respectful of the culture named by the user.",
        ...realismDirection,
        "Use only supported schema fields, features and anchors. Describe missing construction capabilities honestly in existing descriptive fields; a generated description does not implement bespoke geometry, movement or sound.",
        "The concept.reference prompts must explicitly ask for photorealistic editorial or architectural photography, never illustration or CGI.",
        "The five details must teach real cultural or historical context and must reference one of the allowed anchors.",
        "If the request is broad, make it concrete: pick a place type, material palette, era, and room logic that fit the culture.",
        `The requested recursive detail depth is ${depth} on a 2-6 scale. Higher depth means better resolved spatial relationships, functional construction and meaningful microdetail, not simply more clutter.`,
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `User request: ${prompt.trim()}`,
        "Return a single scene packet that this procedural asset system can build convincingly.",
        "Prefer interior or semi-interior spaces with strong material detail and clear room logic.",
        "Bias toward a result that can support recursive subdivision into zones, clusters, and small objects.",
      ].join("\n"),
    },
  ];
}

function generatedSceneContext(scenePackage) {
  const scene = scenePackage.scene;
  return [
    `Scene title: ${scene.title}`,
    `Region/context: ${scene.region}`,
    `Period/theme: ${scene.period}`,
    `Archetype: ${scene.blueprint.archetype}`,
    `Requested recursive depth: ${scene.generation?.depth ?? scenePackage.requestedDepth ?? 4}`,
    `Current summary: ${scene.summary}`,
    `Hero concept: ${scene.concept.hero}`,
    `Mood concept: ${scene.concept.mood}`,
    `Layout concept: ${scene.concept.layout}`,
    `Palette cues: ${scene.concept.palette.join(", ")}`,
    `Key props: ${scene.concept.props.join(", ")}`,
    `Existing detail anchors: ${scene.details.map((detail) => `${detail.anchor}:${detail.title}`).join(" | ")}`,
  ].join("\n");
}

export function inventoryAnalysisInstructions(scenePackage) {
  return [
    "You analyze photorealistic reference images for a cultural diorama pipeline.",
    "Describe what is visibly present in the references, not what would be generically expected.",
    "Inventory major objects, clutter clusters, and material cues across the three references.",
    "Use the provided zone grid for rough positions in the room.",
    "Be materially specific and favor small real-world detail over broad style talk.",
    "Distinguish visible evidence from uncertain or hidden construction, contact, cavities and material behavior. Generated references are design aids, not documentary proof of cultural or historical claims.",
    "Identify fine shape features such as taper, cross-section changes, cracks, chips and relief. Note where additional close-up, oblique or grazing-light photographic evidence is needed instead of inventing unseen detail.",
    "Anchor observations should map only to the allowed anchors already present in the scene packet.",
    generatedSceneContext(scenePackage),
  ].join("\n");
}

export function buildInventoryAnalysisInput(scenePackage, referenceInputs) {
  return [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: [
            "Analyze these generated reference images as a real environment artist would.",
            "List the concrete visible objects, clutter, surfaces, and culturally specific material traces.",
            "Then summarize the room logic and lighting.",
          ].join("\n"),
        },
        ...referenceInputs.flatMap(({ reference, dataUrl }) => [
          {
            type: "input_text",
            text: `${reference.id.toUpperCase()} reference note: ${reference.note}`,
          },
          {
            type: "input_image",
            detail: "high",
            image_url: dataUrl,
          },
        ]),
      ],
    },
  ];
}

export function layoutAnalysisInstructions(scenePackage, inventoryAnalysis) {
  return [
    "You are converting photorealistic references into a recursive 3D scene build plan.",
    ...realismDirection,
    "Subdivide the scene into a root, then constituent zones, then clusters, then small props.",
    "Use the requested depth to resolve functional parts and meaningful microdetail, not to fill every zone with repeated props.",
    "Return nodes with absolute world positions inside a roughly 11 by 10 meter cutaway room centered near the origin.",
    "Use builder labels only from the allowed enum and keep the plan buildable for a procedural browser renderer.",
    "Keep all nodes within the schema's bounds and preserve clear circulation and support/contact between objects. Record necessary but unsupported construction in existing node notes for authoring follow-up; do not claim a note creates the missing geometry.",
    "Surface assignments should describe reusable, tileable textures worth generating as a shared library.",
    generatedSceneContext(scenePackage),
    `Inventory summary: ${inventoryAnalysis.summary}`,
    `Room logic: ${inventoryAnalysis.roomLogic}`,
    `Lighting read: ${inventoryAnalysis.lightingRead}`,
    `Clutter notes: ${inventoryAnalysis.clutterNotes.join(" | ")}`,
    `Inventory objects: ${inventoryAnalysis.inventory
      .map(
        (item) =>
          `${item.label} (${item.category}) x${item.count} @ ${item.zone}`,
      )
      .join(" | ")}`,
    `Anchor observations: ${inventoryAnalysis.anchorObservations
      .map((item) => `${item.anchor} @ ${item.zone}: ${item.description}`)
      .join(" | ")}`,
  ].join("\n");
}

export function buildLayoutAnalysisInput(
  scenePackage,
  inventoryAnalysis,
  referenceInputs,
) {
  return [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: [
            "Use these references plus the pre-extracted inventory to produce a recursive scene build hierarchy.",
            "Nodes should progress from zones to clusters to specific object groups, with precise positions and scale.",
            `Requested detail depth: ${scenePackage.scene.generation?.depth ?? scenePackage.requestedDepth ?? 4}.`,
            `Inventory summary: ${inventoryAnalysis.summary}`,
          ].join("\n"),
        },
        ...referenceInputs.flatMap(({ reference, dataUrl }) => [
          {
            type: "input_text",
            text: `${reference.id.toUpperCase()} framing cue: ${reference.note}`,
          },
          {
            type: "input_image",
            detail: "high",
            image_url: dataUrl,
          },
        ]),
      ],
    },
  ];
}

export function texturePromptForPlan(scene, texturePlan) {
  return [
    "Create a photorealistic seamless tileable material texture sample for 3D environment art.",
    `Material label: ${texturePlan.textureLabel}.`,
    `Surface role: ${texturePlan.surfaceRole}.`,
    `Descriptor: ${texturePlan.descriptor}.`,
    `Material hint: ${texturePlan.materialHint}.`,
    `Scene context: ${scene.title} in ${scene.region}.`,
    `Palette cues: ${scene.concept.palette.join(", ")}.`,
    "Image requirements: top-down or orthographic material sample, even neutral lighting, no furniture silhouette, no perspective, no borders, no text, no watermark, no collage.",
    "The texture must be plausible as a repeating surface for a realistic interior diorama.",
    "Preserve believable grain direction, fine relief and natural pigment variation without prominent repeated stains, identical cracks or oversized grain.",
    "Distinguish inherent material variation from localized wear; do not bake blanket dirt, cast shadows or scene lighting into every sample. Preserve intentional joints and ornament.",
  ].join(" ");
}

export function reviewAnalysisInstructions(scenePackage) {
  return [
    "Critically compare the current 3D diorama render against its photorealistic references; previous approval or a successful render is not evidence that it is realistic enough.",
    "Look first for what breaks physical believability, cultural coherence, beauty or inhabited atmosphere, then inspect depth, construction, material scale/repetition, purposeful use, print, light, water and visible plant structure.",
    "Return only the existing review schema. Its automatic patch can change camera framing, clutter density and hotspot placement; use notes to identify deeper defects requiring family-builder or material changes.",
    "Do not hide defects by moving the camera, increase clutter as a proxy for realism, or label unsupported repairs complete. Preserve the current camera when no genuine framing correction is needed and report remaining gaps honestly.",
    "The first image is the current 3D render. The following images are the photorealistic references it should resemble.",
    generatedSceneContext(scenePackage),
  ].join("\n");
}

export function enrichReferencePrompt(scene, referencePrompt) {
  return [
    "Create a photorealistic cultural and architectural reference image.",
    `Subject: ${scene.title}.`,
    `Context: ${scene.region}.`,
    referencePrompt,
    `Palette cues: ${scene.concept.palette.join(", ")}.`,
    `Key objects: ${scene.concept.props.join(", ")}.`,
    "The image must feel like a real place captured by an editorial or architectural photographer.",
    "Use believable materials, subtle wear, natural clutter, grounded scale, and realistic lighting.",
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
        "Bias toward dense everyday detail: furniture, clutter, tools, vessels, lighting, textiles, shelving, floor wear, and traces of use.",
        "The concept.reference prompts must explicitly ask for photorealistic editorial or architectural photography, never illustration or CGI.",
        "The five details must teach real cultural or historical context and must reference one of the allowed anchors.",
        "If the request is broad, make it concrete: pick a place type, material palette, era, and room logic that fit the culture.",
        `The requested recursive detail depth is ${depth} on a 2-6 scale. Higher depth means richer clutter, more sub-areas, and more minute objects.`,
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
    "Subdivide the scene into a root, then constituent zones, then clusters, then small props.",
    "Use the requested depth to decide how far to recurse: higher depth means more micro-detail nodes.",
    "Return nodes with absolute world positions inside a roughly 11 by 10 meter cutaway room centered near the origin.",
    "Use builder labels only from the allowed enum and keep the plan buildable for a procedural browser renderer.",
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
  ].join(" ");
}

export function reviewAnalysisInstructions(scenePackage) {
  return [
    "You compare a simplified 3D diorama render against its photorealistic references.",
    "Favor practical fix suggestions that a procedural Three.js scene can actually apply: camera framing, clutter density, and hotspot placement.",
    "The first image is the current 3D render. The following images are the photorealistic references it should resemble.",
    generatedSceneContext(scenePackage),
  ].join("\n");
}

import { createHash } from "node:crypto";

import { generatedPipelineVersion } from "./constants.mjs";
import { enrichReferencePrompt } from "./prompts.mjs";
import {
  generatedAnchorValues,
  generatedNodeBuilderValues,
  generatedSurfaceRoleValues,
} from "./schema.mjs";

export function sanitizeDepth(value, fallback = 4) {
  const numeric = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(6, Math.max(2, numeric));
}

function normalizeHexColor(value, fallback = "#c08b56") {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().replace(/^#?([0-9a-f]{6})$/i, "#$1");
  return /^#[0-9a-f]{6}$/i.test(normalized)
    ? normalized.toLowerCase()
    : fallback;
}

function hexToRgb(hex) {
  const normalized = normalizeHexColor(hex);
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

function mixChannel(a, b, amount) {
  return Math.round(a + (b - a) * amount);
}

function mixHexColors(colorA, colorB, amount) {
  const [ar, ag, ab] = hexToRgb(colorA);
  const [br, bg, bb] = hexToRgb(colorB);
  return `#${[
    mixChannel(ar, br, amount),
    mixChannel(ag, bg, amount),
    mixChannel(ab, bb, amount),
  ]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function rgbaString(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function trimAtWordBoundary(value, maxLength) {
  const text = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (text.length <= maxLength) {
    return text;
  }
  const clipped = text.slice(0, maxLength);
  const boundary = clipped.lastIndexOf(" ");
  const safe =
    boundary > maxLength * 0.45 ? clipped.slice(0, boundary) : clipped;
  return safe.replace(/[,:;/-]+$/g, "").trim();
}

function defaultPointForAnchor(anchor) {
  const points = {
    fountain: [0, 0.82, 0],
    tile: [1.24, 0.16, 1.42],
    tea_service: [-3.02, 0.78, 2.42],
    cedar_screen: [1.24, 1.88, -4.72],
    citrus: [-2.74, 1.58, -2.02],
    loom: [-3.06, 1.45, -0.48],
    hanging_skeins: [-1.06, 3.06, -4.62],
    dye_table: [0.52, 1.02, 2.02],
    textile_stack: [4.48, 1.46, -0.8],
    pattern_board: [-4.06, 2.36, -4.72],
    counter_bar: [3.24, 2.18, 1.06],
    record_wall: [-4.05, 1.98, 1.96],
    booth: [-3.34, 1.08, 1.68],
    dessert_table: [0.22, 0.96, 1.54],
    menu_panel: [3.94, 1.96, 1.54],
    shared_table: [-0.16, 0.98, -0.12],
    raki_service: [0.72, 1.04, 0.02],
    bottle_shelf: [4.72, 2.18, -3.18],
    mirror_panel: [-4.28, 2.16, -3.72],
    music_corner: [-3.84, 1.62, 1.26],
    drawer_wall: [0.18, 2.08, -4.46],
    bundle_rack: [3.48, 3.02, -2.34],
    scale_table: [-1.56, 1.12, 1.32],
    jar_shelf: [4.34, 1.86, -2.18],
    packet_counter: [-0.82, 1.02, 1.32],
    bookshelf: [-4.05, 2.12, 0.42],
    reading_desk: [0.24, 1.18, 1.12],
    ladder: [-3.88, 2.44, 1.26],
    armchair: [2.74, 1.02, 0.8],
    globe: [2.2, 1.12, 1.95],
    fruit_stand: [-2.55, 1.02, 1.35],
    crate_stack: [-3.45, 0.72, 2.12],
    lantern_row: [0, 4.08, 1.72],
    storefront_sign: [0, 3.45, 2.78],
    vending_machine: [4.7, 1.52, -2.55],
  };
  return points[anchor] ?? [0, 1, 0];
}

function buildViewerConfig(accent, lighting) {
  const normalizedAccent = normalizeHexColor(accent);
  const topAlpha =
    lighting === "night_warm" || lighting === "warm_evening" ? 0.18 : 0.24;
  const bottomBase = lighting === "night_warm" ? "#110d0b" : "#18120f";
  const fogBase = lighting === "night_warm" ? "#17120f" : "#221813";
  const bottom = mixHexColors(normalizedAccent, bottomBase, 0.82);
  const fog = mixHexColors(normalizedAccent, fogBase, 0.84);
  return {
    top: rgbaString(normalizedAccent, topAlpha),
    bottom: rgbaString(bottom, 0.93),
    fog: Number.parseInt(fog.slice(1), 16),
    density:
      lighting === "night_warm"
        ? 0.032
        : lighting === "warm_evening"
          ? 0.031
          : 0.028,
  };
}

function buildCameraConfig(archetype, cameraBias = "center") {
  const presets = {
    market: {
      position: [6.1, 3.25, 6.35],
      target: [0.1, 1.3, 0.48],
    },
    bookshop: {
      position: [5.95, 3.08, 5.7],
      target: [0.18, 1.18, -0.96],
    },
    courtyard: {
      position: [-4.1, 2.9, 5.35],
      target: [0.45, 1.12, -1.55],
    },
    workshop: {
      position: [5.85, 3.05, 5.8],
      target: [0.15, 1.16, -1],
    },
    cafe: {
      position: [5.9, 3.1, 5.8],
      target: [0.24, 1.18, -0.9],
    },
    tavern: {
      position: [5.5, 2.95, 4.95],
      target: [-0.92, 1.08, -1.28],
    },
    shop: {
      position: [5.15, 2.95, 5.1],
      target: [-0.98, 1.12, -0.72],
    },
  };

  const preset = structuredClone(presets[archetype] ?? presets.shop);
  if (cameraBias === "left") {
    preset.position[0] = Math.abs(preset.position[0]);
    preset.target[0] -= 0.75;
  } else if (cameraBias === "right") {
    preset.position[0] = -Math.abs(preset.position[0]);
    preset.target[0] += 0.75;
  }
  return preset;
}

function canonicalizeReferences(scenePackage) {
  const referenceIds = ["hero", "detail", "overview"];
  const sceneReferences = Array.isArray(scenePackage.scene?.concept?.references)
    ? scenePackage.scene.concept.references
    : [];
  const conceptVariants = Array.isArray(scenePackage.conceptVariants)
    ? scenePackage.conceptVariants
    : [];

  scenePackage.scene.concept.references = referenceIds.map((id, index) => ({
    id,
    label: trimAtWordBoundary(
      sceneReferences[index]?.label ??
        (id === "hero" ? "Hero" : id === "detail" ? "Detail" : "Overview"),
      40,
    ),
    note: trimAtWordBoundary(sceneReferences[index]?.note ?? "", 180),
  }));
  scenePackage.conceptVariants = referenceIds.map((id, index) => ({
    id,
    prompt: conceptVariants[index]?.prompt ?? conceptVariants[0]?.prompt ?? "",
  }));
  return scenePackage;
}

function clampNumber(value, minimum, maximum, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(maximum, Math.max(minimum, numeric));
}

function sanitizeVector(value, fallback, minimum, maximum) {
  const source = Array.isArray(value) ? value : fallback;
  return fallback.map((item, index) =>
    clampNumber(source[index], minimum, maximum, item),
  );
}

function textureIdFromPlan(plan) {
  const descriptor = `${plan.surfaceRole}:${plan.textureLabel}:${plan.descriptor}:${plan.materialHint}`;
  const hash = createHash("sha1").update(descriptor).digest("hex").slice(0, 12);
  return `${slugify(plan.textureLabel || plan.surfaceRole || "texture")}-${hash}`;
}

function normalizeTexturePlan(plan, index = 0) {
  const repeat = sanitizeVector(plan.repeat, [2, 2], 0.5, 8);
  const surfaceRole = generatedSurfaceRoleValues.includes(plan.surfaceRole)
    ? plan.surfaceRole
    : "wood";
  const textureLabel = trimAtWordBoundary(
    plan.textureLabel ?? `${surfaceRole} material`,
    48,
  );
  const descriptor = trimAtWordBoundary(plan.descriptor ?? textureLabel, 220);
  const materialHint = trimAtWordBoundary(plan.materialHint ?? surfaceRole, 80);
  return {
    id: textureIdFromPlan({
      surfaceRole,
      textureLabel,
      descriptor,
      materialHint,
    }),
    surfaceRole,
    textureLabel,
    descriptor,
    materialHint,
    repeat,
    imageVersion: `${generatedPipelineVersion}:${surfaceRole}:${createHash("sha1").update(descriptor).digest("hex").slice(0, 8)}`,
    index,
  };
}

function normalizeBuildTreeNode(node, index, requestedDepth) {
  const anchor = generatedAnchorValues.includes(node.anchor)
    ? node.anchor
    : "none";
  const builder = generatedNodeBuilderValues.includes(node.builder)
    ? node.builder
    : "zone";
  const surfaceRole = generatedSurfaceRoleValues.includes(node.surfaceRole)
    ? node.surfaceRole
    : "wood";
  return {
    id:
      slugify(node.id || node.label || `node-${index + 1}`) ||
      `node-${index + 1}`,
    parentId: slugify(node.parentId || "") || "root",
    depth: Math.min(
      requestedDepth,
      Math.max(0, Number.parseInt(String(node.depth ?? 0), 10) || 0),
    ),
    label: trimAtWordBoundary(node.label ?? `Detail ${index + 1}`, 48),
    builder,
    surfaceRole,
    position: sanitizeVector(node.position, [0, 0, 0], -6.5, 6.5),
    rotationY: clampNumber(node.rotationY, -3.2, 3.2, 0),
    scale: sanitizeVector(node.scale, [1, 1, 1], 0.1, 6),
    quantity: Math.round(clampNumber(node.quantity, 1, 18, 1)),
    anchor,
    importance: ["primary", "secondary", "detail", "micro"].includes(
      node.importance,
    )
      ? node.importance
      : "detail",
    notes: trimAtWordBoundary(node.notes ?? "", 180),
  };
}

function applyAnchorRefinements(scene, anchorRefinements = []) {
  const byAnchor = new Map(
    anchorRefinements
      .filter((entry) => generatedAnchorValues.includes(entry.anchor))
      .map((entry) => [
        entry.anchor,
        sanitizeVector(entry.point, [0, 1, 0], -6.5, 6.5),
      ]),
  );

  scene.details = scene.details.map((detail) => ({
    ...detail,
    point:
      byAnchor.get(detail.anchor) ??
      detail.point ??
      defaultPointForAnchor(detail.anchor),
  }));
}

export function ensureGeneratedSceneMetadata(scenePackage) {
  canonicalizeReferences(scenePackage);

  const requestedDepth = sanitizeDepth(
    scenePackage.scene?.generation?.depth ??
      scenePackage.requestedDepth ??
      scenePackage.scene?.blueprint?.detailDepth ??
      4,
  );

  scenePackage.pipelineVersion =
    scenePackage.pipelineVersion ?? generatedPipelineVersion;
  scenePackage.requestedDepth = requestedDepth;
  scenePackage.scene.generation = {
    pipelineVersion: scenePackage.pipelineVersion,
    depth: requestedDepth,
    recommendedDepth: 4,
    ...(scenePackage.scene.generation ?? {}),
  };
  scenePackage.scene.referenceAnalysis =
    scenePackage.scene.referenceAnalysis ?? null;

  const buildTree = scenePackage.scene.buildTree ?? {};
  scenePackage.scene.buildTree = {
    summary: trimAtWordBoundary(buildTree.summary ?? "", 320),
    depth: requestedDepth,
    rootLabel: trimAtWordBoundary(
      buildTree.rootLabel ?? scenePackage.scene.title,
      48,
    ),
    camera: {
      position: sanitizeVector(
        buildTree.camera?.position,
        scenePackage.scene.camera?.position ?? [5.2, 3, 5.2],
        -8,
        8,
      ),
      target: sanitizeVector(
        buildTree.camera?.target,
        scenePackage.scene.camera?.target ?? [0, 1.08, -0.72],
        -8,
        8,
      ),
    },
    nodes: Array.isArray(buildTree.nodes)
      ? buildTree.nodes
          .slice(0, 64)
          .map((node, index) =>
            normalizeBuildTreeNode(node, index, requestedDepth),
          )
      : [],
    surfaceAssignments: Array.isArray(buildTree.surfaceAssignments)
      ? buildTree.surfaceAssignments
          .slice(0, 8)
          .map((entry, index) => normalizeTexturePlan(entry, index))
      : [],
    anchorRefinements: Array.isArray(buildTree.anchorRefinements)
      ? buildTree.anchorRefinements.slice(0, 8).map((entry) => ({
          anchor: entry.anchor,
          point: sanitizeVector(
            entry.point,
            defaultPointForAnchor(entry.anchor),
            -6.5,
            6.5,
          ),
        }))
      : [],
  };

  scenePackage.scene.textureLibrary = Array.isArray(
    scenePackage.scene.textureLibrary,
  )
    ? scenePackage.scene.textureLibrary.slice(0, 8).map((entry, index) => ({
        ...normalizeTexturePlan(entry, index),
        generatedAt: entry.generatedAt ?? null,
      }))
    : [];

  scenePackage.scene.review = scenePackage.scene.review ?? {
    status: "pending",
    notes: [],
    patch: null,
  };

  if (scenePackage.scene.review?.patch?.camera) {
    scenePackage.scene.camera = {
      position: sanitizeVector(
        scenePackage.scene.review.patch.camera.position,
        scenePackage.scene.camera.position,
        -8,
        8,
      ),
      target: sanitizeVector(
        scenePackage.scene.review.patch.camera.target,
        scenePackage.scene.camera.target,
        -8,
        8,
      ),
    };
  } else if (scenePackage.scene.buildTree.camera) {
    scenePackage.scene.camera = scenePackage.scene.buildTree.camera;
  }

  applyAnchorRefinements(
    scenePackage.scene,
    scenePackage.scene.buildTree.anchorRefinements,
  );
  return scenePackage;
}

export function packageNeedsUpgrade(scenePackage) {
  return (
    scenePackage?.pipelineVersion !== generatedPipelineVersion ||
    !Array.isArray(scenePackage?.scene?.buildTree?.nodes) ||
    !scenePackage.scene.buildTree.nodes.length ||
    !Array.isArray(scenePackage?.scene?.textureLibrary) ||
    !scenePackage.scene.textureLibrary.length
  );
}

export function toGeneratedScenePackage(
  spec,
  requestPrompt,
  model,
  requestedDepth = 4,
) {
  const title = String(spec.title ?? "Generated Diorama").trim();
  const promptHash = createHash("sha1")
    .update(requestPrompt.trim().toLowerCase())
    .digest("hex")
    .slice(0, 10);
  const sceneId = `${slugify(title) || "generated-scene"}-${promptHash.slice(0, 6)}`;
  const accent = normalizeHexColor(
    spec.accent,
    normalizeHexColor(spec.colorHexes?.[0] ?? "#c08b56"),
  );
  const colorHexes = (Array.isArray(spec.colorHexes) ? spec.colorHexes : [])
    .slice(0, 5)
    .map((value, index) =>
      normalizeHexColor(value, index === 0 ? accent : "#c08b56"),
    );
  while (colorHexes.length < 5) {
    colorHexes.push(
      colorHexes.length === 0 ? accent : mixHexColors(accent, "#f0e2ca", 0.42),
    );
  }

  const createdAt = new Date().toISOString();
  const blueprint = {
    ...spec.blueprint,
    features: [...new Set(spec.blueprint.features)],
  };

  const scene = {
    id: sceneId,
    generated: true,
    createdAt,
    requestPrompt,
    title,
    region: trimAtWordBoundary(spec.region, 120),
    period: trimAtWordBoundary(spec.period, 120),
    blurb: trimAtWordBoundary(spec.blurb, 220),
    summary: trimAtWordBoundary(spec.summary, 900),
    accent,
    viewer: buildViewerConfig(accent, blueprint.lighting),
    camera: buildCameraConfig(spec.archetype, blueprint.cameraBias),
    details: spec.details.map((detail, index) => ({
      ...detail,
      title: trimAtWordBoundary(detail.title, 48),
      body: trimAtWordBoundary(detail.body, 360),
      id: slugify(detail.id || detail.title) || `detail-${index + 1}`,
      point: defaultPointForAnchor(detail.anchor),
    })),
    concept: {
      mode: "Generated photorealistic references",
      imageVersion: "generated-openai-photo-v2",
      art: spec.archetype,
      references: spec.concept.references.map((reference) => ({
        id: reference.id,
        label: trimAtWordBoundary(reference.label, 40),
        note: trimAtWordBoundary(reference.note, 180),
      })),
      hero: trimAtWordBoundary(spec.concept.hero, 320),
      mood: trimAtWordBoundary(spec.concept.mood, 320),
      layout: trimAtWordBoundary(spec.concept.layout, 320),
      palette: spec.palette.map((item) => trimAtWordBoundary(item, 48)),
      props: spec.props.map((item) => trimAtWordBoundary(item, 48)),
      learning: spec.learning.map((item) => trimAtWordBoundary(item, 140)),
      colors: colorHexes,
    },
    blueprint: {
      ...blueprint,
      archetype: spec.archetype,
      detailDepth: requestedDepth,
    },
    generation: {
      pipelineVersion: generatedPipelineVersion,
      depth: requestedDepth,
      recommendedDepth: 4,
    },
    referenceAnalysis: null,
    buildTree: {
      summary: "",
      depth: requestedDepth,
      rootLabel: title,
      camera: buildCameraConfig(spec.archetype, blueprint.cameraBias),
      nodes: [],
      surfaceAssignments: [],
      anchorRefinements: [],
    },
    textureLibrary: [],
    review: {
      status: "pending",
      notes: [],
      patch: null,
    },
  };

  return ensureGeneratedSceneMetadata({
    createdAt,
    requestPromptHash: promptHash,
    pipelineVersion: generatedPipelineVersion,
    requestedDepth,
    model,
    scene,
    conceptVariants: spec.concept.references.map((reference) => ({
      id: reference.id,
      prompt: enrichReferencePrompt(scene, reference.prompt),
    })),
  });
}

export function mergeReferenceAnalysis(
  scenePackage,
  inventoryAnalysis,
  inventoryModel,
  buildTree,
  buildModel,
) {
  scenePackage.scene.referenceAnalysis = {
    inventoryModel,
    buildModel,
    summary: trimAtWordBoundary(inventoryAnalysis.summary, 320),
    roomLogic: trimAtWordBoundary(inventoryAnalysis.roomLogic, 280),
    lightingRead: trimAtWordBoundary(inventoryAnalysis.lightingRead, 220),
    clutterNotes: inventoryAnalysis.clutterNotes
      .slice(0, 8)
      .map((item) => trimAtWordBoundary(item, 140)),
    materialObservations: inventoryAnalysis.materialObservations
      .slice(0, 10)
      .map((item) => trimAtWordBoundary(item, 160)),
    inventory: inventoryAnalysis.inventory.slice(0, 36),
    anchorObservations: inventoryAnalysis.anchorObservations.slice(0, 8),
  };
  scenePackage.scene.buildTree = {
    ...buildTree,
    depth: sanitizeDepth(buildTree.depth ?? scenePackage.requestedDepth ?? 4),
  };
  ensureGeneratedSceneMetadata(scenePackage);
}

export function applyReviewToScenePackage(scenePackage, reviewPatch, model) {
  scenePackage.scene.review = {
    status: "completed",
    reviewedAt: new Date().toISOString(),
    model,
    summary: trimAtWordBoundary(reviewPatch.summary, 320),
    notes: reviewPatch.notes
      .slice(0, 6)
      .map((note) => trimAtWordBoundary(note, 180)),
    patch: {
      alignmentScore: Math.round(
        clampNumber(reviewPatch.alignmentScore, 0, 100, 72),
      ),
      clutterMultiplier: clampNumber(
        reviewPatch.clutterMultiplier,
        0.8,
        1.7,
        1.05,
      ),
      camera: {
        position: sanitizeVector(
          reviewPatch.camera?.position,
          scenePackage.scene.camera?.position ?? [5.2, 3, 5.2],
          -8,
          8,
        ),
        target: sanitizeVector(
          reviewPatch.camera?.target,
          scenePackage.scene.camera?.target ?? [0, 1.08, -0.72],
          -8,
          8,
        ),
      },
      detailPoints: Array.isArray(reviewPatch.detailPoints)
        ? reviewPatch.detailPoints.slice(0, 8).map((detailPoint) => ({
            anchor: detailPoint.anchor,
            point: sanitizeVector(
              detailPoint.point,
              defaultPointForAnchor(detailPoint.anchor),
              -6.5,
              6.5,
            ),
          }))
        : [],
    },
  };

  scenePackage.scene.camera = scenePackage.scene.review.patch.camera;
  applyAnchorRefinements(
    scenePackage.scene,
    scenePackage.scene.review.patch.detailPoints,
  );
  ensureGeneratedSceneMetadata(scenePackage);
}

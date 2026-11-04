import { buildDouroMiniature } from "../outdoors/douro-miniature.js";
import { buildInteriorEnvironment } from "../interiors/interior-scenes.js";
import { buildSubakMiniature } from "./subak-miniature.js";
import { buildLandscapeMiniature } from "./landscape-miniatures.js";
import { buildRiadMiniature } from "./riad-miniature.js";

export function buildMiniatureEnvironment(definition, renderer, study) {
  if (definition.id === "douro-vineyard")
    return buildDouroMiniature(definition, renderer);
  if (definition.id === "balinese-subak-terraces")
    return buildSubakMiniature(definition, renderer, study);
  if (definition.id === "riad")
    return buildRiadMiniature(definition, renderer, study);
  if (definition.environment === "outdoor")
    return buildLandscapeMiniature(definition, renderer, study);
  const runtime = buildInteriorEnvironment(definition, renderer, {
    miniature: true,
  });
  runtime.sun = runtime.group.children.find(
    (object) => object.isDirectionalLight,
  );
  if (!runtime.sun)
    throw new Error("The interior miniature is missing its authored sun.");
  runtime.views = { whole: study.whole, ...runtime.views };
  runtime.motions = [];
  return runtime;
}

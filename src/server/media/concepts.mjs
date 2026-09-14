import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { canFallbackModel } from "../generation/ai.mjs";
import { modelCandidates } from "../generation/constants.mjs";

export function createConceptService({ openai, conceptScenes, cacheDir }) {
  const inflightConcepts = new Map();

  function getConceptVariant(scene, variantId) {
    return (
      scene.variants.find((variant) => variant.id === variantId) ??
      scene.variants[0]
    );
  }

  function conceptCacheFile(scene, variant) {
    const promptHash = createHash("sha1")
      .update(`${scene.version}:${variant.id}:${variant.prompt}`)
      .digest("hex")
      .slice(0, 12);
    return path.join(cacheDir, `${scene.id}-${variant.id}-${promptHash}.png`);
  }

  async function generateConcept(scene, variant, cacheFile) {
    if (!openai) {
      const error = new Error(
        "OPENAI_API_KEY is not set for concept image generation.",
      );
      error.statusCode = 503;
      throw error;
    }

    let lastError = null;

    for (const model of modelCandidates) {
      try {
        const image = await openai.images.generate({
          model,
          prompt: variant.prompt,
          size: "1536x1024",
          quality: "high",
          background: "opaque",
          output_format: "png",
        });

        const encoded = image.data?.[0]?.b64_json;
        if (!encoded) {
          throw new Error(
            `OpenAI returned no image payload for ${scene.id}/${variant.id}.`,
          );
        }

        const buffer = Buffer.from(encoded, "base64");
        await fs.writeFile(cacheFile, buffer);
        await fs.writeFile(
          `${cacheFile}.json`,
          JSON.stringify(
            {
              generatedAt: new Date().toISOString(),
              model,
              prompt: variant.prompt,
              scene: scene.id,
              title: scene.title,
              variant: variant.id,
              version: scene.version,
            },
            null,
            2,
          ),
        );
        console.log(
          `Generated concept image for ${scene.id}/${variant.id} with ${model}.`,
        );
        return { buffer, cached: false, model };
      } catch (error) {
        lastError = error;
        if (!canFallbackModel(error)) {
          break;
        }
      }
    }

    throw lastError;
  }

  async function getConcept(sceneId, variantId = "hero", refresh = false) {
    const scene = conceptScenes[sceneId];
    if (!scene) {
      const error = new Error(`Unknown concept scene: ${sceneId}`);
      error.statusCode = 404;
      throw error;
    }

    const variant = getConceptVariant(scene, variantId);
    if (!variant) {
      const error = new Error(
        `Unknown concept variant: ${sceneId}/${variantId}`,
      );
      error.statusCode = 404;
      throw error;
    }

    const cacheFile = conceptCacheFile(scene, variant);
    if (!refresh) {
      try {
        const buffer = await fs.readFile(cacheFile);
        return { buffer, cached: true, model: "cache" };
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }
    }

    const flightKey = `${scene.id}:${variant.id}:${scene.version}:${refresh ? "refresh" : "default"}`;
    if (!inflightConcepts.has(flightKey)) {
      const generation = generateConcept(scene, variant, cacheFile).finally(
        () => {
          inflightConcepts.delete(flightKey);
        },
      );
      inflightConcepts.set(flightKey, generation);
    }

    return inflightConcepts.get(flightKey);
  }

  return { getConcept, getConceptVariant, conceptCacheFile };
}

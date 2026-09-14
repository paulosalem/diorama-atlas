import { promises as fs } from "node:fs";

import { cacheFileForId } from "../paths.mjs";
import { canFallbackModel } from "../generation/ai.mjs";
import { modelCandidates } from "../generation/constants.mjs";
import { texturePromptForPlan } from "../generation/prompts.mjs";

export function createTextureService({ openai, textureCacheDir }) {
  function textureCacheFile(textureId) {
    return cacheFileForId(textureCacheDir, textureId, ".png");
  }

  function textureMetadataFile(textureId) {
    return cacheFileForId(textureCacheDir, textureId, ".json");
  }

  async function generateTextureImage(scene, texturePlan, cacheFile) {
    if (!openai) {
      const error = new Error(
        "OPENAI_API_KEY is not set for texture generation.",
      );
      error.statusCode = 503;
      throw error;
    }

    let lastError = null;

    for (const model of modelCandidates) {
      try {
        const image = await openai.images.generate({
          model,
          prompt: texturePromptForPlan(scene, texturePlan),
          size: "1024x1024",
          quality: "high",
          background: "opaque",
          output_format: "png",
        });

        const encoded = image.data?.[0]?.b64_json;
        if (!encoded) {
          throw new Error(
            `OpenAI returned no texture payload for ${scene.id}/${texturePlan.id}.`,
          );
        }

        const buffer = Buffer.from(encoded, "base64");
        await fs.writeFile(cacheFile, buffer);
        await fs.writeFile(
          textureMetadataFile(texturePlan.id),
          JSON.stringify(
            {
              generatedAt: new Date().toISOString(),
              model,
              scene: scene.id,
              textureId: texturePlan.id,
              label: texturePlan.textureLabel,
              surfaceRole: texturePlan.surfaceRole,
              descriptor: texturePlan.descriptor,
              repeat: texturePlan.repeat,
              version: texturePlan.imageVersion,
            },
            null,
            2,
          ),
        );
        return { cached: false, model };
      } catch (error) {
        lastError = error;
        if (!canFallbackModel(error)) {
          break;
        }
      }
    }

    throw lastError;
  }

  async function ensureGeneratedTexture(texturePlan, scene) {
    const cacheFile = textureCacheFile(texturePlan.id);
    try {
      await fs.access(cacheFile);
      return {
        ...texturePlan,
        generatedAt: JSON.parse(
          await fs.readFile(textureMetadataFile(texturePlan.id), "utf8"),
        ).generatedAt,
        cached: true,
      };
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    const result = await generateTextureImage(scene, texturePlan, cacheFile);
    const metadata = JSON.parse(
      await fs.readFile(textureMetadataFile(texturePlan.id), "utf8"),
    );
    return {
      ...texturePlan,
      generatedAt: metadata.generatedAt,
      cached: result.cached,
    };
  }

  async function ensureTextureLibrary(scenePackage) {
    const texturePlans = scenePackage.scene.buildTree.surfaceAssignments.slice(
      0,
      6,
    );
    const textures = await Promise.all(
      texturePlans.map((plan) =>
        ensureGeneratedTexture(plan, scenePackage.scene),
      ),
    );
    scenePackage.scene.textureLibrary = textures;
    return textures;
  }

  async function getTexture(textureId) {
    const buffer = await fs.readFile(textureCacheFile(textureId));
    let metadata = null;
    try {
      metadata = JSON.parse(
        await fs.readFile(textureMetadataFile(textureId), "utf8"),
      );
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    return { buffer, metadata };
  }

  return { ensureTextureLibrary, getTexture };
}

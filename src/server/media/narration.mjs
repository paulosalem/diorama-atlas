import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { canFallbackModel } from "../generation/ai.mjs";
import { speechCandidates } from "../generation/constants.mjs";

export function createNarrationService({
  openai,
  narrationScenes,
  narrationCacheDir,
}) {
  const inflightNarration = new Map();

  function getNarrationDetail(scene, detailId) {
    return scene.details.find((detail) => detail.id === detailId) ?? null;
  }

  function narrationInput(scene, detail) {
    return [`${scene.title}.`, `${detail.title}.`, detail.body].join(" ");
  }

  function narrationCacheFile(scene, detail) {
    const promptHash = createHash("sha1")
      .update(`${scene.version}:${detail.id}:${narrationInput(scene, detail)}`)
      .digest("hex")
      .slice(0, 12);
    return path.join(
      narrationCacheDir,
      `${scene.id}-${detail.id}-${promptHash}.mp3`,
    );
  }

  async function generateNarration(scene, detail, cacheFile) {
    if (!openai) {
      const error = new Error(
        "OPENAI_API_KEY is not set for narration generation.",
      );
      error.statusCode = 503;
      throw error;
    }

    let lastError = null;

    for (const candidate of speechCandidates) {
      try {
        const speech = await openai.audio.speech.create({
          model: candidate.model,
          voice: candidate.voice,
          input: narrationInput(scene, detail),
          instructions: candidate.instructions,
          response_format: "mp3",
          speed: 1,
        });

        const buffer = Buffer.from(await speech.arrayBuffer());
        await fs.writeFile(cacheFile, buffer);
        await fs.writeFile(
          `${cacheFile}.json`,
          JSON.stringify(
            {
              generatedAt: new Date().toISOString(),
              model: candidate.model,
              voice: candidate.voice,
              scene: scene.id,
              title: scene.title,
              detail: detail.id,
              detailTitle: detail.title,
              version: scene.version,
            },
            null,
            2,
          ),
        );
        console.log(
          `Generated narration for ${scene.id}/${detail.id} with ${candidate.model}.`,
        );
        return {
          buffer,
          cached: false,
          model: candidate.model,
          voice: candidate.voice,
        };
      } catch (error) {
        lastError = error;
        if (!canFallbackModel(error)) {
          break;
        }
      }
    }

    throw lastError;
  }

  async function getNarration(sceneId, detailId, refresh = false) {
    const scene = narrationScenes[sceneId];
    if (!scene) {
      const error = new Error(`Unknown narration scene: ${sceneId}`);
      error.statusCode = 404;
      throw error;
    }

    const detail = getNarrationDetail(scene, detailId);
    if (!detail) {
      const error = new Error(
        `Unknown narration detail: ${sceneId}/${detailId}`,
      );
      error.statusCode = 404;
      throw error;
    }

    const cacheFile = narrationCacheFile(scene, detail);
    if (!refresh) {
      try {
        const buffer = await fs.readFile(cacheFile);
        return { buffer, cached: true, model: "cache", voice: "cache" };
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }
    }

    const flightKey = `${scene.id}:${detail.id}:${scene.version}:${refresh ? "refresh" : "default"}`;
    if (!inflightNarration.has(flightKey)) {
      const generation = generateNarration(scene, detail, cacheFile).finally(
        () => {
          inflightNarration.delete(flightKey);
        },
      );
      inflightNarration.set(flightKey, generation);
    }

    return inflightNarration.get(flightKey);
  }

  return { getNarration };
}

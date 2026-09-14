import { readJsonBody, sendJson } from "./http.mjs";
import { jobPayload } from "./generation/jobs.mjs";
import { sanitizeDepth } from "./generation/scene-package.mjs";

export function createApiHandlers({ concepts, narration, textures, scenes }) {
  const { getConcept } = concepts;
  const { getNarration } = narration;
  const { getTexture } = textures;
  const {
    listGeneratedScenes,
    enqueueGeneratedSceneJob,
    getGenerationJob,
    reviewScene,
  } = scenes;

  async function serveConcept(request, response, requestUrl) {
    const [, , rawSceneId, rawVariantId] = requestUrl.pathname
      .split("/")
      .filter(Boolean);
    const sceneId = decodeURIComponent(rawSceneId ?? "");
    const variantId = decodeURIComponent(rawVariantId ?? "hero");
    const refresh = requestUrl.searchParams.get("refresh") === "1";

    try {
      const { buffer, cached, model } = await getConcept(
        sceneId,
        variantId,
        refresh,
      );
      response.writeHead(200, {
        "Cache-Control": "public, max-age=86400",
        "Content-Length": buffer.length,
        "Content-Type": "image/png",
        "X-Concept-Model": model,
        "X-Concept-Reference": variantId,
        "X-Concept-Source": cached ? "cache" : "openai",
      });

      if (request.method === "HEAD") {
        response.end();
        return;
      }

      response.end(buffer);
    } catch (error) {
      const statusCode = error.statusCode ?? error.status ?? 500;
      console.error(
        `Concept image request failed for ${sceneId}/${variantId}:`,
        error.message,
      );
      sendJson(response, statusCode, {
        error: "concept_generation_failed",
        message: error.message,
        scene: sceneId,
        variant: variantId,
      });
    }
  }

  async function serveNarration(request, response, requestUrl) {
    const [, , rawSceneId, rawDetailId] = requestUrl.pathname
      .split("/")
      .filter(Boolean);
    const sceneId = decodeURIComponent(rawSceneId ?? "");
    const detailId = decodeURIComponent(rawDetailId ?? "");
    const refresh = requestUrl.searchParams.get("refresh") === "1";

    try {
      const { buffer, cached, model, voice } = await getNarration(
        sceneId,
        detailId,
        refresh,
      );
      response.writeHead(200, {
        "Cache-Control": "public, max-age=86400",
        "Content-Length": buffer.length,
        "Content-Type": "audio/mpeg",
        "X-Narration-Model": model,
        "X-Narration-Voice": voice,
        "X-Narration-Source": cached ? "cache" : "openai",
      });

      if (request.method === "HEAD") {
        response.end();
        return;
      }

      response.end(buffer);
    } catch (error) {
      const statusCode = error.statusCode ?? error.status ?? 500;
      console.error(
        `Narration request failed for ${sceneId}/${detailId}:`,
        error.message,
      );
      sendJson(response, statusCode, {
        error: "narration_generation_failed",
        message: error.message,
        scene: sceneId,
        detail: detailId,
      });
    }
  }

  async function serveGeneratedSceneJob(request, response, requestUrl) {
    if (!["GET", "HEAD"].includes(request.method ?? "GET")) {
      sendJson(response, 405, { error: "method_not_allowed" });
      return;
    }

    const [, , , rawJobId] = requestUrl.pathname.split("/").filter(Boolean);
    const jobId = decodeURIComponent(rawJobId ?? "");
    const job = getGenerationJob(jobId);
    if (!job) {
      sendJson(response, 404, {
        error: "job_not_found",
        message: `No generation job exists with id ${jobId}.`,
      });
      return;
    }

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    response.end(JSON.stringify({ job: jobPayload(job) }));
  }

  async function serveTexture(request, response, requestUrl) {
    const [, , rawTextureId] = requestUrl.pathname.split("/").filter(Boolean);
    const textureId = decodeURIComponent(rawTextureId ?? "");
    if (!textureId) {
      sendJson(response, 400, {
        error: "missing_texture_id",
        message: "A texture id is required.",
      });
      return;
    }

    try {
      const { buffer, metadata } = await getTexture(textureId);

      response.writeHead(200, {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": buffer.length,
        "Content-Type": "image/png",
        ...(metadata
          ? {
              "X-Texture-Role": metadata.surfaceRole,
              "X-Texture-Version": metadata.version,
            }
          : {}),
      });
      if (request.method === "HEAD") {
        response.end();
        return;
      }
      response.end(buffer);
    } catch (error) {
      const statusCode =
        error.code === "ENOENT"
          ? 404
          : (error.statusCode ?? error.status ?? 500);
      sendJson(response, statusCode, {
        error: statusCode === 404 ? "texture_not_found" : "texture_failed",
        message:
          statusCode === 404 ? `Unknown texture ${textureId}.` : error.message,
      });
    }
  }

  async function serveGeneratedSceneReview(request, response, requestUrl) {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "method_not_allowed" });
      return;
    }

    const [, , rawSceneId, rawAction] = requestUrl.pathname
      .split("/")
      .filter(Boolean);
    const sceneId = decodeURIComponent(rawSceneId ?? "");
    if (rawAction !== "review") {
      sendJson(response, 404, { error: "not_found" });
      return;
    }

    try {
      const payload = await readJsonBody(request, 8 * 1024 * 1024);
      const screenshot = String(payload?.screenshot ?? "");
      if (!screenshot.startsWith("data:image/png;base64,")) {
        sendJson(response, 400, {
          error: "missing_screenshot",
          message: "A PNG screenshot data URL is required for review.",
        });
        return;
      }

      const scene = await reviewScene(sceneId, screenshot);

      sendJson(response, 200, {
        reviewed: true,
        scene,
      });
    } catch (error) {
      const statusCode = error.statusCode ?? error.status ?? 500;
      console.error(
        `Generated scene review failed for ${sceneId}:`,
        error.message,
      );
      sendJson(response, statusCode, {
        error: "generated_scene_review_failed",
        message: error.message,
        scene: sceneId,
      });
    }
  }

  async function serveGeneratedScenes(request, response) {
    if (request.method === "GET" || request.method === "HEAD") {
      const payload = { scenes: listGeneratedScenes() };
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
      });
      if (request.method === "HEAD") {
        response.end();
        return;
      }
      response.end(JSON.stringify(payload));
      return;
    }

    if (request.method !== "POST") {
      sendJson(response, 405, { error: "method_not_allowed" });
      return;
    }

    try {
      const payload = await readJsonBody(request);
      const prompt = String(payload?.prompt ?? "").trim();
      if (!prompt) {
        sendJson(response, 400, {
          error: "missing_prompt",
          message: "A prompt describing the diorama is required.",
        });
        return;
      }
      const depth = sanitizeDepth(payload?.depth ?? 4);
      const job = await enqueueGeneratedSceneJob(prompt, depth);
      sendJson(response, job.status === "completed" ? 200 : 202, {
        job: jobPayload(job),
      });
    } catch (error) {
      const statusCode = error.statusCode ?? error.status ?? 500;
      console.error("Generated scene request failed:", error.message);
      sendJson(response, statusCode, {
        error: "generated_scene_failed",
        message: error.message,
      });
    }
  }

  return {
    serveConcept,
    serveNarration,
    serveTexture,
    serveGeneratedSceneJob,
    serveGeneratedSceneReview,
    serveGeneratedScenes,
  };
}

import http from "node:http";
import { promises as fs } from "node:fs";

import OpenAI from "openai";

import { createApiHandlers } from "./api.mjs";
import { conceptScenes as builtInConcepts } from "./data/concepts.mjs";
import { narrationScenes as builtInNarration } from "./data/narration.mjs";
import { sendJson } from "./http.mjs";
import { createConceptService } from "./media/concepts.mjs";
import { createNarrationService } from "./media/narration.mjs";
import { createTextureService } from "./media/textures.mjs";
import { createPathConfig } from "./paths.mjs";
import { createSceneService } from "./scenes.mjs";
import { createStaticHandler } from "./static.mjs";

/**
 * Initialize isolated services and return an unbound Node HTTP server.
 * Pass openaiClient: null to disable generation, or inject a test double.
 * An empty apiKey disables the default provider even if OPENAI_API_KEY is set.
 * Path options are resolved by createPathConfig, independently of cwd.
 */
export async function createAtlasServer({
  apiKey = process.env.OPENAI_API_KEY,
  openaiClient,
  ...pathOptions
} = {}) {
  const paths = createPathConfig(pathOptions);
  const openai =
    openaiClient === undefined
      ? apiKey
        ? new OpenAI({ apiKey })
        : null
      : openaiClient;
  await Promise.all(
    [
      paths.conceptCacheDir,
      paths.narrationCacheDir,
      paths.generatedSceneDir,
      paths.textureCacheDir,
    ].map((directory) => fs.mkdir(directory, { recursive: true })),
  );

  const conceptScenes = Object.assign(
    Object.create(null),
    structuredClone(builtInConcepts),
  );
  const narrationScenes = Object.assign(
    Object.create(null),
    structuredClone(builtInNarration),
  );
  const concepts = createConceptService({
    openai,
    conceptScenes,
    cacheDir: paths.conceptCacheDir,
  });
  const narration = createNarrationService({
    openai,
    narrationScenes,
    ...paths,
  });
  const textures = createTextureService({ openai, ...paths });
  const scenes = createSceneService({
    openai,
    conceptScenes,
    narrationScenes,
    concepts,
    textures,
    ...paths,
  });
  await scenes.loadGeneratedScenePackages();

  const api = createApiHandlers({ concepts, narration, textures, scenes });
  const serveStatic = createStaticHandler(paths);

  return http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      if (requestUrl.pathname === "/api/generated-scenes") {
        await api.serveGeneratedScenes(request, response);
      } else if (
        requestUrl.pathname.startsWith("/api/generated-scenes/jobs/")
      ) {
        await api.serveGeneratedSceneJob(request, response, requestUrl);
      } else if (
        requestUrl.pathname.startsWith("/api/generated-scenes/") &&
        requestUrl.pathname.endsWith("/review")
      ) {
        await api.serveGeneratedSceneReview(request, response, requestUrl);
      } else if (!["GET", "HEAD"].includes(request.method ?? "GET")) {
        sendJson(response, 405, { error: "method_not_allowed" });
      } else if (requestUrl.pathname.startsWith("/api/concepts/")) {
        await api.serveConcept(request, response, requestUrl);
      } else if (requestUrl.pathname.startsWith("/api/narration/")) {
        await api.serveNarration(request, response, requestUrl);
      } else if (requestUrl.pathname.startsWith("/api/textures/")) {
        await api.serveTexture(request, response, requestUrl);
      } else if (requestUrl.pathname === "/favicon.ico") {
        response.writeHead(204);
        response.end();
      } else {
        await serveStatic(request, response, requestUrl);
      }
    } catch (error) {
      if (response.headersSent) {
        response.destroy(error);
        return;
      }
      const statusCode =
        error instanceof URIError || error.code === "ERR_INVALID_URL"
          ? 400
          : 500;
      if (statusCode === 500) {
        console.error("Request failed:", error.message);
      }
      sendJson(response, statusCode, {
        error: statusCode === 400 ? "bad_request" : "server_error",
      });
    }
  });
}

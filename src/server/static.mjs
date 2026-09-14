import { promises as fs } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import { getMimeType, sendJson } from "./http.mjs";

const browserDirectories = [
  "/src/client/",
  "/public/",
  "/node_modules/three/examples/jsm/",
];
const browserFiles = new Set([
  "/index.html",
  "/node_modules/three/build/three.module.js",
  "/node_modules/three/build/three.core.js",
]);

function staticLocation(rootDir, pathname) {
  const normalized =
    pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const segments = normalized.split("/");
  if (
    segments.some((segment) => segment.startsWith(".")) ||
    normalized.includes("\\") ||
    normalized.includes("\0")
  ) {
    return null;
  }

  const directory = browserDirectories.find((prefix) =>
    normalized.startsWith(prefix),
  );
  if (!directory && !browserFiles.has(normalized)) {
    return null;
  }

  const filePath = path.resolve(rootDir, `.${normalized}`);
  const allowedRoot = directory
    ? path.resolve(rootDir, `.${directory}`)
    : filePath;
  return { filePath, allowedRoot };
}

export function createStaticHandler({ rootDir }) {
  return async function serveStatic(request, response, requestUrl) {
    const location = staticLocation(rootDir, requestUrl.pathname);
    if (!location) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    let file;
    try {
      const realPath = await fs.realpath(location.filePath);
      // A file in an allowed directory must not link to private project files.
      if (
        realPath !== location.allowedRoot &&
        !realPath.startsWith(`${location.allowedRoot}${path.sep}`)
      ) {
        sendJson(response, 403, { error: "forbidden" });
        return;
      }

      file = await fs.open(realPath, "r");
      const stat = await file.stat();
      if (!stat.isFile()) {
        sendJson(response, 404, { error: "not_found" });
        return;
      }

      response.writeHead(200, {
        "Cache-Control": "no-cache",
        "Content-Length": stat.size,
        "Content-Type": getMimeType(realPath),
      });
      if (request.method === "HEAD") {
        response.end();
        return;
      }

      await pipeline(file.createReadStream({ autoClose: false }), response);
    } catch (error) {
      if (response.headersSent) {
        response.destroy(error);
        return;
      }
      const statusCode =
        error.code === "ENOENT" || error.code === "ENOTDIR" ? 404 : 500;
      if (statusCode === 500) {
        console.error(
          `Static file request failed for ${requestUrl.pathname}:`,
          error.message,
        );
      }
      sendJson(response, statusCode, {
        error: statusCode === 404 ? "not_found" : "server_error",
      });
    } finally {
      await file?.close();
    }
  };
}

import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { createAtlasServer } from "../../src/server/app.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const atlas = await createAtlasServer({ apiKey: "", openaiClient: null });
const handler = atlas.listeners("request")[0];
const roots = [
  ["/lab/vendor/", path.join(directory, "node_modules")],
  ["/lab/assets/", path.join(directory, "assets")],
  ["/lab/unity/", path.join(directory, "unity/Build")],
  ["/lab/", path.join(directory, "web")],
];
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".glb": "model/gltf-binary",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".hdr": "application/octet-stream",
};
const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, "http://localhost");
    const route = roots.find(([prefix]) => url.pathname.startsWith(prefix));
    if (!route) return handler(req, res);
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405).end();
      return;
    }
    const [prefix, root] = route;
    const relative = decodeURIComponent(url.pathname.slice(prefix.length));
    const file = await realpath(path.resolve(root, relative || "index.html"));
    const boundary = (await realpath(root)) + path.sep;
    if (!file.startsWith(boundary)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) {
      res.writeHead(404).end("Not a file");
      return;
    }
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] ?? "application/octet-stream",
      "Content-Length": info.size,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    if (req.method === "HEAD") res.end();
    else
      createReadStream(file)
        .on("error", (e) => res.destroy(e))
        .pipe(res);
  } catch (error) {
    const missing = error.code === "ENOENT";
    if (!missing) console.error("Experiment request failed:", error.message);
    if (!res.headersSent) res.writeHead(missing ? 404 : 500);
    res.end(missing ? "Not found" : "Experiment server error");
  }
});
server.listen(Number(process.env.PORT ?? 4307), "127.0.0.1", () => {
  console.log(
    `Marrakech comparison: http://127.0.0.1:${server.address().port}/lab/`,
  );
});

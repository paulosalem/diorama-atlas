import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { getMimeType } from "../src/server/http.mjs";

const { values } = parseArgs({
  options: {
    directory: { type: "string", default: "dist" },
    "base-path": { type: "string", default: "/diorama-atlas/" },
    port: { type: "string", default: "4196" },
    help: { type: "boolean" },
  },
});
if (values.help) {
  console.log(`Preview an exported Atlas using only static files.
Usage: node scripts/serve-pages.mjs [--directory dist] [--base-path /diorama-atlas/] [--port 4196]
The server listens on 127.0.0.1. There are no API routes or generation services.
Example: npm run build:pages && npm run preview:pages
Readiness is printed to stdout; request failures go to stderr.`);
  process.exit(0);
}
const root = await realpath(values.directory);
const base = values["base-path"];
const port = Number(values.port);
if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base))
  throw new Error("Use a rooted base path with a trailing slash.");
if (!Number.isInteger(port) || port < 0 || port > 65535)
  throw new Error("Invalid port.");
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405).end();
      return;
    }
    if (base !== "/" && url.pathname === base.slice(0, -1)) {
      response.writeHead(301, { Location: `${base}${url.search}` }).end();
      return;
    }
    if (!url.pathname.startsWith(base)) {
      response.writeHead(404).end();
      return;
    }
    const relative =
      decodeURIComponent(url.pathname.slice(base.length)) || "index.html";
    if (
      relative.split("/").some((part) => part.startsWith(".")) ||
      relative.includes("\\")
    ) {
      response.writeHead(403).end();
      return;
    }
    const file = await realpath(path.resolve(root, relative));
    if (
      !file.startsWith(`${root}${path.sep}`) ||
      !(await stat(file)).isFile()
    ) {
      response.writeHead(404).end();
      return;
    }
    const bytes = await readFile(file);
    response.writeHead(200, {
      "Content-Type": getMimeType(file),
      "Content-Length": bytes.length,
      "Cache-Control": "no-cache",
    });
    response.end(request.method === "HEAD" ? undefined : bytes);
  } catch (error) {
    const status =
      error.code === "ENOENT" || error.code === "ENOTDIR"
        ? 404
        : error instanceof URIError
          ? 400
          : 500;
    if (status === 500) console.error("Static preview request failed.", error);
    response.writeHead(status).end();
  }
});
server.listen(port, "127.0.0.1", () => {
  console.log(`Static Atlas: http://127.0.0.1:${server.address().port}${base}`);
});

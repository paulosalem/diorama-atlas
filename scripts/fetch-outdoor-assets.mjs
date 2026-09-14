#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
if (args.has("--help")) {
  console.log(`Acquire the offline outdoor reference library from its attributed public sources.
Usage: node scripts/fetch-outdoor-assets.mjs [--materials-only] [--verify]
Requires Node.js, curl, and macOS sips (photo downloading and verification).
Existing verified assets are reused. --verify performs offline integrity checks.
Material slots and reference-photo counts are read dynamically from their manifests.
Progress goes to stderr; the final asset count goes to stdout.

Examples:
  node scripts/fetch-outdoor-assets.mjs --materials-only
  node scripts/fetch-outdoor-assets.mjs
  node scripts/fetch-outdoor-assets.mjs --verify`);
  process.exit(0);
}
for (const arg of args) {
  if (!["--materials-only", "--verify"].includes(arg))
    throw new Error(`Unknown option: ${arg}`);
}
const manifest = JSON.parse(
  readFileSync(resolve(root, "public/outdoors/materials/manifest.json")),
);
const localPath = (path) => {
  if (typeof path !== "string" || !path.startsWith("/public/outdoors/")) {
    throw new Error(`Invalid asset URL path: ${path}`);
  }
  const local = resolve(root, path.slice(1));
  if (!local.startsWith(`${root}/public/outdoors/`))
    throw new Error(`Invalid asset path: ${path}`);
  return local;
};
const curl = (url, limit) =>
  execFileSync(
    "curl",
    [
      "--fail",
      "--location",
      "--silent",
      "--show-error",
      "--max-time",
      "45",
      "--max-filesize",
      String(limit),
      url,
    ],
    { maxBuffer: limit + 1024 },
  );
const digest = (data) => createHash("md5").update(data).digest("hex");
const binaryFiles = [
  ...manifest.materials.flatMap((material) => Object.values(material.files)),
  manifest.sky.file,
];
let count = 0;
for (const file of binaryFiles) {
  const destination = localPath(file.path);
  let data = existsSync(destination) ? readFileSync(destination) : null;
  if (!data || digest(data) !== file.md5) {
    if (args.has("--verify"))
      throw new Error(`Missing or invalid asset: ${file.path}`);
    console.error(`Downloading ${file.path}`);
    data = curl(file.url, 4_000_000);
    if (digest(data) !== file.md5)
      throw new Error(`Source checksum mismatch: ${file.url}`);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, data);
  }
  if (data.length !== file.bytes)
    throw new Error(`Size mismatch: ${file.path}`);
  if (file.path.endsWith(".jpg") && data.readUInt16BE(0) !== 0xffd8)
    throw new Error(`Not JPEG: ${file.path}`);
  if (
    file.path.endsWith(".hdr") &&
    !data.subarray(0, 32).toString().includes("#?RADIANCE")
  )
    throw new Error("Not a Radiance HDR");
  count++;
}
if (!args.has("--materials-only")) {
  const references = JSON.parse(
    readFileSync(resolve(root, "public/outdoors/references.json")),
  );
  for (const scene of references) {
    for (const reference of scene.references) {
      if (!reference.image) continue;
      const destination = localPath(reference.image);
      if (!existsSync(destination)) {
        if (args.has("--verify"))
          throw new Error(`Missing reference: ${reference.image}`);
        console.error(`Downloading ${reference.label}`);
        const pageUrl = new URL(reference.url);
        if (
          pageUrl.hostname !== "commons.wikimedia.org" ||
          !pageUrl.pathname.startsWith("/wiki/File:")
        ) {
          throw new Error(
            `Not an approved Commons photo page: ${reference.url}`,
          );
        }
        // Wikimedia's canonical storage key is the MD5 of its normalized file title.
        const name = decodeURIComponent(
          pageUrl.pathname.slice("/wiki/File:".length),
        ).replaceAll(" ", "_");
        const key = digest(name);
        const encoded = encodeURIComponent(name).replace(
          /[!'()*]/g,
          (character) =>
            `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
        );
        const source = `https://thumb.wikimedia.org/wikipedia/commons/thumb/${key[0]}/${key.slice(0, 2)}/${encoded}/1280px-${encoded}`;
        const data = curl(source, 10_000_000);
        if (data.readUInt16BE(0) !== 0xffd8)
          throw new Error(`Not JPEG: ${source}`);
        mkdirSync(dirname(destination), { recursive: true });
        writeFileSync(destination, data);
        execFileSync("sips", ["-Z", "1600", destination], { stdio: "ignore" });
      }
      const data = readFileSync(destination);
      if (data.readUInt16BE(0) !== 0xffd8)
        throw new Error(`Not JPEG: ${reference.image}`);
      const size = execFileSync("sips", [
        "-g",
        "pixelWidth",
        "-g",
        "pixelHeight",
        destination,
      ]).toString();
      const dimensions = [
        ...size.matchAll(/pixel(?:Width|Height): (\d+)/g),
      ].map((match) => Number(match[1]));
      if (
        dimensions.length !== 2 ||
        dimensions.some((value) => value < 1 || value > 1600)
      ) {
        throw new Error(`Reference exceeds 1600px: ${reference.image}`);
      }
      count++;
    }
  }
}
console.log(
  `Verified ${count} local outdoor assets (${binaryFiles.length} material/environment files; ${count - binaryFiles.length} reference photos).`,
);

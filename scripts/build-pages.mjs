import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { prepareDioramas } from "./prepare-dioramas.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const markerName = ".atlas-pages-build.json";
const publishedDirectories = [
  "src/client",
  "public/audio",
  "public/earth",
  "public/interiors",
  "public/narration",
  "public/outdoors",
  "public/dioramas",
  "public/previews",
  "public/print-library",
  "public/riad",
  "node_modules/three/examples/jsm",
];
const publishedFiles = [
  "public/credits.json",
  "node_modules/three/build/three.module.js",
  "node_modules/three/build/three.core.js",
  "node_modules/three/LICENSE",
  "node_modules/babylonjs/babylon.js",
  "node_modules/babylonjs/license.md",
  "node_modules/babylonjs-loaders/babylonjs.loaders.min.js",
  "node_modules/babylonjs-loaders/license.md",
];

export async function buildPages(outputDir = path.join(root, "dist")) {
  const output = path.resolve(outputDir);
  const relative = path.relative(root, output);
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    ["src", "public", "data", "node_modules", ".git"].includes(
      relative.split(path.sep)[0],
    )
  )
    throw new Error(
      "The Pages output must be a dedicated build directory inside the repository.",
    );
  await prepareDioramas();
  try {
    const stat = await lstat(output);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error("The Pages output is not a regular directory.");
    const marker = JSON.parse(
      await readFile(path.join(output, markerName), "utf8"),
    );
    if (marker.kind !== "atlas-pages-build")
      throw new Error(
        "Refusing to replace a directory not owned by the Pages builder.",
      );
    await rm(output, { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    // A missing marker in an existing directory is not permission to overwrite it.
    try {
      await lstat(output);
      throw new Error(
        "The Pages output already exists without its build marker.",
        { cause: error },
      );
    } catch (missing) {
      if (missing.code !== "ENOENT") throw missing;
    }
  }
  await mkdir(output, { recursive: true });
  await writeFile(
    path.join(output, markerName),
    '{"kind":"atlas-pages-build"}\n',
  );
  let files = 0;
  let bytes = 0;
  async function copy(relativePath) {
    const source = path.join(root, relativePath);
    const stat = await lstat(source);
    if (stat.isSymbolicLink())
      throw new Error(
        `A published asset must not be a symlink: ${relativePath}`,
      );
    const destination = path.join(output, relativePath);
    if (stat.isDirectory()) {
      await mkdir(destination, { recursive: true });
      for (const name of (await readdir(source)).sort()) {
        if (name.startsWith("."))
          throw new Error(
            `Unexpected hidden file in published directory: ${relativePath}/${name}`,
          );
        await copy(path.join(relativePath, name));
      }
    } else if (stat.isFile()) {
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(source, destination);
      files++;
      bytes += stat.size;
    } else throw new Error(`Unsupported published asset: ${relativePath}`);
  }
  for (const entry of [...publishedDirectories, ...publishedFiles])
    await copy(entry);
  const scenes = [];
  for (const name of (await readdir(path.join(root, "data/scenes"))).sort()) {
    if (!name.endsWith(".json")) continue;
    const { scene } = JSON.parse(
      await readFile(path.join(root, "data/scenes", name), "utf8"),
    );
    if (!scene?.id || scenes.some((item) => item.id === scene.id))
      throw new Error(`Invalid or duplicate bundled scene: ${name}`);
    scenes.push(scene);
  }
  await writeFile(
    path.join(output, "public/scenes.json"),
    `${JSON.stringify({ scenes }, null, 2)}\n`,
  );
  const html = await readFile(path.join(root, "index.html"), "utf8");
  if (!html.includes("<head>")) throw new Error("The HTML shell has no head.");
  await writeFile(
    path.join(output, "index.html"),
    html.replace(
      "<head>",
      '<head>\n    <meta name="atlas-hosting" content="static" />',
    ),
  );
  await writeFile(path.join(output, ".nojekyll"), "");
  if (bytes >= 1_000_000_000)
    throw new Error("The site exceeds GitHub Pages' 1 GB limit.");
  return { output, files: files + 4, bytes, bundledScenes: scenes.length };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { values } = parseArgs({
    options: { "output-dir": { type: "string" }, help: { type: "boolean" } },
  });
  if (values.help) {
    console.log(`Build the server-free Atlas for GitHub Pages or another static host.
Usage: node scripts/build-pages.mjs [--output-dir dist]
Prepares native dioramas, then copies browser source, approved assets and renderer runtimes.
Exports bundled scene definitions, not private envelopes, caches or server source.
The result works at the domain root or a project subdirectory without rewriting assets.
An existing output directory must carry this builder's ownership marker.
Example: node scripts/build-pages.mjs --output-dir outputs/pages/site
Writes the build to disk and a JSON summary to stdout. Never calls a provider.`);
  } else
    console.log(
      JSON.stringify(await buildPages(values["output-dir"]), null, 2),
    );
}

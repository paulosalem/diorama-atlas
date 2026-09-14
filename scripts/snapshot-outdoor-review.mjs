import { constants } from "node:fs";
import {
  chmod,
  cp,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
if (
  process.argv[2] !== "--snapshot-dir" ||
  !process.argv[3] ||
  process.argv.length !== 4
)
  throw new Error(
    "Usage: node scripts/snapshot-outdoor-review.mjs --snapshot-dir NEW_DIRECTORY",
  );
const destination = resolve(process.argv[3]);
try {
  await stat(destination);
  throw new Error("The review snapshot directory must not already exist.");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const sourceDirectories = [
  "src",
  "scripts",
  "tests",
  "agentic-tests",
  "docs",
  "data",
];
const copyDirectories = ["public", "node_modules", ".cache"];
for (const directory of [...sourceDirectories, ...copyDirectories]) {
  const source = resolve(root, directory);
  if (destination === source || destination.startsWith(`${source}/`))
    throw new Error(
      "Place the snapshot outside application and dependency directories, for example under outputs/agentic-tests/.",
    );
}
async function sourceFiles(directory) {
  const entries = await readdir(resolve(root, directory), {
    withFileTypes: true,
  });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = `${directory}/${entry.name}`;
        if (entry.isDirectory()) return sourceFiles(path);
        if (!entry.isFile())
          throw new Error(`Source must be a regular file: ${path}`);
        return path;
      }),
    )
  ).flat();
}
async function listSources() {
  const configuration = [
    "index.html",
    "package.json",
    "package-lock.json",
    "eslint.config.js",
    "playwright.config.js",
    ".prettierrc.json",
    ".prettierignore",
  ];
  return [
    ...configuration,
    ...(await Promise.all(sourceDirectories.map(sourceFiles))).flat(),
  ].sort();
}
const sources = await listSources();
const buffers = new Map(
  await Promise.all(
    sources.map(async (file) => [file, await readFile(resolve(root, file))]),
  ),
);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
await mkdir(dirname(destination), { recursive: true });
await mkdir(destination);
for (const [file, bytes] of buffers) {
  const path = resolve(destination, file);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes, { mode: 0o444, flag: "wx" });
}
for (const directory of ["public", "node_modules"]) {
  await cp(resolve(root, directory), resolve(destination, directory), {
    recursive: true,
    dereference: true,
    mode: constants.COPYFILE_FICLONE,
  });
}
for (const directory of [
  "generated-scenes",
  "concepts",
  "narration",
  "textures",
]) {
  const source = resolve(root, ".cache", directory);
  try {
    await stat(source);
  } catch (error) {
    if (error.code === "ENOENT") continue;
    throw error;
  }
  await cp(source, resolve(destination, ".cache", directory), {
    recursive: true,
    dereference: true,
    mode: constants.COPYFILE_FICLONE,
  });
}
if (JSON.stringify(await listSources()) !== JSON.stringify(sources))
  throw new Error(
    "Source inventory changed while creating snapshot. Do not review this incomplete snapshot.",
  );
for (const [file, bytes] of buffers) {
  if (
    digest(await readFile(resolve(root, file))) !== digest(bytes) ||
    digest(await readFile(resolve(destination, file))) !== digest(bytes)
  )
    throw new Error(
      `Source changed while creating snapshot: ${file}. Do not review this incomplete snapshot.`,
    );
  await chmod(resolve(destination, file), 0o444);
}
await writeFile(
  resolve(destination, "review-snapshot.json"),
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      sources: Object.fromEntries(
        [...buffers].map(([file, bytes]) => [file, digest(bytes)]),
      ),
      command: "node src/server/index.mjs",
      note: "Independent review snapshot with read-only source files, copied public assets, copied installed dependencies and local scene caches. No source or dependency symlinks point back to the author workspace. Start its canonical server from this directory without an external ATLAS_CACHE_DIR; store review evidence separately.",
    },
    null,
    2,
  ) + "\n",
  { mode: 0o444, flag: "wx" },
);
console.log(
  JSON.stringify({
    directory: destination,
    sources: sources.length,
    snapshot: "ready",
  }),
);

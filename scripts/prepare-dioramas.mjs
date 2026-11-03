import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { chromium } from "@playwright/test";
import { createAtlasServer } from "../src/server/app.mjs";
import { douroMiniature } from "../src/client/catalog/scene-versions.js";

const root = fileURLToPath(new URL("../", import.meta.url));

async function sourceDigest() {
  const hash = createHash("sha256");
  async function include(relative) {
    const absolute = path.join(root, relative);
    if ((await stat(absolute)).isDirectory()) {
      for (const name of (await readdir(absolute)).sort())
        await include(path.join(relative, name));
    } else {
      hash.update(relative);
      hash.update(await readFile(absolute));
    }
  }
  for (const entry of [
    "src/client/environments",
    "src/client/catalog",
    "src/client/rendering",
    "scripts/prepare-dioramas.mjs",
    "public/outdoors/detail-assets",
    "public/outdoors/references",
    "public/riad/materials",
    "public/print-library",
    "package-lock.json",
  ])
    await include(entry);
  return hash.digest("hex");
}

export async function prepareDioramas({ force = false } = {}) {
  const output = path.join(root, douroMiniature.assetRoot.slice(1));
  const manifestPath = path.join(output, "scene.json");
  const digest = await sourceDigest();
  if (!force) {
    try {
      const saved = JSON.parse(await readFile(manifestPath, "utf8"));
      if (
        saved.sourceDigest === digest &&
        (await stat(path.join(output, douroMiniature.model))).size ===
          saved.bytes &&
        (await stat(path.join(output, "instances.bin"))).size ===
          saved.instanceBytes
      )
        return { output, cached: true, bytes: saved.bytes };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  await mkdir(output, { recursive: true });
  const server = await createAtlasServer({ apiKey: "", openaiClient: null });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  let browser;
  try {
    console.error(
      "Preparing the Babylon miniature from its authored geometry…",
    );
    browser = await chromium.launch({
      args:
        process.platform === "darwin"
          ? ["--use-angle=metal"]
          : ["--enable-unsafe-swiftshader"],
    });
    const page = await browser.newPage({ acceptDownloads: true });
    const downloads = [];
    const downloadErrors = [];
    page.on("pageerror", (error) =>
      console.error("Diorama export:", error.message),
    );
    page.on("download", (download) => {
      const name = download.suggestedFilename();
      if (![douroMiniature.model, "instances.bin"].includes(name)) {
        downloadErrors.push(new Error(`Unexpected diorama export: ${name}`));
        return;
      }
      downloads.push(
        download
          .saveAs(path.join(output, name))
          .catch((error) => downloadErrors.push(error)),
      );
    });
    await page.route("**/api/**", (route) => route.abort());
    await page.goto(
      `http://127.0.0.1:${server.address().port}/src/client/rendering/export.html`,
    );
    await page.waitForFunction(
      () => typeof window.exportDiorama === "function",
    );
    const complete = page.waitForEvent("download", {
      timeout: 240000,
      predicate: (download) =>
        download.suggestedFilename() === douroMiniature.model,
    });
    const manifest = await page.evaluate(() => window.exportDiorama());
    await complete;
    await Promise.all(downloads);
    if (downloadErrors.length)
      throw new AggregateError(
        downloadErrors,
        "Diorama assets could not be saved.",
      );
    await writeFile(
      manifestPath,
      JSON.stringify({ ...manifest, sourceDigest: digest }, null, 2) + "\n",
    );
    return { output, cached: false, bytes: manifest.bytes };
  } finally {
    await browser?.close();
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { values } = parseArgs({
    options: { force: { type: "boolean" }, help: { type: "boolean" } },
  });
  if (values.help)
    console.log(
      "Prepare the main app's native dioramas from local source and licensed assets.\nUsage: npm run prepare:dioramas -- [--force]\nReuses unchanged exports; --force rebuilds. Requires Playwright Chromium.\nWrites public/dioramas/ and prints a JSON result. Never calls a provider.",
    );
  else
    console.log(
      JSON.stringify(await prepareDioramas({ force: values.force }), null, 2),
    );
}

import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { getStudy } from "./web/scenes.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  options: { scene: { type: "string", default: "marrakech" } },
});
const study = getStudy(values.scene);
const output = path.join(directory, study.assetRoot.slice("/lab/".length));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=metal"] });
try {
  const page = await browser.newPage({ acceptDownloads: true });
  const downloads = [];
  page.on("download", (download) => {
    const name = download.suggestedFilename();
    if (![study.model, "instances.bin"].includes(name))
      throw new Error(`Unexpected export: ${name}`);
    downloads.push(download.saveAs(path.join(output, name)));
  });
  page.on("pageerror", (error) => console.error(error));
  await page.goto(
    `${process.env.ATLAS_URL ?? "http://127.0.0.1:4307"}/lab/export.html?scene=${study.id}`,
  );
  await page.waitForFunction(() => typeof window.exportStudy === "function");
  const complete = page.waitForEvent("download", {
    timeout: 240000,
    predicate: (download) => download.suggestedFilename() === study.model,
  });
  const manifest = await page.evaluate(() => window.exportStudy());
  await complete;
  await Promise.all(downloads);
  await writeFile(
    path.join(output, "scene.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(
    `Exported ${study.title}: ${(manifest.bytes / 1048576).toFixed(1)} MiB geometry, ${manifest.instances} GPU instances; ${manifest.animations.length} cloth animations.`,
  );
} finally {
  await browser.close();
}

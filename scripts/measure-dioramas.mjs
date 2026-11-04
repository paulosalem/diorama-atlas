import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { waitForViewer } from "./helpers/browser-viewer.mjs";

const { values } = parseArgs({
  options: {
    scene: { type: "string", multiple: true },
    "base-url": { type: "string", default: "http://127.0.0.1:4183" },
    output: { type: "string" },
    seconds: { type: "string", default: "5" },
    version: { type: "string" },
    view: { type: "string" },
    "include-drafts": { type: "boolean", default: false },
    "source-ref": { type: "string" },
    "render-height": { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});
if (values.help) {
  console.log(`Measure current dioramas sequentially at a fixed, paused arrival.

node scripts/measure-dioramas.mjs --scene ID [--scene ID] --output PATH
  --base-url URL  Running Atlas, default http://127.0.0.1:4183
  --seconds N     Sampling duration per scene, default 5 (range 1-30)
  --version ID    Select an experience, such as miniature
  --view ID       Select a named viewpoint rather than the arrival
  --include-drafts  Permit explicitly selected local drafts
  --source-ref REF  Serve /src/ from a Git revision without changing the checkout
  --render-height N  Match CSS canvas height across differing navigation layouts

Records frame intervals, renderer resources, finite geometry and original views.
Source-reference comparisons retain current public assets; preserve those separately
when a comparison also changes asset bytes.
The 1280x900 viewport, reduced motion and rendering device are recorded.
Provider requests are blocked. Existing results are never overwritten.`);
  process.exit(0);
}
const seconds = Number(values.seconds);
const renderHeight =
  values["render-height"] === undefined
    ? null
    : Number(values["render-height"]);
if (
  !values.scene?.length ||
  !values.output ||
  !Number.isFinite(seconds) ||
  seconds < 1 ||
  seconds > 30
)
  throw new Error("Supply --scene, --output and a duration between 1 and 30.");
if (
  renderHeight !== null &&
  (!Number.isInteger(renderHeight) || renderHeight < 190 || renderHeight > 2000)
)
  throw new Error("--render-height must be an integer between 190 and 2000.");

const exists = await stat(values.output).then(
  () => true,
  (error) => {
    if (error.code === "ENOENT") return false;
    throw error;
  },
);
if (exists) throw new Error(`Output already exists: ${values.output}`);

const sourceRef = values["source-ref"]
  ? execFileSync(
      "git",
      ["rev-parse", "--verify", `${values["source-ref"]}^{commit}`],
      {
        encoding: "utf8",
      },
    ).trim()
  : null;
const baseUrl = new URL(values["base-url"]);
if (!baseUrl.pathname.endsWith("/")) baseUrl.pathname += "/";
const viewerModule = new URL("src/client/viewer/panorama-viewer.js", baseUrl)
  .href;
const browser = await chromium.launch({
  args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
if (sourceRef) {
  const sources = new Map();
  await context.route("**/src/**", async (route) => {
    const pathname = decodeURIComponent(
      new URL(route.request().url()).pathname,
    );
    const file = pathname.slice(pathname.indexOf("/src/") + 1);
    if (!sources.has(file))
      sources.set(file, execFileSync("git", ["show", `${sourceRef}:${file}`]));
    await route.fulfill({
      body: sources.get(file),
      contentType: file.endsWith(".css") ? "text/css" : "text/javascript",
    });
  });
}
await context.route("**/api/**", async (route) => {
  if (
    route.request().method() === "GET" &&
    new URL(route.request().url()).pathname === "/api/generated-scenes"
  )
    return route.continue();
  await route.abort("blockedbyclient");
});
const result = {
  capturedAt: new Date().toISOString(),
  viewport: { width: 1280, height: 900 },
  reducedMotion: "reduce",
  seconds,
  renderHeight,
  sourceRef,
  view: values.view ?? null,
  scenes: [],
};
try {
  for (const id of values.scene) {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 400)
        errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(
      new URL(
        `?scene=${encodeURIComponent(id)}&inspect=1${values["include-drafts"] ? "&draft=1" : ""}${values.version ? `&version=${encodeURIComponent(values.version)}` : ""}`,
        baseUrl,
      ).href,
    );
    await waitForViewer(page);
    if (values.view)
      await page.evaluate(
        async ({ view, viewerModule }) => {
          const { getActiveViewer } = await import(viewerModule);
          const viewer = getActiveViewer();
          if (viewer.runtime.miniature && viewer.mode === "miniature")
            viewer.selectMiniatureView(view);
          else viewer.selectView(view);
        },
        { view: values.view, viewerModule },
      );
    await page.evaluate(() => document.fonts.ready);
    if (renderHeight !== null) {
      const height = await page
        .locator("#canvasMount canvas, #miniatureCanvas")
        .evaluate((canvas) => canvas.clientHeight);
      await page.setViewportSize({
        width: 1280,
        height: 900 + renderHeight - height,
      });
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      const actual = await page
        .locator("#canvasMount canvas, #miniatureCanvas")
        .evaluate((canvas) => canvas.clientHeight);
      if (actual !== renderHeight)
        throw new Error(
          `${id}: requested render height ${renderHeight}, got ${actual}.`,
        );
    }
    const metrics = await page.evaluate(
      async ({ seconds, viewerModule }) => {
        const { getActiveViewer } = await import(viewerModule);
        const viewer = getActiveViewer();
        const { runtime, renderer } = viewer;
        await new Promise((resolve) => setTimeout(resolve, 500));
        const intervals = [];
        const renders = [];
        const autoReset = renderer.info.autoReset;
        renderer.info.autoReset = false;
        renderer.info.reset();
        await new Promise((resolve) => {
          let first, last;
          function sample(time) {
            if (first === undefined) first = time;
            if (last !== undefined) {
              intervals.push(time - last);
              renders.push({
                calls: renderer.info.render.calls,
                triangles: renderer.info.render.triangles,
              });
            }
            renderer.info.reset();
            last = time;
            if (time - first < seconds * 1000)
              window.requestAnimationFrame(sample);
            else resolve();
          }
          window.requestAnimationFrame(sample);
        });
        renderer.info.autoReset = autoReset;
        let invalid = 0;
        let triangles = 0;
        const geometries = new Set();
        runtime.group.traverse((object) => {
          if (!object.isMesh) return;
          triangles +=
            ((object.geometry.index?.count ??
              object.geometry.attributes.position.count) /
              3) *
            (object.isInstancedMesh ? object.count : 1);
          if (object.isInstancedMesh)
            for (const value of object.instanceMatrix.array)
              if (!Number.isFinite(value)) invalid++;
          if (geometries.has(object.geometry)) return;
          geometries.add(object.geometry);
          for (const attribute of Object.values(object.geometry.attributes))
            for (const value of attribute.array)
              if (!Number.isFinite(value)) invalid++;
        });
        const gl = renderer.getContext();
        const debug = gl.getExtension("WEBGL_debug_renderer_info");
        const sorted = [...intervals].sort((a, b) => a - b);
        return {
          renderer: debug
            ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
            : gl.getParameter(gl.RENDERER),
          frames: intervals.length,
          fps: (intervals.length * 1000) / intervals.reduce((a, b) => a + b, 0),
          medianMs: sorted[Math.floor(sorted.length * 0.5)],
          p95Ms: sorted[Math.floor(sorted.length * 0.95)],
          memory: { ...renderer.info.memory },
          canvas: {
            width: renderer.domElement.width,
            height: renderer.domElement.height,
            cssWidth: renderer.domElement.clientWidth,
            cssHeight: renderer.domElement.clientHeight,
          },
          viewport: { width: innerWidth, height: innerHeight },
          render: {
            sceneTriangles: triangles,
            meanCalls:
              renders.reduce((sum, frame) => sum + frame.calls, 0) /
              renders.length,
            meanTriangles:
              renders.reduce((sum, frame) => sum + frame.triangles, 0) /
              renders.length,
          },
          invalid,
          views: runtime.views,
          camera: viewer.camera.position.toArray(),
          fov: viewer.camera.fov,
        };
      },
      { seconds, viewerModule },
    );
    if (errors.length || metrics.invalid)
      throw new Error(
        `${id}: ${errors.join("; ")}; invalid=${metrics.invalid}`,
      );
    result.scenes.push({
      id,
      ...(values.version ? { version: values.version } : {}),
      ...metrics,
    });
    console.error(`${id}: ${metrics.fps.toFixed(1)} FPS`);
    await page.close();
  }
  await mkdir(path.dirname(values.output), { recursive: true });
  await writeFile(values.output, `${JSON.stringify(result, null, 2)}\n`, {
    flag: "wx",
  });
} finally {
  await browser.close();
}

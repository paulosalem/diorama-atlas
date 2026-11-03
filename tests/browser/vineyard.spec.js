import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { waitForViewer } from "../../scripts/helpers/browser-viewer.mjs";

test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
test.describe.configure({ timeout: 180_000 });

async function guardProviderRequests(route) {
  const request = route.request();
  if (
    request.method() === "GET" &&
    new URL(request.url()).pathname === "/api/generated-scenes"
  )
    return route.continue();
  await route.abort();
  throw new Error(`Unexpected provider request: ${request.url()}`);
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", guardProviderRequests);
});

async function measureFoliagePixels(page) {
  return page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    const { renderer, runtime } = getActiveViewer();
    const projections = runtime.impostorTargets.map((target) => {
      const pixels = new Uint16Array(target.width * target.height * 4);
      renderer.readRenderTargetPixels(
        target,
        0,
        0,
        target.width,
        target.height,
        pixels,
      );
      let fingerprint = 2166136261;
      for (const value of pixels)
        fingerprint = Math.imul(fingerprint ^ value, 16777619) >>> 0;
      const coverage = Array.from({ length: 3 }, (_, tile) => {
        let covered = 0;
        for (let y = 0; y < 128; y++)
          for (let x = tile * 128; x < (tile + 1) * 128; x++)
            if (pixels[(y * target.width + x) * 4 + 3] > 0) covered++;
        return covered / (128 * 128);
      });
      return { fingerprint, coverage };
    });
    return { pixelRatio: renderer.getPixelRatio(), projections };
  });
}

test.describe("high-density displays", () => {
  test.use({ deviceScaleFactor: 2 });

  test("all distant foliage projections match the standard-density pixels", async ({
    page,
    browser,
  }, testInfo) => {
    await page.goto("/?scene=douro-vineyard&inspect=1");
    await waitForViewer(page);
    const dense = await measureFoliagePixels(page);
    await page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      getActiveViewer().renderer.setAnimationLoop(null);
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    let standard;
    try {
      await context.route("**/api/**", guardProviderRequests);
      const reference = await context.newPage();
      await reference.goto(page.url());
      await waitForViewer(reference);
      standard = await measureFoliagePixels(reference);
    } finally {
      await context.close();
    }
    await writeFile(
      testInfo.outputPath("foliage-coverage.json"),
      JSON.stringify({ dense, standard }, null, 2),
    );
    expect(dense.pixelRatio).toBe(2);
    expect(standard.pixelRatio).toBe(1);
    expect(dense.projections).toEqual(standard.projections);
    expect(dense.projections).toHaveLength(2);
    for (const { coverage } of dense.projections)
      for (const value of coverage) {
        expect(value).toBeGreaterThan(0.05);
        expect(value).toBeLessThan(0.9);
      }
  });
});

test("the vineyard has finite instanced geometry, open doors, supported steps and real cavities", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?scene=douro-vineyard&inspect=1");
  await waitForViewer(page);
  await expect(page.locator("#sceneRegion")).toContainText("Douro Valley");
  const measured = await page.evaluate(async () => {
    const THREE = await import("three");
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    const { runtime } = getActiveViewer();
    runtime.group.updateMatrixWorld(true);
    let finite = true,
      triangles = 0,
      instances = 0,
      clothMinimum = Infinity;
    const partitions = [];
    const lodTransitions = [];
    runtime.group.traverse((object) => {
      if (object.isLOD) {
        const camera = new THREE.PerspectiveCamera(),
          center = object.getWorldPosition(new THREE.Vector3()),
          distance = object.levels[1].distance;
        camera.position
          .copy(center)
          .add(new THREE.Vector3(0, 0, distance * 0.25));
        camera.updateMatrixWorld();
        object.update(camera);
        const near = object.getCurrentLevel();
        camera.position.copy(center).add(new THREE.Vector3(0, 0, distance * 2));
        camera.updateMatrixWorld();
        object.update(camera);
        lodTransitions.push([near, object.getCurrentLevel()]);
      }
      if (object.userData.instancePartition)
        partitions.push({
          expected: object.userData.instancePartition.entries,
          actual: object.children.reduce(
            (sum, child) =>
              sum + (child.isLOD ? child.levels[0].object.count : child.count),
            0,
          ),
          cells: object.children.length,
          levels: object.children
            .filter((child) => child.isLOD)
            .map((child) => child.levels.map((level) => level.object.count)),
        });
      if (!object.isMesh) return;
      if (object.material.userData?.vineyardWorkCloth) {
        const point = new THREE.Vector3(),
          position = object.geometry.attributes.position;
        for (let i = 0; i < position.count; i++)
          clothMinimum = Math.min(
            clothMinimum,
            point
              .fromBufferAttribute(position, i)
              .applyMatrix4(object.matrixWorld).y,
          );
      }
      for (const attribute of Object.values(object.geometry.attributes))
        finite &&= attribute.array.every(Number.isFinite);
      if (object.isInstancedMesh) {
        finite &&= object.instanceMatrix.array.every(Number.isFinite);
        instances += object.count;
      }
      triangles +=
        ((object.geometry.index?.count ??
          object.geometry.attributes.position.count) /
          3) *
        (object.isInstancedMesh ? object.count : 1);
    });
    const ray = (origin, direction, far = 20) =>
      new THREE.Raycaster(
        new THREE.Vector3(...origin),
        new THREE.Vector3(...direction),
        0.005,
        far,
      ).intersectObject(runtime.group, true)[0]?.distance ?? null;
    const doorway = [];
    for (const x of [-7.12, -6.65, -6.18])
      for (const y of [0.16, 1.2, 2.05])
        doorway.push(ray([x, y, 2.1], [0, 0, -1], 6.6));
    const stairs = runtime.vineyard.stairs.flatMap((stair) =>
      stair.steps.map(([x, y, z]) => ({
        width: stair.width,
        supports: [-0.43, 0, 0.43].map((offset) =>
          ray([x + offset, y + 0.25, z], [0, -1, 0], 0.5),
        ),
        clearance: [-0.43, 0, 0.43].map((offset) =>
          ray([x + offset, y + 1.5, z], [0, 0, -1], 0.34),
        ),
      })),
    );
    const cavities = runtime.depthProbes
      .filter((probe) => probe.kind === "cavity")
      .map((probe) => ({
        ...probe,
        distance: ray(probe.origin, probe.direction, 1),
      }));
    return {
      finite,
      clothMinimum,
      triangles,
      instances,
      partitions,
      lodTransitions,
      impostors: runtime.impostorTargets.map((target) => [
        target.width,
        target.height,
      ]),
      doorway,
      stairs,
      cavities,
      tableSupports: [-0.7, 0.7].flatMap((x) =>
        [-0.29, 0.29].map((z) =>
          ray([-9.7 + x, 1.1, 0.4 + z], [0, -1, 0], 0.35),
        ),
      ),
      counts: runtime.vineyard,
    };
  });
  expect(measured.finite).toBe(true);
  expect(measured.clothMinimum).toBeGreaterThanOrEqual(0.8285);
  expect(measured.clothMinimum).toBeLessThan(0.83);
  expect(measured.instances).toBeGreaterThan(0);
  expect(measured.partitions.length).toBeGreaterThan(0);
  for (const partition of measured.partitions) {
    expect(partition.actual).toBe(partition.expected);
    expect(partition.cells).toBeGreaterThan(0);
    for (const levels of partition.levels) expect(new Set(levels).size).toBe(1);
  }
  expect(measured.impostors).toEqual([
    [384, 128],
    [384, 128],
  ]);
  expect(measured.lodTransitions.length).toBeGreaterThan(0);
  for (const transition of measured.lodTransitions)
    expect(transition).toEqual([0, 1]);
  expect(measured.doorway).toEqual(Array(9).fill(null));
  expect(measured.stairs).toHaveLength(40);
  for (const stair of measured.stairs) {
    expect(stair.width).toBeGreaterThanOrEqual(1.1);
    expect(stair.clearance).toEqual([null, null, null]);
    for (const distance of stair.supports)
      expect(distance).toBeCloseTo(0.25, 2);
  }
  expect(measured.cavities).toHaveLength(3);
  for (const distance of measured.tableSupports)
    expect(distance).toBeCloseTo(0.2725, 3);
  for (const cavity of measured.cavities) {
    expect(cavity.distance, cavity.id).not.toBeNull();
    expect(cavity.distance, cavity.id).toBeGreaterThan(cavity.minDistance);
  }
  for (const key of ["arrival", "vines", "terraces", "quinta"]) {
    await page.locator(`[data-view="${key}"]`).click();
    await expect(page.locator(`[data-view="${key}"]`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page
      .locator("#canvasMount")
      .screenshot({ path: testInfo.outputPath(`${key}.png`) });
  }
  await page.locator('[data-view="arrival"]').click();
  const frames = await page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    for (let i = 0; i < 100; i++) await new Promise(requestAnimationFrame);
    const frames = getActiveViewer()
      .frameDurations.slice(-80)
      .sort((a, b) => a - b);
    return {
      median: frames[40],
      p95: frames[76],
      elapsed: getActiveViewer().elapsed,
    };
  });
  expect(frames.elapsed).toBe(0);
  const measurementPath = testInfo.outputPath("geometry-and-performance.json");
  await writeFile(
    measurementPath,
    JSON.stringify({ ...measured, frames }, null, 2),
  );
  await testInfo.attach("vineyard-geometry-and-performance", {
    path: measurementPath,
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});

test("the vineyard supports both languages, compact controls, sound consent and full disposal", async ({
  page,
}, testInfo) => {
  const failures = [],
    audioRequests = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      failures.push(`${response.status()} ${response.url()}`);
  });
  page.on("request", (request) => {
    if (/\/public\/(?:audio|narration)\/.*\.mp3$/.test(request.url()))
      audioRequests.push(request.url());
  });
  await page.goto("/?scene=douro-vineyard&inspect=1");
  await waitForViewer(page);
  expect(audioRequests).toEqual([]);
  await page.locator("#atlasLanguage").selectOption("pt-BR");
  await expect(page.locator("#sceneTitle")).toHaveText("Vinha no Douro");
  await expect(page.locator("#sceneRegion")).toContainText("Vale do Douro");
  await page.getByRole("button", { name: "Referências", exact: true }).click();
  await expect(page.locator("#outdoorReferences figure")).toHaveCount(4);
  await expect(page.locator("#outdoorReferences")).toContainText("socalcos");
  await page.keyboard.press("Escape");
  await page.locator(".about-button").click();
  await page.locator("#creditSearch").fill("Douro");
  await expect(page.locator(".credit-entry")).toHaveCount(5);
  await expect(page.locator(".credit-note").first()).toContainText(
    "Fotografia real",
  );
  await expect(page.locator(".credit-license").first()).toHaveAttribute(
    "href",
    /creativecommons.org/,
  );
  await page.locator("#creditSearch").fill("folha verde");
  await expect(page.locator(".credit-entry")).toHaveCount(1);
  await expect(page.locator(".credit-note")).toContainText("Marrocos");
  await expect(page.locator(".credit-license")).toHaveAttribute(
    "href",
    "https://creativecommons.org/licenses/by-sa/4.0/",
  );
  await page.keyboard.press("Escape");
  await page.locator("#atlasLanguage").selectOption("en-US");
  for (const size of [
    { width: 320, height: 800 },
    { width: 800, height: 320 },
  ]) {
    await page.setViewportSize(size);
    await page.locator('[data-view="quinta"]').scrollIntoViewIfNeeded();
    await page.locator('[data-view="quinta"]').click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`compact-${size.width}.png`),
    });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (
            await import("/src/client/viewer/panorama-viewer.js")
          ).getActiveViewer().elapsed,
      ),
    )
    .toBeGreaterThan(0.2);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const stopped = await page.evaluate(
    async () =>
      (await import("/src/client/viewer/panorama-viewer.js")).getActiveViewer()
        .elapsed,
  );
  await page.evaluate(async () => {
    for (let i = 0; i < 10; i++) await new Promise(requestAnimationFrame);
  });
  expect(
    await page.evaluate(
      async () =>
        (
          await import("/src/client/viewer/panorama-viewer.js")
        ).getActiveViewer().elapsed,
    ),
  ).toBe(stopped);
  await page.locator("#soundscapeButton").click();
  await page.locator("#ambientSound").click();
  await expect(page.locator("#ambientSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (
            await import("/src/client/viewer/panorama-viewer.js")
          ).getActiveViewer().runtime.soundscape.inspection.contextState,
      ),
    )
    .toBe("running");
  await page.locator("#muteSoundscape").click();
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (
            await import("/src/client/viewer/panorama-viewer.js")
          ).getActiveViewer().runtime.soundscape.inspection.contextState,
      ),
    )
    .toBe("closed");
  await page.keyboard.press("Escape");
  const resources = await page.evaluateHandle(async () => {
    const viewer = (
      await import("/src/client/viewer/panorama-viewer.js")
    ).getActiveViewer();
    const resources = new Set(),
      disposed = new Set();
    for (const target of viewer.runtime.impostorTargets) resources.add(target);
    viewer.runtime.group.traverse((object) => {
      if (!object.isMesh) return;
      resources.add(object.geometry);
      if (object.isInstancedMesh) resources.add(object);
      if (object.getRenderTarget) resources.add(object.getRenderTarget());
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        resources.add(material);
        for (const value of Object.values(material))
          if (value?.isTexture) resources.add(value);
      }
    });
    for (const resource of resources)
      resource.addEventListener("dispose", () => disposed.add(resource));
    return { resources, disposed, sound: viewer.runtime.soundscape };
  });
  await page.locator("#riadExpand").click();
  await expect(page.locator("#worldLoading")).toBeHidden();
  expect(await resources.evaluate((state) => state.disposed.size)).toBe(
    await resources.evaluate((state) => state.resources.size),
  );
  expect(
    await resources.evaluate((state) => state.sound.inspection.contextState),
  ).toBe("closed");
  await resources.dispose();
  expect(failures).toEqual([]);
});

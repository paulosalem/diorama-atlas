import { expect, test } from "@playwright/test";
import { waitForViewer } from "../../scripts/helpers/browser-viewer.mjs";

test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
test.describe.configure({ timeout: 180_000 });

const targets = [
  "balinese-subak-terraces",
  "kerala-backwater-kitchen-courtyard-aadf7c",
  "andean-stone-lane",
  "textile",
  "venetian-boatyard",
];

for (const id of targets) {
  test(`${id}: refined forms preserve physical space, motion, audio consent and cleanup`, async ({
    page,
  }, testInfo) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.route("**/api/**", async (route) => {
      if (
        route.request().method() === "GET" &&
        new URL(route.request().url()).pathname === "/api/generated-scenes"
      )
        return route.continue();
      await route.abort();
      throw new Error(`Unexpected provider request: ${route.request().url()}`);
    });
    await page.goto(`/?scene=${id}&inspect=1`);
    await waitForViewer(page);
    const snapshot = await page.evaluate(async (id) => {
      const THREE = await import("three");
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      const { runtime } = getActiveViewer();
      runtime.group.updateMatrixWorld(true);
      let finite = true;
      runtime.group.traverse((object) => {
        if (!object.isMesh) return;
        for (const attribute of Object.values(object.geometry.attributes))
          finite &&= attribute.array.every(Number.isFinite);
        if (object.isInstancedMesh)
          finite &&= object.instanceMatrix.array.every(Number.isFinite);
      });
      const ray = (origin, direction, far = 20, windowSightline = false) =>
        new THREE.Raycaster(
          new THREE.Vector3(...origin),
          new THREE.Vector3(...direction),
          0.005,
          far,
        )
          .intersectObject(runtime.group, true)
          .find(
            (hit) =>
              hit.object.isMesh &&
              !(windowSightline && hit.object.name === "Window glazing"),
          )?.distance ?? far;
      const probes = runtime.depthProbes.map((probe) => ({
        id: probe.id,
        minDistance: probe.minDistance,
        distance: ray(
          probe.origin,
          probe.direction,
          20,
          probe.kind === "window",
        ),
      }));
      if (id === "venetian-boatyard")
        for (const x of [-10.65, -10.1, -9.65])
          for (const y of [0.35, 1.2, 2.0])
            probes.push({
              id: `oar-workshop-${x}-${y}`,
              minDistance: 1.9,
              distance: ray([x, y, -3.4], [0, 0, -1]),
            });
      return { finite, probes, audio: runtime.soundscape.inspection };
    }, id);
    expect(snapshot.finite).toBe(true);
    for (const probe of snapshot.probes)
      expect(probe.distance, `${id}: ${probe.id}`).toBeGreaterThanOrEqual(
        probe.minDistance,
      );
    expect(snapshot.audio.nodes).toBe(0);
    await testInfo.attach("physical-space", {
      body: JSON.stringify(snapshot, null, 2),
      contentType: "application/json",
    });

    const elapsed = () =>
      page.evaluate(
        async () =>
          (
            await import("/src/client/viewer/panorama-viewer.js")
          ).getActiveViewer().elapsed,
      );
    const before = await elapsed();
    await page.waitForTimeout(150);
    expect(await elapsed()).toBe(before);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect.poll(elapsed).toBeGreaterThan(before + 0.1);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const frozen = await elapsed();
    await page.waitForTimeout(150);
    expect(await elapsed()).toBe(frozen);

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 760, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(
        page.getByRole("button", { name: "Back to world" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const view of await page.locator(".riad-viewpoints button").all()) {
        await view.click();
        await expect(view).toHaveAttribute("aria-pressed", "true");
      }
      await page.screenshot({
        path: testInfo.outputPath(`compact-${viewport.width}.png`),
      });
    }

    const previous = await page.evaluateHandle(async () => {
      const { runtime } = (
        await import("/src/client/viewer/panorama-viewer.js")
      ).getActiveViewer();
      const state = {
        expected: 0,
        disposed: 0,
        soundscape: runtime.soundscape,
      };
      runtime.group.traverse((object) => {
        if (!object.isInstancedMesh) return;
        state.expected++;
        object.addEventListener("dispose", () => {
          state.disposed++;
        });
      });
      return state;
    });
    await page.locator("#soundscapeButton").click();
    await page.locator("#ambientSound").click();
    await expect(page.locator("#ambientSound")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect
      .poll(() =>
        previous.evaluate((state) => state.soundscape.inspection.contextState),
      )
      .toBe("closed");
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.locator("#ambientSound")).toHaveText("Resume ambience");
    await page.locator("#ambientSound").click();
    await page.locator("#muteSoundscape").click();
    await page.locator("#closeSoundscape").click();
    await page.getByRole("button", { name: "Back to world" }).click();
    await expect(page.locator("#worldLoading")).toBeHidden();
    const disposed = await previous.evaluate((state) => ({
      expected: state.expected,
      actual: state.disposed,
      audio: state.soundscape.inspection,
    }));
    expect(disposed.actual).toBe(disposed.expected);
    expect(disposed.audio.nodes).toBe(0);
    await previous.dispose();
    expect(errors).toEqual([]);
  });
}

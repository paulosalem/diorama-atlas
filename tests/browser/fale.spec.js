import { expect, test } from "@playwright/test";
import { waitForViewer } from "../../scripts/helpers/browser-viewer.mjs";
import { faleViews } from "../../src/client/catalog/fale-catalog.js";

test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });

test("fale: bodily clearance, supported steps, basket cavity and full resource lifecycle", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/?scene=samoan-fale");
  await waitForViewer(page);
  const result = await page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    const { probeGeometry, inspectGeometry } =
      await import("/src/client/rendering/scene-inspection.js");
    const v = getActiveViewer(),
      group = v.runtime.group;
    const doors = [];
    for (const offset of [-0.34, 0, 0.34]) {
      for (const y of [0.6, 1.3, 2.2])
        doors.push(probeGeometry(group, [offset, y, 3.8], [0, 0, -1], 2.4));
      for (const y of [0.38, 1.3, 2.25])
        doors.push(
          probeGeometry(group, [-2.7 + offset, y, -7.3], [0, 0, -1], 1.2),
        );
    }
    const steps = [];
    for (const sign of [-1, 1])
      for (let i = 0; i < 3; i++)
        for (const x of [-0.73, 0, 0.73])
          steps.push({
            distance: probeGeometry(
              group,
              [x, 1, sign * (3.15 + i * 0.31)],
              [0, -1, 0],
              1.1,
            ),
            expected: 1 - 0.14 * (3 - i),
          });
    const resources = new Set();
    group.traverse((mesh) => {
      if (!mesh.isMesh) return;
      if (mesh.isInstancedMesh) resources.add(mesh);
      resources.add(mesh.geometry);
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]) {
        resources.add(material);
        for (const value of Object.values(material))
          if (value?.isTexture) resources.add(value);
      }
    });
    window.faleReleased = { expected: resources.size, disposed: 0 };
    for (const resource of resources)
      resource.addEventListener(
        "dispose",
        () => window.faleReleased.disposed++,
      );
    return {
      doors,
      steps,
      finite: inspectGeometry(group).finiteGeometry,
      elapsed: v.elapsed,
      audio: v.runtime.soundscape.inspection,
      cavity: probeGeometry(group, [2.6, 0.9, 0.35], [0, -1, 0], 0.6),
      lintel: probeGeometry(group, [-2.7, 2.44, -7.3], [0, 0, -1], 1),
    };
  });
  expect(result.doors.every((hit) => hit === null)).toBe(true);
  expect(result.finite).toBe(true);
  expect(result.elapsed).toBe(0);
  expect(result.audio.contextState).toBe("closed");
  expect(result.cavity).toBeCloseTo(0.9 - 0.42 - 0.0032, 3);
  expect(result.lintel).toBeGreaterThan(0.2);
  expect(result.lintel).toBeLessThan(0.5);
  for (const step of result.steps)
    expect(step.distance).toBeCloseTo(step.expected, 3);
  for (const key of Object.keys(faleViews))
    await page.locator(`[data-view="${key}"]`).click();
  for (const [name, position, target, fov] of [
    ["reverse-household", [-10, 3, -12], [0, 2, -2], 70],
    ["binding-close", [0.9, 3.35, 0.55], [1.65, 4, 1.3], 48],
    ["basket-close", [2.9, 0.95, 1.1], [2.6, 0.55, 0.35], 50],
    ["umu-close", [6.8, 1.15, -5.3], [6.25, 0.3, -6.5], 50],
  ]) {
    await page.evaluate(
      async ({ position, target, fov }) => {
        const { getActiveViewer } =
          await import("/src/client/viewer/panorama-viewer.js");
        const v = getActiveViewer(),
          original = v.runtime.views.room;
        v.runtime.views.room = { ...original, position, target, fov };
        v.selectView("room");
        v.runtime.views.room = original;
      },
      { position, target, fov },
    );
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const elapsed = () =>
    page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      return getActiveViewer().elapsed;
    });
  await expect.poll(elapsed).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const time = await elapsed();
  await page.waitForTimeout(200);
  expect(await elapsed()).toBe(time);
  await page
    .getByRole("button", { name: "Back to world", exact: true })
    .click();
  await expect(page.locator("#viewer")).toHaveCount(0);
  const released = await page.evaluate(() => window.faleReleased);
  expect(released.disposed).toBe(released.expected);
  expect(errors).toEqual([]);
});

test("fale: peer miniature, shell endpoints, underside, compact layouts and switching", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/?scene=samoan-fale&version=miniature");
  await waitForViewer(page);
  const inspect = () =>
    page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      const v = getActiveViewer();
      return {
        ...v.inspection,
        camera: [...v.camera.position.toArray(), v.camera.fov],
      };
    });
  const initial = await inspect();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  expect((await inspect()).camera).not.toEqual(initial.camera);
  const zoomed = (await inspect()).camera;
  await page.locator("#miniatureCanvas").focus();
  await page.keyboard.press("ArrowRight");
  expect((await inspect()).camera).not.toEqual(zoomed);
  await page.locator('[data-view="whole"]').click();
  await page.locator("#miniatureShell").click();
  expect((await inspect()).shell.progress).toBe(1);
  await page.screenshot({ path: info.outputPath("whole-open.png") });
  for (const key of Object.keys(faleViews)) {
    await page.locator(`[data-view="${key}"]`).click();
    expect((await inspect()).shell.progress).toBe(
      ["joinery", "grounds"].includes(key) ? 0 : 1,
    );
  }
  const underside = await page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    return [-8, 0, 8].map((x) =>
      getActiveViewer().probe([x, -2, 0], [0, 1, 0], 1.1),
    );
  });
  underside.forEach((distance) => expect(distance).toBeCloseTo(0.8, 3));
  for (const [name, position, target] of [
    ["reverse-open", [-33, 23, -36], [3, 4, -1]],
    ["underside", [18, -8, 20], [0, -1, -2]],
  ]) {
    await page.evaluate(
      async ({ position, target }) => {
        const { getActiveViewer } =
          await import("/src/client/viewer/panorama-viewer.js");
        const v = getActiveViewer(),
          whole = v.runtime.views.whole;
        v.runtime.views.whole = {
          ...whole,
          position,
          target,
          overview: false,
          adaptiveBounds: false,
          orbit: false,
        };
        v.selectView("whole");
        v.runtime.views.whole = whole;
      },
      { position, target },
    );
    if (name === "reverse-open") {
      await page.locator("#miniatureShell").click();
      expect((await inspect()).shell.progress).toBe(1);
    }
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
  await page.locator('[data-view="grounds"]').click();
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.screenshot({
      path: info.outputPath(`compact-${viewport.width}.png`),
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect((await inspect()).finiteGeometry).toBe(true);
  expect((await inspect()).audio.contextState).toBe("closed");
  await page.getByRole("link", { name: "Interior", exact: true }).click();
  await waitForViewer(page);
  await expect(
    page.getByRole("link", { name: "Interior", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  await page.getByRole("link", { name: "Miniature", exact: true }).click();
  await waitForViewer(page);
  await expect(page.locator("#miniatureShell")).toBeVisible();
  expect(errors).toEqual([]);
});

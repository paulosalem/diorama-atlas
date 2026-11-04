import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 180_000 });
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    if (
      route.request().method() === "GET" &&
      new URL(route.request().url()).pathname === "/api/generated-scenes"
    )
      return route.continue();
    await route.abort("blockedbyclient");
    throw new Error(`Unexpected provider request: ${route.request().url()}`);
  });
});

async function openDomus(page) {
  await page.goto("/?scene=roman-domus&inspect=1&draft=1");
  await expect(page.locator("#riadLoading")).toBeHidden();
  await expect(page.locator(".riad-viewpoints button")).toHaveCount(20);
}

async function miniatureState(page) {
  return page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    const viewer = getActiveViewer();
    return {
      mode: viewer.mode,
      position: viewer.camera.position.toArray(),
      rotation: viewer.camera.quaternion.toArray(),
      distance: viewer.camera.position.length(),
      fov: viewer.camera.fov,
      elapsed: viewer.elapsed,
      geometries: viewer.renderer.info.memory.geometries,
      roofs: viewer.runtime.group.getObjectByName("domus-roofs").visible,
      clipping: viewer.renderer.localClippingEnabled,
    };
  });
}

async function frames(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

test("miniature is a real interactive peer and restores the same furnished interior", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openDomus(page);
  await page.locator('[data-view="entrance"]').click();
  await page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    const viewer = getActiveViewer();
    const geometries = new Set();
    const disposed = new Set();
    viewer.runtime.group.traverse((object) => {
      // Sprite geometry is shared by Three.js, not owned by this environment.
      if (object.isMesh) geometries.add(object.geometry);
    });
    for (const geometry of geometries)
      geometry.addEventListener("dispose", () => disposed.add(geometry));
    window.domusBefore = {
      runtime: viewer.runtime,
      renderer: viewer.renderer,
      geometries,
      disposed,
    };
  });
  const interior = await miniatureState(page);
  await expect(page.locator(".scene-narration")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await page
    .getByRole("button", { name: "Play narration", exact: true })
    .click();
  await expect(page.locator(".scene-narration")).toHaveAttribute(
    "data-state",
    "playing",
  );
  await page.getByRole("button", { name: "Miniature", exact: true }).click();
  await frames(page);
  expect((await miniatureState(page)).mode).toBe("miniature");
  await expect(page).toHaveURL(/mode=miniature/);
  await expect(page.locator(".walking-pad")).toBeHidden();
  await expect(page.locator(".scene-narration")).toBeHidden();
  await expect(page.locator(".scene-narration")).toHaveAttribute(
    "data-state",
    "paused",
  );
  await expect(page.locator("[data-miniature-view]")).toHaveCount(4);
  const first = await miniatureState(page);
  expect(first.position[1]).toBeGreaterThan(20);
  expect(first.roofs).toBe(false);
  expect(first.clipping).toBe(true);
  const canvas = page.locator("#canvasMount canvas");
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 150,
    box.y + box.height / 2 + 25,
    { steps: 8 },
  );
  await page.mouse.up();
  await frames(page);
  expect((await miniatureState(page)).position).not.toEqual(first.position);
  const rotated = await miniatureState(page);
  await page.mouse.wheel(0, 300);
  await expect
    .poll(async () => (await miniatureState(page)).distance)
    .toBeGreaterThan(rotated.distance + 1);
  await canvas.focus();
  const zoomed = await miniatureState(page);
  await page.keyboard.press("+");
  expect((await miniatureState(page)).distance).toBeLessThan(zoomed.distance);
  expect((await miniatureState(page)).fov).toBe(45);
  const beforePan = await miniatureState(page);
  await page.keyboard.press("ArrowRight");
  expect((await miniatureState(page)).position).not.toEqual(beforePan.position);
  await page.keyboard.press("Shift+ArrowLeft");
  expect((await miniatureState(page)).rotation).not.toEqual(beforePan.rotation);
  const beforeWalk = await miniatureState(page);
  await page.keyboard.down("w");
  await frames(page);
  await page.keyboard.up("w");
  (await miniatureState(page)).position.forEach((n, axis) =>
    expect(n).toBeCloseTo(beforeWalk.position[axis], 10),
  );
  expect((await miniatureState(page)).elapsed).toBe(0);
  await page.locator(".miniature-roof").click();
  expect((await miniatureState(page)).roofs).toBe(true);
  expect((await miniatureState(page)).clipping).toBe(false);
  await page.locator(".miniature-roof").click();
  await frames(page);
  const savedMiniature = await miniatureState(page);
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Interior", exact: true }).click();
    const returned = await miniatureState(page);
    expect(returned.position).toEqual(interior.position);
    expect(returned.fov).toBe(interior.fov);
    expect(returned.roofs).toBe(true);
    expect(returned.clipping).toBe(false);
    await expect(page.locator(".walking-pad")).toBeVisible();
    await page.getByRole("button", { name: "Miniature", exact: true }).click();
    await frames(page);
    const restored = await miniatureState(page);
    restored.position.forEach((n, axis) =>
      expect(n).toBeCloseTo(savedMiniature.position[axis], 7),
    );
    expect(restored.geometries).toBe(savedMiniature.geometries);
  }
  expect(
    await page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      const viewer = getActiveViewer();
      return (
        viewer.runtime === window.domusBefore.runtime &&
        viewer.renderer === window.domusBefore.renderer
      );
    }),
  ).toBe(true);
  await page.getByRole("button", { name: "Interior", exact: true }).click();
  await canvas.focus();
  await page.keyboard.down("w");
  await expect
    .poll(async () => (await miniatureState(page)).position[2])
    .toBeLessThan(interior.position[2] - 0.1);
  await page.keyboard.up("w");
  await page
    .getByRole("button", { name: "Back to world", exact: true })
    .click();
  await expect(page.locator("#worldLoading")).toBeHidden();
  expect(
    await page.evaluate(() =>
      window.domusBefore.renderer.getContext().isContextLost(),
    ),
  ).toBe(true);
  expect(await page.evaluate(() => window.domusBefore.disposed.size)).toBe(
    await page.evaluate(() => window.domusBefore.geometries.size),
  );
  expect(errors).toEqual([]);
});

test("miniature direct links, touch, Portuguese and compact framing survive reload", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    "/?scene=roman-domus&inspect=1&draft=1&mode=miniature&view=bedroom",
  );
  await expect(page.locator('#viewer[aria-busy="false"]')).toBeVisible();
  await expect(page.locator('[data-mode="miniature"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.reload();
  await expect(page.locator('#viewer[aria-busy="false"]')).toBeVisible();
  expect((await miniatureState(page)).mode).toBe("miniature");
  await page.locator("#atlasLanguage").selectOption("pt-BR");
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await frames(page);
    await page
      .getByRole("button", { name: "Restaurar vista", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Miniatura", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const bounds = await page.locator("#canvasMount canvas").boundingBox();
    expect(bounds.height).toBeGreaterThan(190);
    for (const button of await page
      .locator(".representation-controls button, .miniature-viewpoints button")
      .all()) {
      const rect = await button.boundingBox();
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await frames(page);
  const box = await page.locator("#canvasMount canvas").boundingBox();
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const before = await miniatureState(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: x - 30, y, id: 1 },
      { x: x + 30, y, id: 2 },
    ],
  });
  for (let spread = 40; spread <= 85; spread += 15)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: x - spread, y, id: 1 },
        { x: x + spread, y, id: 2 },
      ],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
  await frames(page);
  expect((await miniatureState(page)).distance).toBeLessThan(
    before.distance - 1,
  );
  await page.getByRole("button", { name: "Interior", exact: true }).click();
  expect((await miniatureState(page)).position[1]).toBe(1.62);
  await expect(page.locator('[data-view="bedroom"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Caminhar para a frente", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/draft=1.*mode=interior/);
});

test("every room and viewpoint is reachable with actual body clearance", async ({
  page,
}) => {
  await openDomus(page);
  const result = await page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    const { canStandAt } = await import("/src/client/viewer/walking-space.js");
    const { runtime, renderer } = getActiveViewer();
    const step = 0.15,
      space = runtime.walking;
    const [left, right, back, front] = space.bounds;
    const nx = Math.floor((right - left) / step) + 1;
    const nz = Math.floor((front - back) / step) + 1;
    const at = (x, z) =>
      Math.round((x - left) / step) + Math.round((z - back) / step) * nx;
    const visited = new Uint8Array(nx * nz);
    const start = at(0, 20),
      queue = [start];
    visited[start] = 1;
    for (let head = 0; head < queue.length; head++) {
      const cell = queue[head],
        ix = cell % nx,
        iz = Math.floor(cell / nx);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const x = ix + dx,
          z = iz + dz,
          next = x + z * nx;
        if (x < 0 || z < 0 || x >= nx || z >= nz || visited[next]) continue;
        if (!canStandAt(space, left + x * step, back + z * step)) continue;
        visited[next] = 1;
        queue.push(next);
      }
    }
    const blockedViews = Object.entries(runtime.views)
      .filter(
        ([, view]) =>
          !canStandAt(space, view.position[0], view.position[2]) ||
          !visited[at(view.position[0], view.position[2])],
      )
      .map(([key]) => key);
    const blockedRooms = runtime.rooms
      .filter(
        ({ bounds: [x1, x2, z1, z2] }) =>
          !queue.some((cell) => {
            const x = left + (cell % nx) * step,
              z = back + Math.floor(cell / nx) * step;
            return x > x1 + 0.3 && x < x2 - 0.3 && z > z1 + 0.3 && z < z2 - 0.3;
          }),
      )
      .map((room) => room.id);
    let nonfinite = 0;
    runtime.group.traverse((mesh) => {
      if (mesh.geometry?.attributes.position)
        for (const n of mesh.geometry.attributes.position.array)
          if (!Number.isFinite(n)) nonfinite++;
    });
    renderer.info.autoReset = false;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    renderer.info.reset();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const calls = renderer.info.render.calls;
    renderer.info.autoReset = true;
    return {
      blockedViews,
      blockedRooms,
      nonfinite,
      calls,
    };
  });
  expect(result.blockedViews).toEqual([]);
  expect(result.blockedRooms).toEqual([]);
  expect(result.nonfinite).toBe(0);
  expect(result.calls).toBeLessThan(600);
});

test("walking remains usable under reduced motion and stops on loss of focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDomus(page);
  await page.locator('[data-view="entrance"]').click();
  const canvas = page.locator("#canvasMount canvas");
  await canvas.focus();
  const position = () =>
    page.evaluate(async () => {
      const { getActiveViewer } =
        await import("/src/client/viewer/panorama-viewer.js");
      const viewer = getActiveViewer();
      return { z: viewer.camera.position.z, elapsed: viewer.elapsed };
    });
  const before = await position();
  await page.keyboard.down("w");
  await expect
    .poll(async () => (await position()).z, { timeout: 10_000 })
    .toBeLessThan(before.z - 0.3);
  await page.keyboard.up("w");
  const after = await position();
  expect(after.z).toBeLessThan(before.z - 0.3);
  expect(after.elapsed).toBe(0);
  await page.keyboard.down("w");
  await page.locator("#resetViewButton").focus();
  const stopped = await position();
  await page.waitForTimeout(200);
  expect((await position()).z).toBeCloseTo(stopped.z, 5);
  await page.keyboard.up("w");
  await page.locator('[data-view="entrance"]').click();
  const pad = page.getByRole("button", { name: "Walk forward", exact: true });
  const box = await pad.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const padStart = await position();
  await page.mouse.down();
  await expect
    .poll(async () => (await position()).z, { timeout: 10_000 })
    .toBeLessThan(padStart.z - 0.3);
  await page.mouse.up();
  expect((await position()).z).toBeLessThan(padStart.z - 0.3);
  const released = await position();
  await page.waitForTimeout(150);
  expect((await position()).z).toBeCloseTo(released.z, 5);
});

test("local draft navigation survives returning to the globe and reloading", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDomus(page);
  await page
    .getByRole("button", { name: "Back to world", exact: true })
    .click();
  await expect(page).toHaveURL(/draft=1/);
  await page.reload();
  await page.getByRole("button", { name: "Places", exact: true }).click();
  await page.locator('[data-destination="campania"]').click();
  const link = page.locator(".preview-main");
  await expect(link).toHaveAttribute("href", /scene=roman-domus.*draft=1/);
  await link.click();
  await expect(page.locator(".riad-viewpoints button")).toHaveCount(20);
  await page.reload();
  await expect(page.locator(".riad-viewpoints button")).toHaveCount(20);
});

test("draft gating, references, narration and compact controls stay usable", async ({
  page,
}) => {
  await page.goto("/?scene=roman-domus&inspect=1");
  await expect(page.locator(".initial-loading")).toContainText(
    "This place could not be found.",
  );
  await openDomus(page);
  await expect(page.locator("#sceneRegion")).toContainText(
    "Unfinished local preview",
  );
  await expect(page.locator(".scene-narration")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await page.getByRole("button", { name: "References", exact: true }).click();
  await expect(page.locator("#outdoorReferences figure")).toHaveCount(11);
  await page.locator("#outdoorReferences .reference-close").click();
  await page.getByRole("button", { name: "Show details", exact: true }).click();
  await page
    .locator(".hotspot")
    .filter({ hasText: "Rain, storage and maintenance" })
    .click();
  await expect(page.locator("#riadDetailTitle")).toHaveText(
    "Rain, storage and maintenance",
  );
  for (const size of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const button of await page.locator(".walking-pad button").all()) {
      const box = await button.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(38);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(size.width);
    }
    const pad = await page.locator(".walking-pad").boundingBox();
    const caption = await page.locator(".riad-detail-caption").boundingBox();
    expect(caption.y + caption.height).toBeLessThan(pad.y);
  }
  await page.evaluate(async () => {
    const { setLocale } = await import("/src/client/localization/locale.js");
    setLocale("pt-BR");
  });
  await expect(page.locator("#sceneTitle")).toHaveText(
    "Uma domus romana habitada",
  );
  await expect(
    page.getByRole("button", { name: "Caminhar para a frente" }),
  ).toBeVisible();
});

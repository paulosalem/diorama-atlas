import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 180_000 });
test.use({ locale: "en-US", reducedMotion: "reduce" });

async function state(page) {
  return page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    return getActiveViewer().narration.snapshot;
  });
}

async function open(page) {
  await page.goto("/?scene=riad&inspect=1");
  await expect(page.locator(".scene-narration")).toHaveAttribute(
    "data-state",
    /ready|playing|blocked/,
    { timeout: 120_000 },
  );
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    if (
      route.request().method() === "GET" &&
      new URL(route.request().url()).pathname === "/api/generated-scenes"
    )
      await route.continue();
    else
      throw new Error(`Unexpected paid API request: ${route.request().url()}`);
  });
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.narrationElements = [];
    window.Audio = class extends NativeAudio {
      constructor(...args) {
        super(...args);
        window.narrationElements.push(this);
      }
    };
  });
});

test("the floating narration is opt-in, bilingual and shares one actual player", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (request) => {
    if (/\/public\/narration\/.*\.mp3$/.test(request.url()))
      requests.push(request.url());
  });
  await open(page);
  expect(requests).toEqual([]);
  await expect(page.locator(".narration-text")).toContainText("In Marrakech");
  const [panel, view] = await Promise.all([
    page.locator(".scene-narration").boundingBox(),
    page.locator("#canvasMount").boundingBox(),
  ]);
  expect(
    (panel.width * panel.height) / (view.width * view.height),
  ).toBeLessThan(0.14);
  expect(panel.x).toBeGreaterThan(view.x + view.width / 2);
  const pose = await page.evaluate(async () => {
    const v = (
      await import("/src/client/viewer/panorama-viewer.js")
    ).getActiveViewer();
    return [v.camera.position.toArray(), v.camera.quaternion.toArray()];
  });
  await page.locator("#narrationPlay").click();
  await expect.poll(async () => (await state(page)).state).toBe("playing");
  await expect
    .poll(() => page.evaluate(() => window.narrationElements[0].currentTime))
    .toBeGreaterThan(0);
  await page.locator("#atlasLanguage").selectOption("pt-BR");
  await expect.poll(async () => (await state(page)).asset).toBe("riad-pt-BR");
  await expect.poll(async () => (await state(page)).state).toBe("playing");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.locator(".narration-text")).toContainText("Em Marrakech");
  await expect(page.locator(".narration-disclosure")).toContainText("gerada");
  await expect(page.locator("#sceneTitle")).toContainText("Pátio");
  expect(await page.evaluate(() => window.narrationElements.length)).toBe(1);
  expect(
    await page.evaluate(async () => {
      const v = (
        await import("/src/client/viewer/panorama-viewer.js")
      ).getActiveViewer();
      return [v.camera.position.toArray(), v.camera.quaternion.toArray()];
    }),
  ).toEqual(pose);
  await page.locator("#narrationPlay").click();
  await expect.poll(async () => (await state(page)).state).toBe("paused");
  await page.locator(".narration-minimize").click();
  await expect(page.locator(".narration-text")).toBeHidden();
  await expect(page.locator("#narrationPlay")).toBeVisible();
});

test("view buttons and a sustained close look select their own narration", async ({
  page,
}) => {
  await open(page);
  await page.locator("#narrationPlay").click();
  await expect.poll(async () => (await state(page)).state).toBe("playing");
  await page.locator('[data-view="fountain"]').click();
  await expect
    .poll(async () => (await state(page)).asset)
    .toBe("riad-fountain-en-US");
  await expect.poll(async () => (await state(page)).state).toBe("playing");
  await page.evaluate(async () => {
    const v = (
      await import("/src/client/viewer/panorama-viewer.js")
    ).getActiveViewer();
    v.camera.position.fromArray(v.runtime.views.cedar.position);
    v.lookAt(v.runtime.views.cedar.target);
  });

  await expect
    .poll(async () => (await state(page)).asset)
    .toBe("riad-cedar-en-US");
  await expect(page.locator(".narration-text")).toContainText("cedar screen");
  expect(
    await page.evaluate(
      () => window.narrationElements.filter((a) => !a.paused).length,
    ),
  ).toBe(1);
  await page.locator("#narrationPlay").click();
  await expect.poll(async () => (await state(page)).state).toBe("paused");
  await page.locator('[data-view="tea"]').click();
  await expect
    .poll(async () => (await state(page)).asset)
    .toBe("riad-tea-en-US");
  await expect.poll(async () => (await state(page)).state).toBe("playing");
});

test("looking and zooming with the actual camera controls triggers a focused narration", async ({
  page,
}) => {
  await open(page);
  await page.locator("#narrationPlay").click();
  await expect.poll(async () => (await state(page)).state).toBe("playing");
  const canvas = await page.locator("#canvasMount canvas").boundingBox();
  const x = canvas.x + canvas.width / 2;
  const y = canvas.y + canvas.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 19, y - 50, { steps: 5 });
  await page.mouse.up();
  await page.mouse.wheel(0, -950);
  await expect
    .poll(async () => (await state(page)).asset)
    .toBe("riad-fountain-en-US");
  await expect(page.locator('[data-view="courtyard"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".narration-text")).toContainText(
    "water offers relief",
  );
});

test("saved narration consent survives blocked autoplay without changing existing sound choices", async ({
  page,
  context,
  baseURL,
}) => {
  const preferences = {
    version: 1,
    ambienceEnabled: false,
    musicEnabled: false,
    ambienceVolume: 0.67,
    musicVolume: 0.23,
    mode: "theme",
    narrationEnabled: true,
  };
  await context.addCookies([
    {
      name: "atlas-audio-preferences",
      value: encodeURIComponent(JSON.stringify(preferences)),
      url: baseURL,
    },
  ]);
  await page.addInitScript(() => {
    const nativePlay = HTMLMediaElement.prototype.play;
    let block = true;
    document.hasFocus = () => true;
    HTMLMediaElement.prototype.play = function () {
      if (block && this.src.includes("/public/narration/")) {
        block = false;
        return Promise.reject(
          new DOMException("A gesture is required.", "NotAllowedError"),
        );
      }
      return nativePlay.call(this);
    };
  });
  await open(page);
  await expect.poll(async () => (await state(page)).state).toBe("blocked");
  await expect(page.locator(".narration-status")).toContainText("Select Play");
  const cookie = (await context.cookies()).find(
    (c) => c.name === "atlas-audio-preferences",
  );
  expect(JSON.parse(decodeURIComponent(cookie.value))).toMatchObject(
    preferences,
  );
  await page.locator("#narrationPlay").click();
  await expect.poll(async () => (await state(page)).state).toBe("playing");
});

test("ownership, page hiding, mute and leaving the scene stop the narrator", async ({
  page,
  context,
}) => {
  await open(page);
  await page.locator("#narrationPlay").click();
  await expect.poll(async () => (await state(page)).state).toBe("playing");
  await page.evaluate(() => {
    const other = new BroadcastChannel("diorama-atlas-audio");
    other.postMessage({
      type: "claim",
      time: Date.now() + 1,
      id: "narration-handover",
    });
    other.close();
  });
  await expect.poll(async () => (await state(page)).state).toBe("paused");
  await page.locator("#narrationPlay").click();
  await expect.poll(async () => (await state(page)).state).toBe("playing");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(async () => (await state(page)).state).toBe("paused");
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect((await state(page)).state).toBe("paused");
  await page.locator("#narrationPlay").click();
  await expect.poll(async () => (await state(page)).state).toBe("playing");
  await page.locator("#soundscapeButton").click();
  await page.locator("#muteSoundscape").click();
  await expect.poll(async () => (await state(page)).state).toBe("paused");
  const cookie = (await context.cookies()).find(
    (c) => c.name === "atlas-audio-preferences",
  );
  expect(JSON.parse(decodeURIComponent(cookie.value)).narrationEnabled).toBe(
    false,
  );
  await page.locator("#closeSoundscape").click();
  const narrator = await page.evaluateHandle(
    async () =>
      (await import("/src/client/viewer/panorama-viewer.js")).getActiveViewer()
        .narration,
  );
  await page.locator("#riadExpand").click();
  await expect(page.locator("#placesButton")).toBeVisible();
  expect(await narrator.evaluate((n) => n.snapshot.state)).toBe("disposed");
  expect(
    await page.evaluate(() => window.narrationElements[0].getAttribute("src")),
  ).toBeNull();
  await narrator.dispose();
});

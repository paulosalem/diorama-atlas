import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 180_000 });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    if (
      request.method() === "GET" &&
      new URL(request.url()).pathname === "/api/generated-scenes"
    ) {
      await route.continue();
    } else {
      throw new Error(`Unexpected API request: ${request.url()}`);
    }
  });
});

test("outdoor navigation releases local sound but retains the same theme player", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeContext = window.AudioContext;
    window.playbackContexts = [];
    window.AudioContext = class extends NativeContext {
      constructor(options) {
        super(options);
        window.playbackContexts.push(this);
      }
    };
  });
  const audioRequests = [];
  page.on("request", (request) => {
    if (/\/public\/audio\/.*\.mp3$/.test(request.url()))
      audioRequests.push(request.url());
  });
  await page.goto("/?scene=newar-potters-square&inspect=1");
  await expect(page.locator("#soundscapeButton")).toBeVisible();
  await expect(page.locator("#riadLoading")).toBeHidden();
  expect(audioRequests).toEqual([]);
  const previous = await page.evaluateHandle(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    return getActiveViewer().runtime.soundscape;
  });
  await page.locator("#soundscapeButton").click();
  await page.locator("#ambientSound").click();
  await expect(page.locator("#ambientSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#ambientSound")).toHaveText("Mute ambience");
  await page.locator("#musicMode").selectOption("theme");
  await expect(page.locator("#musicSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const musicContext = await page.evaluateHandle(() =>
    window.playbackContexts.at(-1),
  );
  await page.locator("#closeSoundscape").click();
  await page.getByRole("button", { name: "Back to world" }).click();
  await expect(page.locator(".world")).toBeVisible();
  await expect(page.locator("#worldLoading")).toBeHidden();
  await expect
    .poll(() =>
      previous.evaluate((soundscape) => soundscape.inspection.contextState),
    )
    .toBe("closed");
  expect(await musicContext.evaluate((context) => context.state)).toBe(
    "running",
  );
  await page.locator("#placesButton").click();
  await page.locator('#placesPanel [data-destination="kyoto"]').click();
  await expect(page.locator("#placePreview .preview-main")).toHaveAttribute(
    "href",
    "/?scene=kissaten&inspect=1",
  );
  await page.locator('.place-pin[data-location="kyoto"]').click();
  await expect(page.locator("#riadLoading")).toBeHidden();
  await page.locator("#soundscapeButton").click();
  await expect(page.locator("#ambientSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await musicContext.evaluate((context) => context.state)).toBe(
    "running",
  );
  expect(await page.evaluate(() => window.playbackContexts.length)).toBe(3);
  expect(
    await previous.evaluate((soundscape) => soundscape.inspection.sources),
  ).toBe(0);
  await page.locator("#muteSoundscape").click();
  await expect
    .poll(() => musicContext.evaluate((context) => context.state))
    .toBe("closed");
  await previous.dispose();
  await musicContext.dispose();
});

test("outdoor references and consolidated audio credits coexist with navigation", async ({
  page,
}) => {
  await page.goto("/?scene=central-asian-madrasa&inspect=1");
  await expect(page.locator("#soundscapeButton")).toBeVisible();
  await expect(page.locator("#riadLoading")).toBeHidden();
  await page.getByRole("button", { name: "References", exact: true }).click();
  await expect(page.locator("#outdoorReferences figure")).toHaveCount(2);
  await expect(page.locator("#outdoorReferences")).toContainText(
    "licensed recordings",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator("#outdoorReferences")).toBeHidden();
  await page
    .getByRole("button", { name: "About Atlas and asset credits" })
    .click();
  await page.locator("#creditSearch").fill("Kevin MacLeod");
  await expect(page.locator(".credit-entry")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog.about-atlas")).not.toBeVisible();
  await expect(page).toHaveURL(/scene=central-asian-madrasa/);
  await page.locator("#soundscapeButton").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#soundscapeDialog")).not.toBeVisible();
  await expect(page).toHaveURL(/scene=central-asian-madrasa/);
});

test("outdoor recorded narration participates in mute and single-tab ownership", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = () => {
      throw new Error("Browser speech is not an OpenAI recording.");
    };
  });
  await page.goto("/?scene=newar-potters-square&inspect=1");
  await expect(page.locator("#soundscapeButton")).toBeVisible();
  await expect(page.locator("#riadLoading")).toBeHidden();
  await page.getByRole("button", { name: "Show details" }).click();
  await page.locator("#listenButton").click();
  await expect(page.locator("#listenButton")).toHaveText("Pause");
  expect(
    await page.evaluate(async () => {
      const { getAtlasAudio } = await import("/src/client/main.js");
      return getAtlasAudio().inspection.ownsPlayback;
    }),
  ).toBe(true);
  await page.locator("#soundscapeButton").click();
  await page.locator("#muteSoundscape").click();
  await expect(page.locator("#listenButton")).toHaveText("Listen");
  await page.locator("#closeSoundscape").click();
  await page.locator("#listenButton").click();
  await expect(page.locator("#listenButton")).toHaveText("Pause");
  await page.evaluate(() => {
    const other = new BroadcastChannel("diorama-atlas-audio");
    other.postMessage({
      type: "claim",
      time: Date.now() + 1,
      id: "another-view",
    });
    other.close();
  });
  await expect(page.locator("#listenButton")).toHaveText("Listen");
});

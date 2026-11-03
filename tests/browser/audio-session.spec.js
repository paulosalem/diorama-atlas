import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 180_000 });

async function openSoundscape(page, scene) {
  await page.goto(`/?scene=${scene}&inspect=1`);
  await page.locator("#soundscapeButton").click();
}

async function audioState(page) {
  return page.evaluate(async () => {
    const { getAtlasAudio } = await import("/src/client/main.js");
    return {
      snapshot: getAtlasAudio().snapshot,
      inspection: getAtlasAudio().inspection,
    };
  });
}

test.beforeEach(async ({ context }) => {
  await context.route("**/api/**", async (route) => {
    if (
      route.request().method() === "GET" &&
      new URL(route.request().url()).pathname === "/api/generated-scenes"
    )
      await route.continue();
    else throw new Error(`Unexpected API request: ${route.request().url()}`);
  });
});

test("same-tab scene changes release the previous ambience before the next place plays", async ({
  page,
}) => {
  await openSoundscape(page, "riad");
  await page.locator("#ambientSound").click();
  await expect(page.locator("#ambientSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#musicSound").click();
  await expect(page.locator("#musicSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.evaluate(async () => {
    const { getActiveViewer } =
      await import("/src/client/viewer/panorama-viewer.js");
    window.previousAmbience = getActiveViewer().runtime.soundscape;
  });
  await page.locator("#closeSoundscape").click();
  await page.getByRole("button", { name: "Back to world" }).click();
  await page.locator("#placesButton").click();
  await expect
    .poll(() =>
      page.evaluate(() => window.previousAmbience.inspection.contextState),
    )
    .toBe("closed");
  await page
    .locator("#placesPanel button")
    .filter({ hasText: "Istanbul" })
    .click();
  await page.locator("#placePreview .preview-main").click();
  await page.locator("#soundscapeButton").click();
  await expect(page.locator("#ambientSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect((await audioState(page)).snapshot.ambienceLabel).toContain(
    "service room",
  );
  expect(
    await page.evaluate(() => window.previousAmbience.inspection.sources),
  ).toBe(0);
  await page.locator("#muteSoundscape").click();
  expect((await audioState(page)).inspection.music.sources).toBe(0);
});

test("another visible Atlas tab takes audio ownership instead of layering soundscapes", async ({
  context,
  page,
}) => {
  // Embedded browser panes can both remain visible; do not rely on tab hiding.
  await context.addInitScript(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.hasFocus = () => true;
  });
  await openSoundscape(page, "riad");
  await page.locator("#ambientSound").click();
  await expect(page.locator("#ambientSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const other = await context.newPage();
  await openSoundscape(other, "meyhane");
  await expect
    .poll(async () => (await audioState(other)).inspection.ambience.state)
    .not.toBe("loading");
  if ((await audioState(other)).inspection.ambience.state !== "playing")
    await other.locator("#ambientSound").click();
  await expect(other.locator("#ambientSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect
    .poll(async () => (await audioState(page)).inspection.ambience.sources)
    .toBe(0);
  await expect(page.locator("#ambienceStatus")).toContainText(
    "another Atlas tab",
  );
  await page.locator("#ambientSound").click();
  await expect(page.locator("#ambientSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect
    .poll(async () => (await audioState(other)).inspection.ambience.sources)
    .toBe(0);
  await expect(other.locator("#ambienceStatus")).toContainText(
    "another Atlas tab",
  );
  await other.locator("#closeSoundscape").click();
  await other.getByRole("button", { name: "Back to world" }).click();
  await expect(other.locator("#placesButton")).toBeVisible();
  await expect
    .poll(async () => (await audioState(page)).inspection.ambience.sources)
    .toBe(0);
  expect((await audioState(other)).snapshot.ambience.state).toBe("armed");
  expect((await audioState(other)).inspection.ownsPlayback).toBe(true);
});

test("sound choices are stored in a persistent cookie and restored after reopening", async ({
  context,
  page,
  browser,
  baseURL,
}) => {
  await openSoundscape(page, "riad");
  await page.locator("#ambientSound").click();
  await expect(page.locator("#ambientSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#musicMode").selectOption("theme");
  await expect(page.locator("#musicSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#ambienceVolume").fill("67");
  await page.locator("#musicVolume").fill("23");
  const cookie = (await context.cookies()).find(
    (entry) => entry.name === "atlas-audio-preferences",
  );
  expect(cookie).toBeDefined();
  expect(cookie.expires).toBeGreaterThan(Date.now() / 1000 + 86400);
  const saved = JSON.parse(decodeURIComponent(cookie.value));
  expect(saved).toMatchObject({
    ambienceEnabled: true,
    musicEnabled: true,
    mode: "theme",
    ambienceVolume: 0.67,
    musicVolume: 0.23,
  });
  const browserState = await context.storageState();
  await page.reload();
  await page.locator("#soundscapeButton").click();
  await expect(page.locator("#musicMode")).toHaveValue("theme");
  await expect(page.locator("#ambienceVolume")).toHaveValue("67");
  await expect(page.locator("#musicVolume")).toHaveValue("23");
  expect((await audioState(page)).snapshot.ambienceEnabled).toBe(true);
  expect((await audioState(page)).snapshot.musicEnabled).toBe(true);
  await page.locator("#muteSoundscape").click();
  await page.reload();
  await page.locator("#soundscapeButton").click();
  await expect(page.locator("#ambientSound")).toHaveText("Enable ambience");
  await expect(page.locator("#musicSound")).toHaveText("Enable music");
  const reopened = await browser.newContext({
    baseURL,
    storageState: browserState,
  });
  try {
    await reopened.route("**/api/**", async (route) => {
      if (new URL(route.request().url()).pathname === "/api/generated-scenes")
        await route.continue();
      else throw new Error(`Unexpected API request: ${route.request().url()}`);
    });
    const freshPage = await reopened.newPage();
    await openSoundscape(freshPage, "meyhane");
    const restored = (await audioState(freshPage)).snapshot;
    expect(restored).toMatchObject(saved);
    await expect(freshPage.locator("#musicVolume")).toHaveValue("23");
  } finally {
    await reopened.close();
  }
});

test("taking ownership cancels another tab's pending sound loads", async ({
  context,
  page,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
  });
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/public/audio/ambience/fountain-courtyard.mp3",
    async (route) => {
      await gate;
      await route.continue();
    },
  );
  await openSoundscape(page, "riad");
  const other = await context.newPage();
  await openSoundscape(other, "meyhane");
  await page.locator("#ambientSound").click();
  await expect(page.locator("#ambientSound")).toHaveText("Cancel loading");
  await other.locator("#ambientSound").click();
  await expect(other.locator("#ambientSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect
    .poll(async () => (await audioState(page)).inspection.ambience.contextState)
    .toBe("closed");
  release();
  await page.waitForTimeout(250);
  expect((await audioState(page)).inspection.ambience.sources).toBe(0);
  await other.locator("#musicVolume").fill("41");
  await expect(page.locator("#musicVolume")).toHaveValue("41");
});

test("concurrent starts elect one player and repeated music changes retain no outgoing tracks", async ({
  context,
  page,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    window.playbackContexts = [];
    const NativeAudioContext = AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      constructor() {
        super();
        window.playbackContexts.push(this);
      }
    };
  });
  await openSoundscape(page, "riad");
  const other = await context.newPage();
  await openSoundscape(other, "meyhane");
  await Promise.all(
    [page, other].map((tab) =>
      tab.evaluate(async () => {
        const { getAtlasAudio } = await import("/src/client/main.js");
        getAtlasAudio().toggleMusic();
      }),
    ),
  );
  await expect
    .poll(async () => {
      const states = await Promise.all([page, other].map(audioState));
      return states.filter(
        (state) => state.inspection.music.state === "playing",
      ).length;
    })
    .toBe(1);
  const winner = (await audioState(page)).inspection.ownsPlayback
    ? page
    : other;
  const loser = winner === page ? other : page;
  await expect
    .poll(async () => (await audioState(loser)).inspection.music.nodes)
    .toBe(0);
  for (const mode of ["theme", "place", "theme", "place"])
    await winner.locator("#musicMode").selectOption(mode);
  await expect(winner.locator("#musicSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await winner.locator("#muteSoundscape").click();
  expect((await audioState(winner)).inspection.music.sources).toBe(0);
  await expect
    .poll(async () => (await audioState(loser)).snapshot.musicEnabled)
    .toBe(false);
  await expect
    .poll(() =>
      winner.evaluate(() =>
        window.playbackContexts.every((context) => context.state === "closed"),
      ),
    )
    .toBe(true);
});

test("blocked automatic playback keeps saved consent and offers a working Resume", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "atlas-audio-preferences",
      value: encodeURIComponent(
        JSON.stringify({
          version: 1,
          ambienceEnabled: false,
          musicEnabled: true,
          ambienceVolume: 0.55,
          musicVolume: 0.32,
          mode: "theme",
        }),
      ),
      url: "http://127.0.0.1:4194/",
      expires: Date.now() / 1000 + 86400,
      sameSite: "Lax",
    },
  ]);
  await page.addInitScript(() => {
    const nativeResume = AudioContext.prototype.resume;
    let blocked = false;
    AudioContext.prototype.resume = function () {
      if (!blocked) {
        blocked = true;
        return new Promise(() => {});
      }
      return nativeResume.call(this);
    };
  });
  await openSoundscape(page, "riad");
  await expect(page.locator("#musicSound")).toHaveText("Resume music");
  await expect(page.locator("#musicStatus")).toContainText("choice is saved");
  expect((await audioState(page)).inspection.music.contextState).toBe("closed");
  await page.locator("#musicSound").click();
  await expect(page.locator("#musicSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect((await audioState(page)).snapshot.musicEnabled).toBe(true);
});

test("first-visit music and ambience are enabled but wait for playback consent", async ({
  page,
  context,
}) => {
  const recordings = [];
  page.on("request", (request) => {
    if (/\.(mp3|ogg|wav)$/.test(request.url())) recordings.push(request.url());
  });
  await page.goto("/");
  await page.locator("#soundscapeButton").click();
  expect((await audioState(page)).snapshot).toMatchObject({
    ambienceEnabled: true,
    musicEnabled: true,
    narrationEnabled: false,
    ambience: { state: "armed" },
    music: { state: "paused" },
  });
  expect((await audioState(page)).inspection.music.contextState).toBe("closed");
  expect(recordings).toEqual([]);
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name === "atlas-audio-preferences",
    ),
  ).toBe(false);
  await expect(page.locator("#ambientSound")).toHaveText("Disable ambience");
  await page.locator("#musicSound").click();
  await expect(page.locator("#musicSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#closeSoundscape").click();
  await page.locator("#placesButton").click();
  await page
    .locator("#placesPanel button")
    .filter({ hasText: "Marrakech" })
    .click();
  await page.locator("#placePreview .preview-main").click();
  await page.locator("#soundscapeButton").click();
  await expect(page.locator("#ambientSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#musicSound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

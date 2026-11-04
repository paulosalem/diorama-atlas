import { expect, test } from "@playwright/test";
import { waitForViewer } from "../../scripts/helpers/browser-viewer.mjs";

test.describe.configure({ timeout: 180_000 });

test("whole-app fullscreen keeps navigation, dialogs and language available", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?scene=riad&version=miniature");
  await waitForViewer(page, { timeout: 120_000 });
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
  const button = page.locator("#fullscreenButton");
  await expect(button).toHaveAccessibleName("Full screen");
  await button.click();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.fullscreenElement === document.documentElement,
      ),
    )
    .toBe(true);
  await expect(button).toHaveAccessibleName("Exit full screen");
  await page.locator("#soundscapeButton").click();
  await expect(page.locator("#soundscapeDialog")).toBeVisible();
  await page.locator("#closeSoundscape").click();
  await page.locator("#atlasLanguage").selectOption("pt-BR");
  await expect(button).toHaveAccessibleName("Sair da tela cheia");
  await page.getByRole("link", { name: "Interior", exact: true }).click();
  await expect(page.locator("#miniatureCanvas")).toHaveCount(0);
  await waitForViewer(page, { timeout: 120_000 });
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#fullscreenButton")).toHaveCount(1);
  await page.locator(".about-button").click();
  await expect(page.locator(".about-atlas")).toBeVisible();
  await page
    .getByRole("button", { name: "Fechar informações e créditos" })
    .click();
  await page.locator("#canvasMount canvas").focus();
  await page.evaluate(() =>
    document.activeElement.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ),
  );
  await expect(page).toHaveURL(/scene=riad/);
  await page.evaluate(() => document.exitFullscreen());
  await expect(button).toHaveAccessibleName("Tela cheia");
  await button.click();
  await page.locator("#riadExpand").click();
  await expect(page.locator(".world")).toBeVisible();
  await expect(page.locator("#worldLoading")).toBeHidden();
  await expect(button).toHaveAccessibleName("Sair da tela cheia");
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
});

test("unsupported fullscreen offers honest Home Screen guidance in both languages", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "fullscreenEnabled", { get: () => false });
  });
  await page.goto("/");
  await expect(page.locator("#soundscapeButton")).toBeVisible();
  await page.locator("#fullscreenButton").click();
  const help = page.locator("#fullscreenHelp");
  await expect(help).toBeVisible();
  await expect(help).toContainText("Full screen is not available");
  await expect(help).toContainText("Add to Home Screen");
  await expect(help).toContainText("Install app");
  await expect(help).toContainText("Internet access is still required");
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
  await page.locator("#closeFullscreenHelp").click();
  await expect(page.locator("#fullscreenButton")).toBeFocused();
  await page.locator("#atlasLanguage").selectOption("pt-BR");
  await page.locator("#fullscreenButton").click();
  await expect(help).toContainText("Adicionar à Tela de Início");
  await page.keyboard.press("Escape");
  await expect(help).toBeHidden();
});

test("a denied fullscreen request can be retried without claiming success", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const request = Element.prototype.requestFullscreen;
    let first = true;
    Element.prototype.requestFullscreen = function (...args) {
      if (first) {
        first = false;
        return Promise.reject(new DOMException("Denied", "NotAllowedError"));
      }
      return request.apply(this, args);
    };
  });
  await page.goto("/?scene=riad");
  await waitForViewer(page, { timeout: 120_000 });
  await page.locator("#fullscreenButton").click();
  await expect(page.locator("#fullscreenMessage")).toContainText(
    "Full screen could not be changed",
  );
  await expect(page.locator("#fullscreenButton")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.locator("#closeFullscreenHelp").click();
  await page.locator("#fullscreenButton").click();
  await expect(page.locator("#fullscreenButton")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#fullscreenButton").click();
});

for (const standalone of ["media-query", "apple"]) {
  test(`${standalone}: an installed app explains system controls and disposes help`, async ({
    page,
  }) => {
    await page.addInitScript((mode) => {
      Object.defineProperty(document, "fullscreenEnabled", {
        get: () => false,
      });
      if (mode === "apple")
        Object.defineProperty(navigator, "standalone", { value: true });
      else {
        const original = window.matchMedia;
        window.matchMedia = (query) => {
          const result = original.call(window, query);
          if (query === "(display-mode: standalone)")
            Object.defineProperty(result, "matches", { value: true });
          return result;
        };
      }
    }, standalone);
    await page.goto("/?scene=missing");
    await page.locator("#fullscreenButton").click();
    await expect(page.locator("#fullscreenMessage")).toContainText(
      "Atlas is already open as an app",
    );
    await expect(page.locator(".fullscreen-install")).toBeHidden();
    await page.evaluate(() =>
      window.dispatchEvent(new PageTransitionEvent("pagehide")),
    );
    await expect(page.locator("#fullscreenHelp")).toHaveCount(0);
    await expect(page.locator("#fullscreenButton")).toHaveCount(0);
  });
}

for (const [width, height] of [
  [390, 844],
  [844, 390],
  [768, 1024],
  [1024, 768],
]) {
  test(`fullscreen controls remain reachable at ${width}x${height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const [name, query] of [
      ["globe", ""],
      ["miniature", "?scene=riad&version=miniature"],
    ]) {
      await page.goto(`/${query}`);
      if (query) await waitForViewer(page, { timeout: 120_000 });
      else await expect(page.locator("#soundscapeButton")).toBeVisible();
      await page.locator("#atlasLanguage").selectOption("pt-BR");
      const button = page.locator("#fullscreenButton");
      const box = await button.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(height);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await page.screenshot({
        path: info.outputPath(`${name}-${width}x${height}-fullscreen.png`),
      });
      await button.click();
    }
  });
}

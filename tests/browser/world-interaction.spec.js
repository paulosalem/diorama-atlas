import { expect, test } from "@playwright/test";

async function openWorld(page) {
  await page.goto("./");
  await expect(page.locator("#worldLoading")).toBeHidden();
  return page.locator('.place-pin[data-location="marrakech"]');
}

for (const viewport of [
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
]) {
  test.describe(`touch globe at ${viewport.width}x${viewport.height}`, () => {
    test.use({ hasTouch: true, viewport });

    test("a tap pins the preview and only its entry link opens the place", async ({
      page,
    }, info) => {
      const marker = await openWorld(page);
      const preview = page.locator("#placePreview");
      await marker.tap();
      await expect(preview).toBeVisible();
      await expect(page.locator(".world")).toBeVisible();
      expect(new URL(page.url()).searchParams.has("scene")).toBe(false);
      await expect
        .poll(() =>
          preview.locator("img").evaluate((image) => image.naturalWidth),
        )
        .toBeGreaterThan(0);
      await preview.evaluate((element) =>
        Promise.all(
          element.getAnimations().map((animation) => animation.finished),
        ),
      );
      await page.screenshot({ path: info.outputPath("touch-preview.png") });
      const bounds = await preview.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
      await page.getByRole("button", { name: "Close preview" }).tap();
      await expect(preview).toBeHidden();
      await marker.tap();
      await expect(preview).toBeVisible();
      await page.locator("#globeCanvas canvas").tap({
        position: { x: 10, y: viewport.height / 2 },
      });
      await expect(preview).toBeHidden();
      await marker.tap();
      await page.locator(".preview-main").tap();
      await expect(page).toHaveURL(/\?scene=riad&inspect=1/);
      await expect(page.locator("#riadLoading")).toBeHidden();
    });
  });
}

test("a touch followed by a compatibility MouseEvent still previews the place", async ({
  page,
}) => {
  const marker = await openWorld(page);
  await marker.dispatchEvent("pointerdown", { pointerType: "touch" });
  await marker.evaluate((button) =>
    button.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }),
    ),
  );
  await expect(page.locator("#placePreview")).toBeVisible();
  await expect(page.locator(".world")).toBeVisible();
  expect(new URL(page.url()).searchParams.has("scene")).toBe(false);
  await marker.click();
  await expect(page).toHaveURL(/\?scene=riad&inspect=1/);
});

test("a cancelled touch does not change a later compatibility mouse click", async ({
  page,
}) => {
  const marker = await openWorld(page);
  await marker.dispatchEvent("pointerdown", { pointerType: "touch" });
  await marker.dispatchEvent("pointercancel", { pointerType: "touch" });
  await marker.evaluate((button) =>
    button.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }),
    ),
  );
  await expect(page).toHaveURL(/\?scene=riad&inspect=1/);
});

test("mouse hover previews, mouse click enters, and keyboard activation still enters", async ({
  page,
}) => {
  const marker = await openWorld(page);
  await marker.hover();
  await expect(page.locator("#placePreview")).toBeVisible();
  await page.mouse.move(5, 5);
  await expect(page.locator("#placePreview")).toBeHidden();
  await marker.click();
  await expect(page).toHaveURL(/\?scene=riad&inspect=1/);
  const keyboardMarker = await openWorld(page);
  await keyboardMarker.focus();
  await expect(page.locator("#placePreview")).toBeVisible();
  await keyboardMarker.dispatchEvent("pointerdown", { pointerType: "touch" });
  await keyboardMarker.press("Enter");
  await expect(page).toHaveURL(/\?scene=riad&inspect=1/);
});

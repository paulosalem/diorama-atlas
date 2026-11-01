import { expect, test } from "@playwright/test";

test("About credits the Atlas creator and links his homepage in both languages", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#worldLoading")).toBeHidden({ timeout: 120_000 });
  for (const [locale, credit] of [
    ["en-US", "Created by Dr. Paulo Salem."],
    ["pt-BR", "Criado por Dr. Paulo Salem."],
  ]) {
    await page.locator("#atlasLanguage").selectOption(locale);
    await page.locator(".about-button").click();
    await expect(page.locator(".about-author")).toHaveText(credit);
    const author = page.getByRole("link", {
      name: "Dr. Paulo Salem",
      exact: true,
    });
    await expect(author).toHaveAttribute("href", "https://www.paulosalem.com/");
    await expect(author).toHaveAttribute("rel", "noreferrer");
    await page.keyboard.press("Escape");
    await expect(page.locator(".about-atlas")).not.toBeVisible();
  }
});

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/pages",
  workers: 1,
  globalSetup: "./scripts/helpers/browser-setup.mjs",
  maxFailures: process.env.CI ? 1 : 0,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  outputDir: "test-results/pages",
  use: {
    baseURL: "http://127.0.0.1:4196/diorama-atlas/",
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
    reducedMotion: "reduce",
    channel: "chromium",
    launchOptions: {
      args:
        process.platform === "darwin"
          ? ["--use-angle=metal"]
          : ["--enable-unsafe-swiftshader"],
    },
    screenshot: "only-on-failure",
    trace: { mode: "retain-on-failure", screenshots: false },
  },
  webServer: {
    command: "npm run build:pages && npm run preview:pages",
    url: "http://127.0.0.1:4196/diorama-atlas/",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

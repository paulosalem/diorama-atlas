import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  globalSetup: "./scripts/helpers/browser-setup.mjs",
  maxFailures: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 30_000 },
  outputDir: "test-results/browser",
  use: {
    baseURL: "http://127.0.0.1:4194",
    trace: { mode: "retain-on-failure", screenshots: false },
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        launchOptions: {
          args:
            process.platform === "darwin"
              ? ["--use-angle=metal"]
              : ["--enable-unsafe-swiftshader"],
        },
      },
    },
  ],
  webServer: {
    command: "node src/server/index.mjs",
    url: "http://127.0.0.1:4194",
    reuseExistingServer: false,
    env: {
      PORT: "4194",
      OPENAI_API_KEY: "",
      ATLAS_CACHE_DIR: "test-results/server-cache",
    },
  },
});

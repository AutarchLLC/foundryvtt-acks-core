import { defineConfig, devices } from "@playwright/test";
import { ROOT, resolveFoundryEnv } from "./scripts/foundry-env.mjs";

const env = resolveFoundryEnv();

export default defineConfig({
  testDir: "./tests",
  outputDir: "../test-results",
  // All tests share one world and one GM login, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { outputFolder: "../playwright-report", open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    channel: env.browserChannel || undefined,
    baseURL: env.baseURL,
    // Foundry refuses to run below 1024x768.
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node e2e/scripts/start-foundry.mjs",
    cwd: ROOT,
    url: `${env.baseURL}/join`,
    // Reuse a server started with `npm run foundry:test`, so you can watch the world while tests run.
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});

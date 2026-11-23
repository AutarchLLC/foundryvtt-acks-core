/* global game */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { ROOT, TEST_USER } from "../scripts/foundry-env.mjs";
import { joinWorld } from "./foundry.mjs";

/**
 * Stop the run before any test when the test server failed to open one of the system's compendiums.
 * Foundry only logs a failed pack and leaves it out of `game.packs`, so every test that reads it would
 * fail later with an unrelated error. The usual cause is another Foundry instance with the system
 * linked to this checkout: it holds the LevelDB lock on `src/packs/`.
 * @param {import("@playwright/test").FullConfig} config
 */
export default async function globalSetup(config) {
  const { baseURL, viewport, channel } = config.projects[0].use;
  const system = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "system.json"), "utf8"));
  const packIds = system.packs.map((pack) => `${system.id}.${pack.name}`);

  const browser = await chromium.launch({ channel });
  try {
    const page = await browser.newPage({ baseURL, viewport });
    await joinWorld(page, TEST_USER);
    const missing = await page.evaluate((ids) => ids.filter((id) => !game.packs.has(id)), packIds);
    if (missing.length) {
      throw new Error(
        `The test server could not open ${missing.length} of ${packIds.length} compendiums: ${missing.join(", ")}.\n` +
          "Close any other Foundry instance that loads this checkout's src/ (it locks src/packs/), " +
          "then stop the test server if it is still running and start the tests again. " +
          "Foundry's log is in .foundry-test/Logs/.",
      );
    }
  } finally {
    await browser.close();
  }
}

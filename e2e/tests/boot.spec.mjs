/* global CONFIG, foundry, game */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../scripts/foundry-env.mjs";
import { expect, test } from "../support/foundry.mjs";

const migrationSource = fs.readFileSync(path.join(ROOT, "src/module/migration/schema-version.mjs"), "utf8");
const CURRENT_SCHEMA_VERSION = Number(/CURRENT_SCHEMA_VERSION = (\d+)/.exec(migrationSource)[1]);

test("the ACKS system boots into the test world", async ({ page }) => {
  const state = await page.evaluate(() => ({
    system: game.system.id,
    isGM: game.user.isGM,
    schemaVersion: game.settings.get("acks", "systemSchemaVersion"),
    hasConfig: !!CONFIG.ACKS,
  }));

  expect(state).toEqual({ system: "acks", isGM: true, schemaVersion: CURRENT_SCHEMA_VERSION, hasConfig: true });
});

test("no onboarding tour starts for the test user", async ({ page }) => {
  const state = await page.evaluate(() => ({
    active: foundry.nue.Tour.activeTour?.key ?? null,
    pending: game.tours.contents.filter((t) => t.status !== foundry.nue.Tour.STATUS.COMPLETED).map((t) => t.key),
  }));

  expect(state).toEqual({ active: null, pending: [] });
});

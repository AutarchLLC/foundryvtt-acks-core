/* global game */
import { createActor, expect, openActorSheet, openActorSheetTab, test } from "../support/foundry.mjs";
import { readStored, reloadWorld } from "../support/stored-data.mjs";

for (const type of ["character", "monster"]) {
  test.describe(`${type} primary characteristics`, () => {
    test("a new actor is Man-Sized and weighs 15 stone", async ({ page }) => {
      const actorId = await createActor(page, { name: `New ${type}`, type });

      const stored = await readStored(page, "Actor", actorId);
      expect(stored.system.size).toBe("manSized");
      expect(stored.system.bodyWeight6).toBe(90);
    });

    test("the tab comes second and holds Creature Types, Size and Body Weight", async ({ page }) => {
      const actorId = await createActor(page, { name: `Tabbed ${type}`, type });
      const sheet = await openActorSheet(page, actorId);

      const tabIds = await sheet.locator("nav.tabs [data-tab]").evaluateAll((tabs) => tabs.map((t) => t.dataset.tab));
      expect(tabIds.slice(0, 2)).toEqual(["attributes", "primaryCharacteristics"]);
      await expect(sheet.locator('nav [data-tab="primaryCharacteristics"]')).toHaveText(/Primary Characteristics/);

      // Creature Types left the header.
      await expect(sheet.locator(".sheet-header .creature-types")).toHaveCount(0);

      const tab = await openActorSheetTab(page, actorId, "primaryCharacteristics");
      const rows = tab.locator(".primary-characteristics > *");
      await expect(rows.nth(0)).toHaveClass(/creature-types/);
      await expect(rows.nth(1)).toContainText("Size");
      await expect(rows.nth(2)).toContainText("Body Weight");
      await expect(tab.locator('select[name="system.size"]')).toHaveValue("manSized");
      await expect(tab.locator(".body-weight__stones")).toHaveValue("15");
      await expect(tab.locator(".body-weight__sixths")).toHaveValue("0");
    });

    test("Size and Body Weight are saved inline and shown again after reopening", async ({ page }) => {
      const actorId = await createActor(page, { name: `Weighed ${type}`, type });
      let tab = await openActorSheetTab(page, actorId, "primaryCharacteristics");

      await tab.locator('select[name="system.size"]').selectOption("huge");
      await expect.poll(() => page.evaluate((id) => game.actors.get(id).system.size, actorId)).toBe("huge");

      await tab.locator(".body-weight__stones").fill("0");
      await tab.locator(".body-weight__stones").press("Tab");
      await expect.poll(() => page.evaluate((id) => game.actors.get(id).system.bodyWeight6, actorId)).toBe(0);
      await tab.locator(".body-weight__sixths").selectOption("3");
      await expect.poll(() => page.evaluate((id) => game.actors.get(id).system.bodyWeight6, actorId)).toBe(3);

      await page.evaluate((id) => game.actors.get(id).sheet.close(), actorId);
      await reloadWorld(page);
      const stored = await readStored(page, "Actor", actorId);
      expect(stored.system.size).toBe("huge");
      expect(stored.system.bodyWeight6).toBe(3);

      tab = await openActorSheetTab(page, actorId, "primaryCharacteristics");
      await expect(tab.locator('select[name="system.size"]')).toHaveValue("huge");
      await expect(tab.locator(".body-weight__stones")).toHaveValue("0");
      await expect(tab.locator(".body-weight__sixths")).toHaveValue("3");
    });

    test("Body Weight rejects negative and fractional values", async ({ page }) => {
      const actorId = await createActor(page, { name: `Invalid ${type}`, type });

      const result = await page.evaluate(async (id) => {
        const actor = game.actors.get(id);
        const field = actor.system.schema.fields.bodyWeight6;
        // The field's validator rejects them outright.
        const errors = [-1, 2.5].map((value) => !!field.validate(value));
        // An update is cleaned before validation, so it is clamped / rounded instead of failing.
        const stored = [];
        for (const value of [-1, 2.5]) {
          await actor.update({ "system.bodyWeight6": value }).catch(() => null);
          stored.push(actor.system.bodyWeight6);
        }
        return { errors, stored };
      }, actorId);

      expect(result.errors).toEqual([true, true]);
      expect(result.stored).toEqual([0, 3]);
    });
  });
}

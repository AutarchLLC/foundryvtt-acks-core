/* global game */
import { createActor, dialog, expect, latestChatMessage, openActorSheet, test } from "../support/foundry.mjs";

test.describe("character sheet", () => {
  test("opens and switches tabs", async ({ page }) => {
    const actorId = await createActor(page, { name: "Sheet Fighter", type: "character" });
    const sheet = await openActorSheet(page, actorId);

    await expect(sheet.locator(".window-title")).toContainText("Sheet Fighter");
    await expect(sheet.locator('.tab[data-tab="attributes"]')).toHaveClass(/active/);

    await sheet.locator('nav [data-tab="inventory"]').click();
    await expect(sheet.locator('.tab[data-tab="inventory"]')).toHaveClass(/active/);
    await expect(sheet.locator('.tab[data-tab="attributes"]')).not.toHaveClass(/active/);
  });

  test("the Heroic Fate setting controls the Fate points field", async ({ page }) => {
    const actorId = await createActor(page, { name: "Fated Fighter", type: "character" });
    const fatePoints = (sheet) => sheet.locator('[name="system.details.fatepoints"]');

    try {
      let sheet = await openActorSheet(page, actorId);
      await expect(fatePoints(sheet)).toBeVisible();

      await page.evaluate(() => game.settings.set("acks", "heroicFate", false));
      sheet = await openActorSheet(page, actorId);
      await expect(fatePoints(sheet)).toHaveCount(0);
    } finally {
      await page.evaluate(() => game.settings.set("acks", "heroicFate", true));
    }
  });

  test("rolling a save from the sheet posts a result card to chat", async ({ page }) => {
    const actorId = await createActor(page, { name: "Saving Fighter", type: "character" });
    const sheet = await openActorSheet(page, actorId);
    const messagesBefore = await page.evaluate(() => game.messages.size);

    await sheet.locator('[data-action="rollSave"][data-save="paralysis"]').click();
    const rollDialog = dialog(page, "Paralysis Save");
    await rollDialog.locator('button[data-action="ok"]').click();
    await expect(rollDialog).toBeHidden();

    await expect.poll(() => page.evaluate(() => game.messages.size)).toBe(messagesBefore + 1);
    const card = await latestChatMessage(page);
    await expect(card).toContainText("Saving Fighter");
    await expect(card).toContainText("Paralysis Save");
    await expect(card.locator(".roll-result")).toHaveText(/^\s*(Success|Failure)\s+\(\d+\)\s*$/);
  });

  test("changing an ability score updates its modifier", async ({ page }) => {
    const actorId = await createActor(page, { name: "Strong Fighter", type: "character" });

    const result = await page.evaluate(async (id) => {
      const actor = game.actors.get(id);
      const wasNew = actor.system.isNew;
      await actor.update({ "system.scores.str.value": 18 });
      const high = actor.system.scores.str.mod;
      // Changing scores clears `isNew` within the same update (AcksActor#_preUpdate).
      const isNew = actor.system.isNew;
      await actor.update({ "system.scores.str.value": 3 });
      return { wasNew, high, isNew, low: actor.system.scores.str.mod };
    }, actorId);

    expect(result).toEqual({ wasNew: true, high: 3, isNew: false, low: -3 });
  });

  test("an update that resubmits unchanged scores keeps the actor new", async ({ page }) => {
    const actorId = await createActor(page, { name: "Renamed Fighter", type: "character" });

    // Sheets submit every field, scores included, when any one of them changes.
    const isNew = await page.evaluate(async (id) => {
      const actor = game.actors.get(id);
      await actor.update({ name: "Renamed Fighter II", "system.scores": actor.system.toObject().scores });
      return actor.system.isNew;
    }, actorId);

    expect(isNew).toBe(true);
  });
});

test.describe("henchmen", () => {
  /** Create a manager and a henchman (both linked characters) and hire the henchman. */
  async function hireHenchman(page) {
    const managerId = await createActor(page, { name: "Manager", type: "character" });
    const henchmanId = await createActor(page, { name: "Henchman", type: "character" });
    await page.evaluate(
      async ({ managerId, henchmanId }) => {
        await game.actors.get(managerId).update({ "prototypeToken.actorLink": true });
        await game.actors.get(henchmanId).update({ "system.retainer.enabled": true, "prototypeToken.actorLink": true });
        await game.actors.get(managerId).addHenchman(henchmanId);
      },
      { managerId, henchmanId },
    );
    return { managerId, henchmanId };
  }

  const henchmenOf = (page, managerId) => page.evaluate((id) => game.actors.get(id).system.henchmenList, managerId);
  const managerOf = (page, henchmanId) =>
    page.evaluate((id) => game.actors.get(id).system.retainer.managerid, henchmanId);

  test("disabling the retainer flag releases the henchman", async ({ page }) => {
    const { managerId, henchmanId } = await hireHenchman(page);
    expect(await henchmenOf(page, managerId)).toEqual([henchmanId]);
    expect(await managerOf(page, henchmanId)).toBe(managerId);

    await page.evaluate((id) => game.actors.get(id).update({ "system.retainer.enabled": false }), henchmanId);

    // The manager is updated after the henchman's own update completes.
    await expect.poll(() => henchmenOf(page, managerId)).toEqual([]);
    await expect.poll(() => managerOf(page, henchmanId)).toBe("");
  });

  test("deleting a henchman removes it from its manager", async ({ page }) => {
    const { managerId, henchmanId } = await hireHenchman(page);

    await page.evaluate((id) => game.actors.get(id).delete(), henchmanId);

    await expect.poll(() => henchmenOf(page, managerId)).toEqual([]);
  });

  test("disabling the retainer flag after the manager was deleted", async ({ page }) => {
    const { managerId, henchmanId } = await hireHenchman(page);
    // Leaves the henchman with a dangling managerid.
    await page.evaluate((id) => game.actors.get(id).delete(), managerId);

    await page.evaluate((id) => game.actors.get(id).update({ "system.retainer.enabled": false }), henchmanId);

    // The fixture fails the test on any uncaught exception. Outlast the 200 ms that henchman cleanup
    // used to be deferred by, so an error from deferred work still lands inside this test.
    await page.waitForTimeout(500);
    expect(await page.evaluate((id) => game.actors.get(id).system.retainer.enabled, henchmanId)).toBe(false);
  });
});

test.describe("monster sheet", () => {
  test("opens for a new monster", async ({ page }) => {
    const actorId = await createActor(page, { name: "Test Goblin", type: "monster" });
    const sheet = await openActorSheet(page, actorId);

    await expect(sheet.locator(".window-title")).toContainText("Test Goblin");
  });
});

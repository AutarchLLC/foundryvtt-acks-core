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

    const mods = await page.evaluate(async (id) => {
      const actor = game.actors.get(id);
      await actor.update({ "system.scores.str.value": 18 });
      const high = actor.system.scores.str.mod;
      await actor.update({ "system.scores.str.value": 3 });
      return { high, low: actor.system.scores.str.mod };
    }, actorId);

    expect(mods).toEqual({ high: 3, low: -3 });
    // Changing scores clears `isNew` from a deferred update (AcksActor#_onUpdate). Let it land
    // before the next test deletes the actor.
    await expect.poll(() => page.evaluate((id) => game.actors.get(id).system.isNew, actorId)).toBe(false);
  });
});

test.describe("monster sheet", () => {
  test("opens for a new monster", async ({ page }) => {
    const actorId = await createActor(page, { name: "Test Goblin", type: "monster" });
    const sheet = await openActorSheet(page, actorId);

    await expect(sheet.locator(".window-title")).toContainText("Test Goblin");
  });
});

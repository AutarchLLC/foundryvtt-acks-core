/* global game */
import { createActor, dialog, expect, openActorSheet, test } from "../support/foundry.mjs";
import { readStored, reloadWorld } from "../support/stored-data.mjs";

/**
 * Fill and confirm the Creature Type dialog.
 * @param {import("@playwright/test").Page} page
 * @param {string} title  Dialog title
 * @param {{type?: string, subtype?: string}} entry
 */
async function submitCreatureType(page, title, { type, subtype }) {
  const typeDialog = dialog(page, title);
  if (type) await typeDialog.locator('select[name="type"]').selectOption(type);
  if (subtype !== undefined) await typeDialog.locator('input[name="subtype"]').fill(subtype);
  await typeDialog.locator('button[data-action="ok"]').click();
  await expect(typeDialog).toBeHidden();
}

test.describe("creature types", () => {
  test("a monster's Creature Types are added, edited and removed on the sheet and stored", async ({ page }) => {
    const actorId = await createActor(page, { name: "Typed Monster", type: "monster" });
    let sheet = await openActorSheet(page, actorId);
    const chips = (s) => s.locator(".creature-types .creature-type");

    await expect(sheet.locator(".creature-types__empty")).toBeVisible();

    await sheet.locator('[data-action="addCreatureType"]').click();
    await submitCreatureType(page, "Add Creature Type", { type: "monstrosity", subtype: "  bestial " });
    await sheet.locator('[data-action="addCreatureType"]').click();
    // Types the monster already has are not offered again.
    await expect(
      dialog(page, "Add Creature Type").locator('select[name="type"] option[value="monstrosity"]'),
    ).toHaveCount(0);
    await submitCreatureType(page, "Add Creature Type", { type: "animal" });

    await expect(chips(sheet)).toHaveText(["Monstrosity (bestial)", "Animal"]);

    await reloadWorld(page);
    const stored = await readStored(page, "Actor", actorId);
    expect(stored.system.creatureTypes).toEqual([
      { type: "monstrosity", subtype: "bestial" },
      { type: "animal", subtype: "" },
    ]);

    // Edit keeps the entry's place and the subtype's case.
    sheet = await openActorSheet(page, actorId);
    await chips(sheet).nth(1).locator('[data-action="editCreatureType"]').click();
    await submitCreatureType(page, "Edit Creature Type", { type: "incarnation", subtype: "Demon" });
    await expect(chips(sheet)).toHaveText(["Monstrosity (bestial)", "Incarnation (Demon)"]);

    await chips(sheet).first().locator('[data-action="deleteCreatureType"]').click();
    await expect(chips(sheet)).toHaveText(["Incarnation (Demon)"]);

    const afterEdit = await readStored(page, "Actor", actorId);
    expect(afterEdit.system.creatureTypes).toEqual([{ type: "incarnation", subtype: "Demon" }]);
  });

  test("a monster cannot have the same Creature Type twice", async ({ page }) => {
    const actorId = await createActor(page, { name: "Doubled Monster", type: "monster" });

    // Foundry rejects the invalid update (it may or may not throw); either way nothing is stored.
    const types = await page.evaluate(async (id) => {
      const actor = game.actors.get(id);
      await actor
        .update({
          "system.creatureTypes": [
            { type: "animal", subtype: "wild" },
            { type: "animal", subtype: "domestic" },
          ],
        })
        .catch(() => null);
      return actor.system.creatureTypes;
    }, actorId);

    expect(types).toEqual([]);
  });

  test("a character is always Humanoid, read-only and not stored", async ({ page }) => {
    const actorId = await createActor(page, { name: "Typed Fighter", type: "character" });

    const creatureTypes = await page.evaluate((id) => game.actors.get(id).system.creatureTypes, actorId);
    expect(creatureTypes).toEqual([{ type: "humanoid", subtype: "" }]);

    const stored = await readStored(page, "Actor", actorId);
    expect(stored.system).not.toHaveProperty("creatureTypes");

    const sheet = await openActorSheet(page, actorId);
    await expect(sheet.locator(".creature-types .creature-type")).toHaveText(["Humanoid"]);
    await expect(sheet.locator('[data-action="addCreatureType"]')).toHaveCount(0);
    await expect(sheet.locator('[data-action="deleteCreatureType"]')).toHaveCount(0);
  });
});

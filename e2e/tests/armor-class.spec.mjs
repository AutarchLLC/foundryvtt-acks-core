/* global game */
import { createActor, expect, test } from "../support/foundry.mjs";

/**
 * Create a character with DEX 16 (+2 modifier) and no other Armor Class modifier.
 * @param {import("@playwright/test").Page} page
 * @param {string} name
 * @returns {Promise<string>}
 */
async function createDexterousCharacter(page, name) {
  // AcksActor.create drops system creation data, so DEX is set by an update.
  const actorId = await createActor(page, { name, type: "character" });
  await page.evaluate((id) => game.actors.get(id).update({ "system.scores.dex.value": 16 }), actorId);
  return actorId;
}

/**
 * Give a character equipped copies of Equipment compendium entries, in the given order,
 * and read its Armor Class.
 * @param {import("@playwright/test").Page} page
 * @param {string} actorId
 * @param {string[]} itemNames  names of entries in the Equipment compendium
 * @returns {Promise<{value: number, shield: number}>}
 */
function equipFromCompendium(page, actorId, itemNames) {
  return page.evaluate(
    async ({ id, names }) => {
      const pack = game.packs.get("acks.acks-all-equipment");
      const index = await pack.getIndex();
      const items = [];
      for (const name of names) {
        const data = (await pack.getDocument(index.getName(name)._id)).toObject();
        data.system.equipped = true;
        items.push(data);
      }
      const actor = game.actors.get(id);
      await actor.createEmbeddedDocuments("Item", items);
      return { value: actor.system.ac.value, shield: actor.system.ac.shield };
    },
    { id: actorId, names: itemNames },
  );
}

test.describe("armor class", () => {
  // Lamellar Armor AC 5, Leather Armor AC 2, Shield (Metal) AC 1, Heavy Helmet has no AC value.

  test("equipping a Heavy Helmet keeps the AC of armor and shield, in any item order", async ({ page }) => {
    const helmetLast = await createDexterousCharacter(page, "Helmet Last");
    const helmetFirst = await createDexterousCharacter(page, "Helmet First");

    const last = await equipFromCompendium(page, helmetLast, ["Lamellar Armor", "Shield (Metal)", "Heavy Helmet"]);
    const first = await equipFromCompendium(page, helmetFirst, ["Heavy Helmet", "Lamellar Armor", "Shield (Metal)"]);

    expect(last).toEqual({ value: 8, shield: 1 });
    expect(first).toEqual({ value: 8, shield: 1 });
  });

  test("the AC of every equipped armor is added together", async ({ page }) => {
    const actorId = await createDexterousCharacter(page, "Layered Fighter");

    const ac = await equipFromCompendium(page, actorId, ["Leather Armor", "Lamellar Armor"]);

    expect(ac).toEqual({ value: 9, shield: 0 });
  });

  test("equipped armor with an AC of 0 or none adds nothing", async ({ page }) => {
    const actorId = await createDexterousCharacter(page, "Bare Fighter");

    const ac = await page.evaluate(async (id) => {
      const actor = game.actors.get(id);
      await actor.createEmbeddedDocuments("Item", [
        { name: "Zero Armor", type: "armor", system: { type: "light", equipped: true, ac: { value: 0 } } },
        { name: "Blank Armor", type: "armor", system: { type: "light", equipped: true, ac: { value: null } } },
        { name: "Blank Shield", type: "armor", system: { type: "shield", equipped: true, ac: { value: null } } },
      ]);
      return { value: actor.system.ac.value, shield: actor.system.ac.shield };
    }, actorId);

    expect(ac).toEqual({ value: 2, shield: 0 });
  });

  test("unequipping everything leaves DEX and the AC modifier", async ({ page }) => {
    const actorId = await createDexterousCharacter(page, "Unarmored Fighter");
    await equipFromCompendium(page, actorId, ["Lamellar Armor", "Shield (Metal)", "Heavy Helmet"]);

    const ac = await page.evaluate(async (id) => {
      const actor = game.actors.get(id);
      await actor.update({ "system.ac.mod": 1 });
      const updates = actor.items.map((item) => ({ _id: item.id, "system.equipped": false }));
      await actor.updateEmbeddedDocuments("Item", updates);
      return { value: actor.system.ac.value, shield: actor.system.ac.shield };
    }, actorId);

    expect(ac).toEqual({ value: 3, shield: 0 });
  });
});

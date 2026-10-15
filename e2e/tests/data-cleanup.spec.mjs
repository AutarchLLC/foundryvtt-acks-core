/* global Actor, Item, foundry */
import { expect, test } from "../support/foundry.mjs";

/** Legacy (schema v4) generic item data with the fields removed in schema v5. */
const LEGACY_ITEM = {
  _schemaVersion: 4,
  quantity: { value: 3, max: 5 },
  treasure: true,
  iconsource: "https://game-icons.net/1x1/lorc/padlock.html",
  iconlicense: "http://creativecommons.org/licenses/by/3.0/",
};

test.describe("item data cleanup", () => {
  test("the data cleanup migration deletes the unused item fields", async ({ page }) => {
    const result = await page.evaluate(async (system) => {
      const { Migration5DataCleanup } = await import("/systems/acks/module/migration/migrations/index.mjs");
      const source = { type: "item", system: foundry.utils.deepClone(system) };
      await new Migration5DataCleanup().updateItem(source, null);
      const { ForcedDeletion } = foundry.data.operators;
      return {
        quantityValue: source.system.quantity.value,
        quantityMax: source.system.quantity.max instanceof ForcedDeletion,
        treasure: source.system.treasure instanceof ForcedDeletion,
        iconsource: source.system.iconsource instanceof ForcedDeletion,
        iconlicense: source.system.iconlicense instanceof ForcedDeletion,
      };
    }, LEGACY_ITEM);

    expect(result).toEqual({
      quantityValue: 3,
      quantityMax: true,
      treasure: true,
      iconsource: true,
      iconlicense: true,
    });
  });

  test("legacy item data loads without the removed fields", async ({ page }) => {
    const system = await page.evaluate(async (system) => {
      const item = await Item.implementation.create({ name: "Old Lock", type: "item", system });
      return item.system.toObject();
    }, LEGACY_ITEM);

    expect(system.quantity).toEqual({ value: 3 });
    expect(system).not.toHaveProperty("treasure");
    expect(system).not.toHaveProperty("iconsource");
    expect(system).not.toHaveProperty("iconlicense");
  });
});

/** Legacy (schema v4) armor data with the ascending AC stored as `aac`. */
const LEGACY_ARMOR = { _schemaVersion: 4, aac: { value: 4 }, type: "heavy", equipped: true };

test.describe("armor aac to ac", () => {
  test("the data cleanup migration moves aac to ac", async ({ page }) => {
    const result = await page.evaluate(async (system) => {
      const { Migration5DataCleanup } = await import("/systems/acks/module/migration/migrations/index.mjs");
      const source = { type: "armor", system: foundry.utils.deepClone(system) };
      await new Migration5DataCleanup().updateItem(source, null);
      return {
        ac: source.system.ac,
        aacDeleted: source.system.aac instanceof foundry.data.operators.ForcedDeletion,
      };
    }, LEGACY_ARMOR);

    expect(result).toEqual({ ac: { value: 4 }, aacDeleted: true });
  });

  test("legacy armor data loads as ac and counts toward the wearer's AC", async ({ page }) => {
    const result = await page.evaluate(async (system) => {
      const actor = await Actor.implementation.create({
        name: "Old Armor Fighter",
        type: "character",
        items: [{ name: "Old Plate", type: "armor", system }],
      });
      const armor = actor.items.getName("Old Plate");
      return {
        armor: armor.system.toObject(),
        actorAc: actor.system.aac.value,
        dexMod: actor.system.scores.dex.mod,
        acMod: actor.system.aac.mod,
      };
    }, LEGACY_ARMOR);

    expect(result.armor.ac).toEqual({ value: 4 });
    expect(result.armor).not.toHaveProperty("aac");
    expect(result.actorAc).toBe(4 + result.dexMod + result.acMod);
  });
});

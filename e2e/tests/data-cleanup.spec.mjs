/* global Item, foundry */
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

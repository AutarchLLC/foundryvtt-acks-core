/* global Item, foundry */
import { expect, test } from "../support/foundry.mjs";

/** Legacy (schema v3) weapon data whose tags name damage types and extraordinary damage. */
const LEGACY_WEAPON = {
  _schemaVersion: 3,
  damage: "1d8",
  tags: [
    { title: "Slashing", value: "Slashing" },
    { title: "Fire", value: "Fire" },
    { title: "Magic", value: "Magic" },
  ],
};

test.describe("legacy weapon tags", () => {
  test("damage type and extraordinary tags move to the base damage when loaded", async ({ page }) => {
    const result = await page.evaluate(async (system) => {
      const weapon = await Item.implementation.create({ name: "Old Flame Sword", type: "weapon", system });
      const { base } = weapon.system.damage;
      return {
        formula: base.formula,
        types: Array.from(base.types).sort(),
        extraordinary: base.extraordinary,
        customTags: Array.from(weapon.system.customTags).sort(),
      };
    }, LEGACY_WEAPON);

    expect(result).toEqual({
      formula: "1d8",
      types: ["fire", "slashing"],
      extraordinary: true,
      customTags: ["Fire", "Magic", "Slashing"],
    });
  });

  test("the weapons migration writes them to the base damage", async ({ page }) => {
    const damage = await page.evaluate(async (system) => {
      const { Migration4WeaponsRework } = await import("/systems/acks/module/migration/migrations/index.mjs");
      const source = { type: "weapon", system: foundry.utils.deepClone(system) };
      await new Migration4WeaponsRework().updateItem(source, null);
      return foundry.utils.applyDataOperators(source.system).damage;
    }, LEGACY_WEAPON);

    expect(damage).toEqual({
      base: { formula: "1d8", types: ["slashing", "fire"], extraordinary: true },
      alternate: { formula: "", types: [], extraordinary: false },
    });
  });

  test("tags without a damage type leave the base damage types empty", async ({ page }) => {
    const damage = await page.evaluate(async () => {
      const { Migration4WeaponsRework } = await import("/systems/acks/module/migration/migrations/index.mjs");
      const source = { type: "weapon", system: { damage: "1d6", tags: [{ title: "Melee", value: "Melee" }] } };
      await new Migration4WeaponsRework().updateItem(source, null);
      return source.system.damage;
    });

    expect(damage).toEqual({
      base: { formula: "1d6", types: [], extraordinary: false },
      alternate: { formula: "", types: [], extraordinary: false },
    });
  });
});

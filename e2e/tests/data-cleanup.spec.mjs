/* global Actor, Item, foundry, game */
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
        actorAc: actor.system.ac.value,
        dexMod: actor.system.scores.dex.mod,
        acMod: actor.system.ac.mod,
      };
    }, LEGACY_ARMOR);

    expect(result.armor.ac).toEqual({ value: 4 });
    expect(result.armor).not.toHaveProperty("aac");
    expect(result.actorAc).toBe(4 + result.dexMod + result.acMod);
  });
});

/** Legacy (schema v4) actor attack data stored as `thac0`. */
const LEGACY_THAC0 = { value: 19, bba: 3, throw: 7, mod: { melee: 2, missile: 1 } };

/** The same data as `attack`, without the unused `value` and `bba`. */
const ATTACK = { throw: 7, mod: { melee: 2, missile: 1 } };

test.describe("actor thac0 to attack", () => {
  test("the data cleanup migration moves thac0 to attack", async ({ page }) => {
    const result = await page.evaluate(async (thac0) => {
      const { Migration5DataCleanup } = await import("/systems/acks/module/migration/migrations/index.mjs");
      const source = { type: "character", system: { _schemaVersion: 4, thac0: foundry.utils.deepClone(thac0) } };
      await new Migration5DataCleanup().updateActor(source);
      return {
        attack: source.system.attack,
        thac0Deleted: source.system.thac0 instanceof foundry.data.operators.ForcedDeletion,
      };
    }, LEGACY_THAC0);

    expect(result).toEqual({ attack: ATTACK, thac0Deleted: true });
  });

  for (const type of ["character", "monster"]) {
    test(`legacy ${type} data loads thac0 as attack`, async ({ page }) => {
      const system = await page.evaluate(
        async ({ type, thac0 }) => {
          const actor = await Actor.implementation.create({
            name: `Old ${type}`,
            type,
            system: { _schemaVersion: 4, thac0 },
            // AcksActor.create replaces the system data of item-less actors with new actor defaults
            items: [],
          });
          return actor.system.toObject();
        },
        { type, thac0: LEGACY_THAC0 },
      );

      expect(system.attack).toEqual(ATTACK);
      expect(system).not.toHaveProperty("thac0");
    });
  }
});

/** Legacy (schema v4) actor AC data stored as `aac`. */
const LEGACY_AAC = { value: 5, mod: 1 };

test.describe("actor aac to ac", () => {
  test("the data cleanup migration moves aac to ac", async ({ page }) => {
    const result = await page.evaluate(async (aac) => {
      const { Migration5DataCleanup } = await import("/systems/acks/module/migration/migrations/index.mjs");
      const source = { type: "monster", system: { _schemaVersion: 4, aac: foundry.utils.deepClone(aac) } };
      await new Migration5DataCleanup().updateActor(source);
      return {
        ac: source.system.ac,
        aacDeleted: source.system.aac instanceof foundry.data.operators.ForcedDeletion,
      };
    }, LEGACY_AAC);

    expect(result).toEqual({ ac: LEGACY_AAC, aacDeleted: true });
  });

  for (const type of ["character", "monster"]) {
    test(`legacy ${type} data loads aac as ac`, async ({ page }) => {
      const system = await page.evaluate(
        async ({ type, aac }) => {
          const actor = await Actor.implementation.create({
            name: `Old ${type}`,
            type,
            system: { _schemaVersion: 4, aac },
            // AcksActor.create replaces the system data of item-less actors with new actor defaults
            items: [],
          });
          return actor.system.toObject();
        },
        { type, aac: LEGACY_AAC },
      );

      expect(system.ac).toEqual(LEGACY_AAC);
      expect(system).not.toHaveProperty("aac");
    });
  }
});

test.describe("actor surprise.mod", () => {
  test("the data cleanup migration deletes surprise.mod", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Migration5DataCleanup } = await import("/systems/acks/module/migration/migrations/index.mjs");
      const surprise = { mod: 1, surpriseothers: -2, avoidsurprise: 1 };
      const source = { type: "monster", system: { _schemaVersion: 4, surprise } };
      await new Migration5DataCleanup().updateActor(source);
      return {
        modDeleted: source.system.surprise.mod instanceof foundry.data.operators.ForcedDeletion,
        surpriseothers: source.system.surprise.surpriseothers,
        avoidsurprise: source.system.surprise.avoidsurprise,
      };
    });

    expect(result).toEqual({ modDeleted: true, surpriseothers: -2, avoidsurprise: 1 });
  });
});

test.describe("character exploration", () => {
  test("the data cleanup migration deletes exploration", async ({ page }) => {
    const deleted = await page.evaluate(async () => {
      const { Migration5DataCleanup } = await import("/systems/acks/module/migration/migrations/index.mjs");
      const exploration = { ld: 18, od: 18, odMod: 14, sd: 18, ft: 18 };
      const source = { type: "character", system: { _schemaVersion: 4, exploration } };
      await new Migration5DataCleanup().updateActor(source);
      return source.system.exploration instanceof foundry.data.operators.ForcedDeletion;
    });

    expect(deleted).toBe(true);
  });
});

test.describe("character scores", () => {
  test("the data cleanup migration deletes the unused score fields", async ({ page }) => {
    const scores = await page.evaluate(async () => {
      const { Migration5DataCleanup } = await import("/systems/acks/module/migration/migrations/index.mjs");
      const score = (value) => ({ value, bonus: 0, mod: 0 });
      const scores = {
        str: score(13),
        int: score(9),
        wis: score(10),
        dex: { ...score(16), init: 2 },
        con: score(12),
        cha: { ...score(8), npc: -1, retain: 3, loyalty: -1 },
      };
      const source = { type: "character", system: { _schemaVersion: 4, scores } };
      await new Migration5DataCleanup().updateActor(source);
      const { ForcedDeletion } = foundry.data.operators;
      return Object.fromEntries(
        Object.entries(source.system.scores).map(([key, fields]) => [
          key,
          Object.fromEntries(
            Object.entries(fields).map(([field, value]) => [
              field,
              value instanceof ForcedDeletion ? "deleted" : value,
            ]),
          ),
        ]),
      );
    });

    const cleaned = (value) => ({ value, bonus: "deleted", mod: "deleted" });
    expect(scores).toEqual({
      str: cleaned(13),
      int: cleaned(9),
      wis: cleaned(10),
      dex: { ...cleaned(16), init: "deleted" },
      con: cleaned(12),
      cha: { ...cleaned(8), npc: "deleted", retain: "deleted", loyalty: "deleted" },
    });
  });

  test("the initiative box shows the rolled initiative bonus", async ({ page }) => {
    const shown = await page.evaluate(async () => {
      const actor = await Actor.implementation.create({ name: "Quick Fighter", type: "character" });
      await actor.update({ "system.scores.dex.value": 16, "system.initiative.mod": 1 });
      await actor.sheet.render({ force: true });
      // the initiative box is the one whose tooltip breaks it down into DEX + modifier
      const value = [...actor.sheet.element.querySelectorAll(".form-fields")]
        .find((el) => el.dataset.tooltip?.startsWith(game.i18n.localize("ACKS.scores.dex.long")))
        ?.querySelector("input")?.value;
      await actor.sheet.close();
      return { value, dexMod: actor.system.scores.dex.mod, initiative: actor.system.initiative.value };
    });

    expect(shown.dexMod).toBe(2);
    expect(shown.initiative).toBe(3);
    expect(shown.value).toBe("3");
  });
});

/* global Actor, CONFIG, Item, game */
import { expect, test } from "../support/foundry.mjs";

/**
 * CURRENT_SCHEMA_VERSION as the running system sees it.
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<number>}
 */
function currentSchemaVersion(page) {
  return page.evaluate(
    async () => (await import("/systems/acks/module/migration/migration.mjs")).CURRENT_SCHEMA_VERSION,
  );
}

test.describe("_schemaVersion on new documents", () => {
  test("new actors of every type get the current version", async ({ page }) => {
    const current = await currentSchemaVersion(page);
    const versions = await page.evaluate(async () => {
      const result = {};
      for (const type of Object.keys(CONFIG.Actor.dataModels)) {
        const actor = await Actor.implementation.create({ name: `New ${type}`, type });
        result[type] = actor._source.system._schemaVersion;
      }
      return result;
    });

    expect(Object.keys(versions).length).toBeGreaterThan(0);
    for (const [type, version] of Object.entries(versions)) {
      expect(version, `actor type "${type}"`).toBe(current);
    }
  });

  test("new world items of every type get the current version", async ({ page }) => {
    const current = await currentSchemaVersion(page);
    const versions = await page.evaluate(async () => {
      const types = Object.keys(CONFIG.Item.dataModels);
      const items = await Item.implementation.createDocuments(types.map((type) => ({ name: `New ${type}`, type })));
      return Object.fromEntries(items.map((item) => [item.type, item._source.system._schemaVersion]));
    });

    expect(Object.keys(versions).length).toBeGreaterThan(0);
    for (const [type, version] of Object.entries(versions)) {
      expect(version, `item type "${type}"`).toBe(current);
    }
  });

  test("items added to an actor, or created inline with it, get the current version", async ({ page }) => {
    const current = await currentSchemaVersion(page);
    const versions = await page.evaluate(async () => {
      const actor = await Actor.implementation.create({
        name: "Inline Fighter",
        type: "character",
        items: [{ name: "Inline Sword", type: "weapon" }],
      });
      const [embedded] = await actor.createEmbeddedDocuments("Item", [{ name: "Added Shield", type: "armor" }]);
      return {
        actor: actor._source.system._schemaVersion,
        inline: actor.items.getName("Inline Sword")._source.system._schemaVersion,
        embedded: embedded._source.system._schemaVersion,
      };
    });

    expect(versions).toEqual({ actor: current, inline: current, embedded: current });
  });

  test("the stamped version is what the server stored", async ({ page }) => {
    const current = await currentSchemaVersion(page);
    const stored = await page.evaluate(async () => {
      const actor = await Actor.implementation.create({ name: "Stored Fighter", type: "character" });
      const [fromServer] = await Actor.implementation.database.get(Actor.implementation, { query: { _id: actor.id } });
      return fromServer._source.system._schemaVersion;
    });

    expect(stored).toBe(current);
  });
});

test.describe("_schemaVersion on documents created from old data", () => {
  test("creation data with an older version keeps it and is still migrated in memory", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const weapon = await Item.implementation.create({
        name: "Old Sword",
        type: "weapon",
        system: { _schemaVersion: 2, damage: "1d8", tags: [{ value: "Melee" }] },
      });
      const duplicate = await Item.implementation.create(weapon.toObject());
      return {
        version: weapon._source.system._schemaVersion,
        duplicateVersion: duplicate._source.system._schemaVersion,
        damage: weapon.system.damage.base.formula,
        melee: weapon.system.melee,
      };
    });

    expect(result).toEqual({ version: 2, duplicateVersion: 2, damage: "1d8", melee: true });
  });

  test("an older embedded item inside a new actor keeps its version", async ({ page }) => {
    const current = await currentSchemaVersion(page);
    const versions = await page.evaluate(async () => {
      const actor = await Actor.implementation.create({
        name: "Old Gear Fighter",
        type: "character",
        items: [{ name: "Old Sword", type: "weapon", system: { _schemaVersion: 2, damage: "1d6" } }],
      });
      const sword = actor.items.getName("Old Sword");
      return { actor: actor._source.system._schemaVersion, item: sword._source.system._schemaVersion };
    });

    expect(versions).toEqual({ actor: current, item: 2 });
  });

  test("a compendium import keeps the pack document's version", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const pack = game.packs.get("acks.acks-all-equipment");
      const index = await pack.getIndex({ fields: ["system._schemaVersion"] });
      const entry = index.find((e) => e.type === "weapon");
      const imported = await game.items.importFromCompendium(pack, entry._id);
      return { packVersion: entry.system._schemaVersion, importedVersion: imported._source.system._schemaVersion };
    });

    expect(result.importedVersion).toBe(result.packVersion);
  });
});

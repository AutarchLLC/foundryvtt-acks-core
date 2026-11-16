/* global foundry, game */
import { expect, test } from "../support/foundry.mjs";

/**
 * These tests seed documents in their stored (raw) form, as an older system version left them in the
 * database. Creating them through the document API would clean them first: migrateData() would convert
 * the legacy fields and the schema would drop them. So they are written straight through the socket,
 * and the page is reloaded to load them like a world that was just updated to this system version.
 */

/** A character as stored before any migration ran (no `_schemaVersion`). */
const LEGACY_CHARACTER = {
  _id: "legacyCharacter1",
  name: "Legacy Fighter",
  type: "character",
  system: {
    aac: { value: 6, mod: 1 },
    thac0: { value: 19, bba: 3, throw: 7, mod: { melee: 2, missile: 1 } },
    saves: {
      paralysis: { value: 11 },
      death: { value: 12 },
      breath: { value: 9 },
      wand: { value: 13 },
      spell: { value: 14 },
    },
    languages: { value: ["Common", "Lost Tongue"] },
  },
  items: [
    { _id: "legacySword00001", name: "Legacy Sword", type: "weapon", system: { damage: "1d8", bonus: 1, weight: 166 } },
  ],
};

/** A monster as stored before any migration ran. */
const LEGACY_MONSTER = {
  _id: "legacyMonster001",
  name: "Legacy Ogre",
  type: "monster",
  system: {
    aac: { value: 4, mod: 0 },
    thac0: { value: 17, bba: 0, throw: 5, mod: { melee: 0, missile: 0 } },
    saves: { breath: { value: 12 }, wand: { value: 14 } },
  },
  items: [{ _id: "legacyClub000001", name: "Club", type: "weapon", system: { damage: "2d4", bonus: 0 } }],
};

/** A world armor item as stored before any migration ran. */
const LEGACY_ARMOR = { _id: "legacyArmor00001", name: "Legacy Plate", type: "armor", system: { aac: { value: 3 } } };

/**
 * Write documents straight to the database, bypassing client-side cleaning and migration.
 * @param {import("@playwright/test").Page} page
 * @param {string} type  Document name
 * @param {object[]} data
 * @param {string} [pack]  Compendium collection id
 */
function storeRaw(page, type, data, pack) {
  return page.evaluate(
    ({ type, data, pack }) =>
      foundry.helpers.SocketInterface.dispatch("modifyDocument", {
        type,
        action: "create",
        operation: { data, keepId: true, ...(pack ? { pack } : {}) },
      }),
    { type, data, pack },
  );
}

/**
 * Read a document's stored data straight from the database.
 * @param {import("@playwright/test").Page} page
 * @param {string} type  Document name
 * @param {string} id
 * @param {string} [pack]  Compendium collection id
 * @returns {Promise<object>}
 */
function readStored(page, type, id, pack) {
  return page.evaluate(
    async ({ type, id, pack }) => {
      const response = await foundry.helpers.SocketInterface.dispatch("modifyDocument", {
        type,
        action: "get",
        operation: { query: { _id: id }, ...(pack ? { pack } : {}) },
      });
      return response.result[0];
    },
    { type, id, pack },
  );
}

/**
 * Reload the page and wait until Foundry is ready and no migration is pending.
 * @param {import("@playwright/test").Page} page
 */
async function reloadWorld(page) {
  await page.reload();
  await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 60_000 });
  const currentVersion = await page.evaluate(
    async () => (await import("/systems/acks/module/migration/schema-version.mjs")).CURRENT_SCHEMA_VERSION,
  );
  // runMigrations() records the version only once the whole migration has finished.
  // The predicate must stay synchronous: a returned Promise counts as truthy.
  await page.waitForFunction(
    (version) => game.settings.get("acks", "systemSchemaVersion") === version,
    currentVersion,
    { timeout: 60_000 },
  );
}

/**
 * Pretend the world was last migrated at the given schema version, then load it, so the migration runs.
 * @param {import("@playwright/test").Page} page
 * @param {number} version
 */
async function migrateWorldFrom(page, version) {
  await page.evaluate((version) => game.settings.set("acks", "systemSchemaVersion", version), version);
  await reloadWorld(page);
}

/**
 * Stamp a raw document and its embedded items with a schema version.
 * @param {object} data
 * @param {number} version
 * @returns {object}
 */
function stamped(data, version) {
  const copy = JSON.parse(JSON.stringify(data));
  copy.system._schemaVersion = version;
  for (const item of copy.items ?? []) {
    item.system._schemaVersion = version;
  }
  return copy;
}

/**
 * The legacy fields of migrations 1–5 that must be gone from the stored data.
 * @param {object} system
 */
function expectNoLegacyActorFields(system) {
  expect(system).not.toHaveProperty("aac");
  expect(system).not.toHaveProperty("thac0");
  expect(system).not.toHaveProperty("languages");
  expect(system.saves).not.toHaveProperty("breath");
  expect(system.saves).not.toHaveProperty("wand");
}

/**
 * Check the stored and loaded data of the migrated legacy character and monster.
 * @param {import("@playwright/test").Page} page
 */
async function expectMigratedActors(page) {
  const character = await readStored(page, "Actor", LEGACY_CHARACTER._id);
  expect(character.system.ac).toEqual({ value: 6, mod: 1 });
  expect(character.system.attack).toEqual({ throw: 7, mod: { melee: 2, missile: 1 } });
  expect(character.system.saves).toMatchObject({
    paralysis: { value: 11 },
    death: { value: 12 },
    blast: { value: 9 },
    implements: { value: 13 },
    spell: { value: 14 },
  });
  expectNoLegacyActorFields(character.system);
  const sword = character.items.find((i) => i._id === "legacySword00001");
  expect(sword.system.damage.base.formula).toBe("1d8");
  expect(sword.system.bonus).toEqual({ attack: 1, damage: 0 });
  expect(sword.system.weight6).toBe(1);
  expect(sword.system).not.toHaveProperty("weight");
  const languages = character.items.filter((i) => i.type === "language").map((i) => i.name);
  expect(languages.sort()).toEqual(["Common", "Lost Tongue"]);

  const monster = await readStored(page, "Actor", LEGACY_MONSTER._id);
  expect(monster.system.ac).toEqual({ value: 4, mod: 0 });
  expect(monster.system.attack.throw).toBe(5);
  expect(monster.system.saves).toMatchObject({ blast: { value: 12 }, implements: { value: 14 } });
  expectNoLegacyActorFields(monster.system);
  expect(monster.items[0].system.damage.base.formula).toBe("2d4");

  // What the sheets show after a reload
  const loaded = await page.evaluate(
    ({ characterId, monsterId }) => {
      const character = game.actors.get(characterId);
      const monster = game.actors.get(monsterId);
      return {
        characterThrow: character.system.attack.throw,
        characterBlast: character.system.saves.blast.value,
        swordDamage: character.items.get("legacySword00001").system.damage.base.formula,
        monsterAc: monster.system.ac.value,
        monsterThrow: monster.system.attack.throw,
        clubDamage: monster.items.get("legacyClub000001").system.damage.base.formula,
      };
    },
    { characterId: LEGACY_CHARACTER._id, monsterId: LEGACY_MONSTER._id },
  );
  expect(loaded).toEqual({
    characterThrow: 7,
    characterBlast: 9,
    swordDamage: "1d8",
    monsterAc: 4,
    monsterThrow: 5,
    clubDamage: "2d4",
  });
}

test.describe("migration runner", () => {
  test("a legacy world keeps its values after migrating and reloading", async ({ page }) => {
    await storeRaw(page, "Actor", [LEGACY_CHARACTER, LEGACY_MONSTER]);
    await storeRaw(page, "Item", [LEGACY_ARMOR]);

    await migrateWorldFrom(page, 0);
    await reloadWorld(page);

    await expectMigratedActors(page);
    const armor = await readStored(page, "Item", LEGACY_ARMOR._id);
    expect(armor.system.ac).toEqual({ value: 3 });
    expect(armor.system).not.toHaveProperty("aac");
  });

  test("a world damaged by the 14.1.0 migration gets its values back", async ({ page }) => {
    // 14.1.0 stamped every document with schema version 5 but wrote nothing else
    await storeRaw(page, "Actor", [stamped(LEGACY_CHARACTER, 5), stamped(LEGACY_MONSTER, 5)]);
    await storeRaw(page, "Item", [stamped(LEGACY_ARMOR, 5)]);

    await migrateWorldFrom(page, 5);
    await reloadWorld(page);

    await expectMigratedActors(page);
    const armor = await readStored(page, "Item", LEGACY_ARMOR._id);
    expect(armor.system.ac).toEqual({ value: 3 });
  });

  test("a value entered after the 14.1.0 migration is kept", async ({ page }) => {
    const edited = stamped(LEGACY_MONSTER, 5);
    edited.system.ac = { value: 2, mod: 0 };
    await storeRaw(page, "Actor", [edited]);

    await migrateWorldFrom(page, 5);

    const monster = await readStored(page, "Actor", LEGACY_MONSTER._id);
    expect(monster.system.ac).toEqual({ value: 2, mod: 0 });
    expect(monster.system).not.toHaveProperty("aac");
    expect(monster.system.attack.throw).toBe(5);
  });

  test("unlinked token deltas and world compendiums are migrated", async ({ page }) => {
    const sceneId = "legacyScene00001";
    const tokenId = "legacyToken00001";
    const packName = "legacy-actors";
    const packId = `world.${packName}`;
    const base = stamped(LEGACY_MONSTER, 5);
    base.system.ac = { value: 4, mod: 0 };
    base.system.attack = { throw: 5, mod: { melee: 0, missile: 0 } };
    base.system.saves = { blast: { value: 12 }, implements: { value: 14 } };
    base.items = [];
    await storeRaw(page, "Actor", [base]);
    await storeRaw(page, "Scene", [
      {
        _id: sceneId,
        name: "Legacy Scene",
        tokens: [
          {
            _id: tokenId,
            name: "Legacy Ogre",
            actorId: base._id,
            actorLink: false,
            delta: {
              system: { aac: { value: 9, mod: 0 }, thac0: { throw: 3 } },
              items: [
                { _id: "legacyDeltaClub1", name: "Big Club", type: "weapon", system: { damage: "1d10", bonus: 2 } },
              ],
            },
          },
        ],
      },
    ]);
    await page.evaluate(
      (name) =>
        foundry.documents.collections.CompendiumCollection.createCompendium({ type: "Actor", label: "Legacy", name }),
      packName,
    );

    try {
      await storeRaw(page, "Actor", [stamped(LEGACY_CHARACTER, 5)], packId);

      await migrateWorldFrom(page, 5);

      const scene = await readStored(page, "Scene", sceneId);
      const delta = scene.tokens.find((t) => t._id === tokenId).delta;
      expect(delta.system.ac).toEqual({ value: 9, mod: 0 });
      expect(delta.system.attack).toEqual({ throw: 3 });
      expect(delta.system).not.toHaveProperty("aac");
      expect(delta.system).not.toHaveProperty("thac0");
      const club = delta.items.find((i) => i._id === "legacyDeltaClub1");
      expect(club.system.damage.base.formula).toBe("1d10");
      expect(club.system.bonus).toEqual({ attack: 2, damage: 0 });

      const packed = await readStored(page, "Actor", LEGACY_CHARACTER._id, packId);
      expect(packed.system.ac).toEqual({ value: 6, mod: 1 });
      expect(packed.system.attack.throw).toBe(7);
      expect(packed.system.saves).toMatchObject({ blast: { value: 9 }, implements: { value: 13 } });
      expectNoLegacyActorFields(packed.system);
    } finally {
      await page.evaluate(
        async ({ sceneId, packId }) => {
          await game.scenes.get(sceneId)?.delete();
          await game.packs.get(packId)?.deleteCompendium();
        },
        { sceneId, packId },
      );
    }
  });
});

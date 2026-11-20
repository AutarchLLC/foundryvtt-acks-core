/* global foundry, game */
import { expect, test } from "../support/foundry.mjs";
import { migrateWorldFrom, readStored, storeRaw } from "../support/stored-data.mjs";

/**
 * Stored data of an actor saved before schema 9, when the new-actor marker lived in `system.isNew`.
 * @param {string} _id
 * @param {string} type  Actor type
 * @param {boolean} [isNew]  Stored `system.isNew`; left out when undefined
 * @returns {object}
 */
function legacyActor(_id, type, isNew) {
  const system = { _schemaVersion: 8 };
  if (isNew !== undefined) system.isNew = isNew;
  return { _id, name: `Legacy ${_id}`, type, system, items: [] };
}

/**
 * Stored data of an unlinked token whose delta overrides the legacy `system.isNew`.
 * @param {string} _id
 * @param {string} actorId  Base actor
 * @param {boolean} isNew  Stored `delta.system.isNew`
 * @returns {object}
 */
function legacyToken(_id, actorId, isNew) {
  return { _id, name: `Legacy ${_id}`, actorId, actorLink: false, delta: { system: { _schemaVersion: 8, isNew } } };
}

test.describe("new actor marker migration", () => {
  test("a stored system.isNew moves to the isNew flag in world actors, after migrating and reloading", async ({
    page,
  }) => {
    const actors = [
      legacyActor("newCharacter0001", "character", true),
      legacyActor("newMonster000001", "monster", true),
      legacyActor("oldCharacter0001", "character", false),
      legacyActor("bareCharacter001", "character"),
    ];
    const ids = actors.map((actor) => actor._id);
    await storeRaw(page, "Actor", actors);

    await migrateWorldFrom(page, 8);

    const stored = Object.fromEntries(
      await Promise.all(
        ids.map(async (id) => {
          const actor = await readStored(page, "Actor", id);
          return [id, { flag: actor.flags?.acks?.isNew, hasSystemIsNew: "isNew" in actor.system }];
        }),
      ),
    );
    expect(stored).toEqual({
      newCharacter0001: { flag: true, hasSystemIsNew: false },
      newMonster000001: { flag: true, hasSystemIsNew: false },
      oldCharacter0001: { flag: false, hasSystemIsNew: false },
      bareCharacter001: { flag: undefined, hasSystemIsNew: false },
    });

    const loaded = await page.evaluate((ids) => ids.map((id) => game.actors.get(id).isNew()), ids);
    expect(loaded).toEqual([true, true, false, false]);
  });

  test("a stored system.isNew moves to the isNew flag in unlinked token deltas and world compendiums", async ({
    page,
  }) => {
    const sceneId = "isNewScene000001";
    const packName = "legacy-new-actors";
    const packId = `world.${packName}`;
    const oldBase = legacyActor("isNewOldBase0001", "monster", false);
    const newBase = legacyActor("isNewNewBase0001", "monster", true);
    // A delta overrides its base actor either way: new over an old base, not new over a new one.
    const tokens = [
      legacyToken("isNewToken000001", oldBase._id, true),
      legacyToken("isNewToken000002", newBase._id, false),
    ];
    await storeRaw(page, "Actor", [oldBase, newBase]);
    await storeRaw(page, "Scene", [{ _id: sceneId, name: "Legacy Scene", tokens }]);
    await page.evaluate(
      (name) =>
        foundry.documents.collections.CompendiumCollection.createCompendium({ type: "Actor", label: "Legacy", name }),
      packName,
    );

    try {
      await storeRaw(page, "Actor", [legacyActor("packedNewActor01", "character", true)], packId);

      await migrateWorldFrom(page, 8);

      const scene = await readStored(page, "Scene", sceneId);
      const deltas = tokens.map((token) => scene.tokens.find((t) => t._id === token._id).delta);
      expect(deltas.map((delta) => delta.flags?.acks?.isNew)).toEqual([true, false]);
      for (const delta of deltas) expect(delta.system).not.toHaveProperty("isNew");
      const tokensNew = await page.evaluate(
        ({ sceneId, tokenIds }) => tokenIds.map((id) => game.scenes.get(sceneId).tokens.get(id).actor.isNew()),
        { sceneId, tokenIds: tokens.map((token) => token._id) },
      );
      expect(tokensNew).toEqual([true, false]);

      const packed = await readStored(page, "Actor", "packedNewActor01", packId);
      expect(packed.flags?.acks?.isNew).toBe(true);
      expect(packed.system).not.toHaveProperty("isNew");
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

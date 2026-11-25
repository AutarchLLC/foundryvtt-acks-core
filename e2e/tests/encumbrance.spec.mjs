/* global Actor, game */
import { createActor, expect, openActorSheet, openActorSheetTab, test } from "../support/foundry.mjs";
import { migrateWorldFrom, readStored, reloadWorld, storeRaw } from "../support/stored-data.mjs";

/**
 * Encumbrance Level and exploration speed of a new character at each carried weight (in sixths of a stone).
 * The character carries one item of 1/6 stone with the weight as its Quantity.
 * @param {import("@playwright/test").Page} page
 * @param {{system?: object, effects?: object[]}} data  Extra character data
 * @param {number[]} weights6
 * @return {Promise<{actorId: string, levels: {weight6: number, level: number, speed: number}[]}>}
 */
function levelsAt(page, data, weights6) {
  return page.evaluate(
    async ({ data, weights6 }) => {
      const actor = await Actor.implementation.create({
        name: "Porter",
        type: "character",
        system: { scores: { str: { value: 10 } }, ...data.system },
        items: [{ name: "Sand", type: "item", system: { weight6: 1, quantity: 0 } }],
        effects: data.effects ?? [],
      });
      const sand = actor.items.getName("Sand");
      const levels = [];
      for (const weight6 of weights6) {
        await sand.update({ "system.quantity": weight6 });
        levels.push({ weight6, level: actor.system.encumbrance.level, speed: actor.system.movement.base });
      }
      return { actorId: actor.id, levels };
    },
    { data, weights6 },
  );
}

test.describe("character encumbrance", () => {
  test("a character's Encumbrance Level changes at 5, 7, 10 and 20 stone", async ({ page }) => {
    const { levels } = await levelsAt(page, {}, [0, 30, 31, 42, 43, 60, 61, 120, 121]);

    expect(levels).toEqual([
      { weight6: 0, level: 0, speed: 120 },
      { weight6: 30, level: 0, speed: 120 },
      { weight6: 31, level: 1, speed: 90 },
      { weight6: 42, level: 1, speed: 90 },
      { weight6: 43, level: 2, speed: 60 },
      { weight6: 60, level: 2, speed: 60 },
      { weight6: 61, level: 3, speed: 30 },
      { weight6: 120, level: 3, speed: 30 },
      { weight6: 121, level: 4, speed: 0 },
    ]);
  });

  test("the STR modifier adds to the Maximum Load only", async ({ page }) => {
    const { levels } = await levelsAt(page, { system: { scores: { str: { value: 18 } } } }, [43, 138, 139]);

    expect(levels.map(({ level }) => level)).toEqual([2, 3, 4]);
  });

  test("the movement modifier changes full speed before the level's share, rounded down", async ({ page }) => {
    const { levels } = await levelsAt(page, { system: { movement: { mod: 30 } } }, [30, 31, 43, 61, 121]);

    expect(levels.map(({ speed }) => speed)).toEqual([150, 112, 75, 37, 0]);
  });

  test("an Active Effect on Normal Load moves every breakpoint, and Normal Load is never stored", async ({ page }) => {
    const houseRule = {
      name: "Sturdy Back",
      system: { changes: [{ key: "system.encumbrance.normalLoad6", type: "add", value: "6" }] },
    };
    // Normal Load 6 stone: Low above 36, Medium above 50.4, High above 72, Overburdened above 144 sixths.
    const { actorId, levels } = await levelsAt(page, { effects: [houseRule] }, [36, 37, 50, 51, 72, 73, 144, 145]);
    expect(levels.map(({ level }) => level)).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);

    const stored = await readStored(page, "Actor", actorId);
    expect(stored.system.encumbrance ?? {}).not.toHaveProperty("normalLoad6");
    expect(await page.evaluate((id) => game.actors.get(id).system.encumbrance.max, actorId)).toBe(24);
  });

  test("the header shows carried weight and Maximum Load, with the level as tooltip", async ({ page }) => {
    const actorId = await createActor(page, {
      name: "Overloaded",
      type: "character",
      system: { scores: { str: { value: 10 } } },
      items: [{ name: "Anvil", type: "item", system: { weight6: 6, quantity: 21 } }],
    });
    const sheet = await openActorSheet(page, actorId);

    const value = sheet.locator(".encumbrance-value");
    await expect(value).toHaveText("21 / 20");
    await expect(value).toHaveAttribute("data-tooltip", "Overburdened");
    await expect(value).toHaveClass(/overburdened/);
  });

  test("a character's Normal Load is shown read-only on the Primary Characteristics tab", async ({ page }) => {
    const actorId = await createActor(page, { name: "Load Fighter", type: "character" });
    const tab = await openActorSheetTab(page, actorId, "primaryCharacteristics");

    const normalLoad = tab.locator(".normal-load");
    await expect(normalLoad.locator(".stone-weight__stones")).toHaveValue("5");
    await expect(normalLoad.locator(".stone-weight__stones")).toBeDisabled();
    await expect(normalLoad.locator(".stone-weight__sixths")).toBeDisabled();
    await expect(normalLoad.locator("input[type=hidden]")).toHaveCount(0);
  });
});

test.describe("monster encumbrance", () => {
  test("a monster stores a Normal Load edited on the sheet and is always Unencumbered", async ({ page }) => {
    const actorId = await createActor(page, { name: "Mule", type: "monster" });
    expect((await readStored(page, "Actor", actorId)).system.encumbrance.normalLoad6).toBe(30);

    const tab = await openActorSheetTab(page, actorId, "primaryCharacteristics");
    await tab.locator(".normal-load .stone-weight__stones").fill("20");
    await tab.locator(".normal-load .stone-weight__stones").press("Tab");
    await expect
      .poll(() => page.evaluate((id) => game.actors.get(id).system.encumbrance.normalLoad6, actorId))
      .toBe(120);

    await page.evaluate((id) => game.actors.get(id).sheet.close(), actorId);
    await reloadWorld(page);
    expect((await readStored(page, "Actor", actorId)).system.encumbrance.normalLoad6).toBe(120);
    expect(await page.evaluate((id) => game.actors.get(id).system.encumbrance.level, actorId)).toBe(0);
  });
});

test.describe("encumbrance migration", () => {
  test("a character's stored maximum and forced maximum are deleted", async ({ page }) => {
    const id = "forcedMaxChar001";
    await storeRaw(page, "Actor", [
      {
        _id: id,
        name: "Forced Max",
        type: "character",
        system: { _schemaVersion: 9, scores: { str: { value: 10 } }, encumbrance: { max: 20, forcemax: 30 } },
      },
    ]);

    await migrateWorldFrom(page, 9);
    await reloadWorld(page);

    const stored = await readStored(page, "Actor", id);
    expect(stored.system._schemaVersion).toBe(10);
    expect(stored.system.encumbrance ?? {}).not.toHaveProperty("max");
    expect(stored.system.encumbrance ?? {}).not.toHaveProperty("forcemax");
    expect(await page.evaluate((id) => game.actors.get(id).system.encumbrance.max, id)).toBe(20);
  });
});

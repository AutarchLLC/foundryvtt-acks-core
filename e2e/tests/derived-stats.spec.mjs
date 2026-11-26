/* global Actor, CONST, Hooks, game, setTimeout */
import { createActor, expect, joinWorld, test } from "../support/foundry.mjs";

/** Fixture user with the Player role (e2e/fixtures/world/users/player.json). */
const PLAYER_USER = "Player";

/**
 * A character whose derived stats are known by hand:
 * - STR 13 (+1), DEX 16 (+2), initiative mod +1, AC mod +1, 20 max HP (BHR band 17+ → 1d6)
 * - equipped chain (AC 4, 4 stone) and shield (AC 1, 1 stone), 4 ropes (½ stone each),
 *   clothing (ignored by encumbrance) and 1,500 coins (1 stone)
 * - 8 stone carried out of 21 → Medium Encumbrance, 60' exploration speed
 */
const CHARACTER = {
  name: "Derived Stats",
  type: "character",
  system: {
    scores: { str: { value: 13 }, dex: { value: 16 } },
    hp: { value: 20, max: 20 },
    ac: { mod: 1 },
    initiative: { mod: 1 },
  },
  items: [
    { name: "Chain", type: "armor", system: { ac: { value: 4 }, type: "medium", weight6: 24, equipped: true } },
    { name: "Shield", type: "armor", system: { ac: { value: 1 }, type: "shield", weight6: 6, equipped: true } },
    { name: "Rope", type: "item", system: { weight6: 3, quantity: 4 } },
    { name: "Clothes", type: "item", system: { subtype: "clothing", weight6: 6 } },
    { name: "Silver", type: "money", system: { quantity: 1500, coppervalue: 10 } },
  ],
};

/**
 * Derived stats of an actor as the given page sees them.
 * @param {import("@playwright/test").Page} page
 * @param {string} actorId
 */
function readDerived(page, actorId) {
  return page.evaluate((id) => {
    const { ac, encumbrance, movement, initiative, hp, fight } = game.actors.get(id).system;
    const { speed, exploration, combat, running, expedition } = movement.walking;
    return {
      ac: { value: ac.value, naked: ac.naked, shield: ac.shield },
      encumbrance: { ...encumbrance },
      walking: { speed, exploration, combat, running, expedition },
      spelunking: movement.spelunking,
      sneaking: movement.sneaking,
      initiative: initiative.value,
      bhr: hp.bhr,
      healingrate: fight?.healingrate,
    };
  }, actorId);
}

test.describe("actor derived stats", () => {
  test("a character derives AC, encumbrance, movement, initiative and BHR", async ({ page }) => {
    const id = await createActor(page, CHARACTER);
    const derived = await readDerived(page, id);

    expect(derived.ac).toEqual({ value: 8, naked: 2, shield: 1 });
    expect(derived.encumbrance).toEqual({
      normalLoad6: 30,
      level: 2,
      pct: expect.closeTo((8 / 21) * 100, 6),
      max: 21,
      encumbered: false,
      value: 8,
      max6: 126,
      value6: 48,
      breakpoints: {
        low: expect.closeTo((5 / 21) * 100, 6),
        mid: expect.closeTo((7 / 21) * 100, 6),
        high: expect.closeTo((10 / 21) * 100, 6),
      },
    });
    expect(derived.walking).toEqual({ speed: 120, exploration: 60, combat: 20, running: 60, expedition: 12 });
    expect(derived.spelunking).toBe(6);
    expect(derived.sneaking).toBe(10);
    expect(derived.initiative).toBe(3);
    expect(derived.bhr).toBe("1d6");
    expect(derived.healingrate).toBe("1d6");
  });

  test("a character's own Walking Speed is slowed by encumbrance, each speed rounded down", async ({ page }) => {
    const id = await createActor(page, {
      ...CHARACTER,
      system: { ...CHARACTER.system, movement: { walking: { speed: 90 } } },
    });
    const derived = await readDerived(page, id);

    // Medium Encumbrance: 90 × ½ = 45
    expect(derived.walking).toEqual({ speed: 90, exploration: 45, combat: 15, running: 45, expedition: 9 });
    expect(derived.spelunking).toBe(5);
    expect(derived.sneaking).toBe(7);
  });

  test("a monster derives initiative and movement", async ({ page }) => {
    const id = await createActor(page, {
      name: "Derived Monster",
      type: "monster",
      system: { initiative: { mod: 2 }, movement: { walking: { speed: 90 } } },
    });
    const derived = await readDerived(page, id);

    expect(derived.initiative).toBe(2);
    expect(derived.walking).toEqual({ speed: 90, exploration: 90, combat: 30, running: 90, expedition: 18 });
  });

  test("preparing a character never updates the database", async ({ page }) => {
    const id = await createActor(page, CHARACTER);
    const result = await page.evaluate(async (id) => {
      const actor = game.actors.get(id);
      let updates = 0;
      const update = Actor.prototype.update;
      Actor.prototype.update = function (...args) {
        updates++;
        return update.apply(this, args);
      };
      const hookId = Hooks.on("preUpdateActor", () => updates++);
      try {
        // Stale stored values: the old preparation wrote the derived ones back to the database.
        actor.updateSource({ "system.hp.bhr": "1d2", "system.encumbrance.max": 99 });
        actor.reset();
        await new Promise((resolve) => setTimeout(resolve, 500));
      } finally {
        Actor.prototype.update = update;
        Hooks.off("preUpdateActor", hookId);
      }
      return { updates, bhr: actor.system.hp.bhr, max: actor.system.encumbrance.max };
    }, id);

    expect(result).toEqual({ updates: 0, bhr: "1d6", max: 21 });
  });

  test("a player observing a character sees the same derived stats as the GM", async ({ page, browser }, testInfo) => {
    const playerId = await page.evaluate((name) => game.users.getName(name).id, PLAYER_USER);
    const id = await createActor(page, {
      ...CHARACTER,
      ownership: { default: 0, [playerId]: 2 },
    });
    const gm = await readDerived(page, id);

    const { baseURL, viewport } = testInfo.project.use;
    const context = await browser.newContext({ baseURL, viewport });
    try {
      const playerPage = await context.newPage();
      await joinWorld(playerPage, PLAYER_USER);
      const isObserver = await playerPage.evaluate(
        (id) =>
          game.actors.get(id).testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER, { exact: true }),
        id,
      );
      expect(isObserver).toBe(true);
      expect(await readDerived(playerPage, id)).toEqual(gm);
    } finally {
      await context.close();
    }
  });
});

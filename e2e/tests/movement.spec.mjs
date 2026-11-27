/* global game */
import { createActor, expect, openActorSheet, openActorSheetTab, test } from "../support/foundry.mjs";
import { migrateWorldFrom, readStored, reloadWorld, storeRaw } from "../support/stored-data.mjs";

const MODES = ["walking", "burrowing", "climbing", "flying", "hovering", "swimming", "webcrawling"];

/**
 * Every speed of an actor as the page sees it.
 * @param {import("@playwright/test").Page} page
 * @param {string} actorId
 */
function readMovement(page, actorId) {
  return page.evaluate((id) => {
    const movement = game.actors.get(id).system.movement;
    const modes = {};
    for (const mode of ["walking", "burrowing", "climbing", "flying", "hovering", "swimming", "webcrawling"]) {
      const { speed, exploration, combat, running, expedition } = movement[mode];
      modes[mode] = { speed, exploration, combat, running, expedition };
    }
    return { ...modes, spelunking: movement.spelunking, sneaking: movement.sneaking };
  }, actorId);
}

test.describe("movement", () => {
  test("a new actor walks at 120 and has no other Movement Mode", async ({ page }) => {
    for (const type of ["character", "monster"]) {
      const id = await createActor(page, { name: `New ${type}`, type });
      const movement = await readMovement(page, id);

      expect(movement.walking).toEqual({ speed: 120, exploration: 120, combat: 40, running: 120, expedition: 24 });
      for (const mode of MODES.slice(1)) {
        expect(movement[mode]).toEqual({ speed: 0, exploration: 0, combat: 0, running: 0, expedition: 0 });
      }
      expect(movement.spelunking).toBe(13);
      expect(movement.sneaking).toBe(20);

      const stored = await readStored(page, "Actor", id);
      expect(Object.keys(stored.system.movement).sort()).toEqual([...MODES].sort());
      expect(stored.system.movement.walking).toEqual({ speed: 120 });
      expect(stored.system).not.toHaveProperty("movementacks");
      expect(stored.system).not.toHaveProperty("config");
    }
  });

  test("encumbrance slows every Movement Mode", async ({ page }) => {
    const id = await createActor(page, {
      name: "Laden Flyer",
      type: "character",
      system: { scores: { str: { value: 10 } }, movement: { walking: { speed: 90 }, flying: { speed: 240 } } },
      // 6 stone: Low Encumbrance
      items: [{ name: "Sack", type: "item", system: { weight6: 6, quantity: 6 } }],
    });
    const movement = await readMovement(page, id);

    expect(movement.walking).toEqual({ speed: 90, exploration: 67, combat: 22, running: 67, expedition: 13 });
    expect(movement.flying).toEqual({ speed: 240, exploration: 180, combat: 60, running: 180, expedition: 36 });
    expect(movement.spelunking).toBe(7);
    expect(movement.sneaking).toBe(11);
  });

  test("an Active Effect changes the Speed before encumbrance and is never stored", async ({ page }) => {
    const id = await createActor(page, {
      name: "Hasted",
      type: "character",
      effects: [
        {
          name: "Haste",
          system: { changes: [{ key: "system.movement.walking.speed", type: "multiply", value: "2" }] },
        },
      ],
    });
    const movement = await readMovement(page, id);
    expect(movement.walking).toEqual({ speed: 240, exploration: 240, combat: 80, running: 240, expedition: 48 });
    expect((await readStored(page, "Actor", id)).system.movement.walking.speed).toBe(120);

    const tab = await openActorSheetTab(page, id, "primaryCharacteristics");
    const walking = tab.locator('.movement__row[data-mode="walking"]');
    await expect(walking.locator("input")).toHaveValue("120");
    await expect(walking.locator(".movement__effective")).toHaveText("240");
    await expect(walking.locator(".movement__combat")).toHaveText("80");
  });

  test("a Speed entered in the Movement table is stored", async ({ page }) => {
    const id = await createActor(page, { name: "Bat", type: "monster" });
    const tab = await openActorSheetTab(page, id, "primaryCharacteristics");

    const flying = tab.locator('.movement__row[data-mode="flying"]');
    await expect(flying).toHaveClass(/movement__row--unused/);
    await flying.locator("input").fill("180");
    await flying.locator("input").press("Tab");

    await expect(flying.locator(".movement__combat")).toHaveText("60");
    await expect(flying).not.toHaveClass(/movement__row--unused/);
    expect((await readStored(page, "Actor", id)).system.movement.flying).toEqual({ speed: 180 });
    await expect(tab.locator(".movement__spelunking strong")).toHaveText("13");
    await expect(tab.locator(".movement__sneaking strong")).toHaveText("20");
  });

  test("the monster header shows Walking Combat and Exploration Speed", async ({ page }) => {
    const id = await createActor(page, {
      name: "Wolf",
      type: "monster",
      system: { movement: { walking: { speed: 150 } } },
    });
    const sheet = await openActorSheet(page, id);

    await expect(sheet.locator(".header-movement__value")).toHaveValue("50' / 150'");
  });
});

test.describe("movement migration", () => {
  /**
   * A raw actor at schema version 10.
   * @param {string} _id
   * @param {"character"|"monster"} type
   * @param {object} system
   */
  const legacy = (_id, type, system) => ({ _id, name: _id, type, system: { _schemaVersion: 10, ...system } });

  test("characters walk at 120, or at their stored speed when it was not calculated", async ({ page }) => {
    await storeRaw(page, "Actor", [
      legacy("autoMoveChar0001", "character", {
        config: { movementAuto: true },
        movement: { base: 90, mod: 30, value: "" },
        movementacks: { exploration: 150, combat: 50, chargerun: 150, expedition: 30, stealth: 25, climb: 16.6 },
      }),
      legacy("manualMoveChar01", "character", {
        config: { movementAuto: false },
        movement: { base: 90, mod: 0 },
        movementacks: { exploration: 90, combat: 30 },
      }),
    ]);

    await migrateWorldFrom(page, 10);
    await reloadWorld(page);

    const auto = await readStored(page, "Actor", "autoMoveChar0001");
    expect(auto.system._schemaVersion).toBeGreaterThanOrEqual(11);
    expect(auto.system.movement.walking).toEqual({ speed: 120 });
    for (const key of ["base", "mod", "value"]) expect(auto.system.movement).not.toHaveProperty(key);
    expect(auto.system).not.toHaveProperty("movementacks");
    expect(auto.system).not.toHaveProperty("config");
    expect(auto.system.details?.biography ?? "").not.toContain("speed rework");

    const manual = await readStored(page, "Actor", "manualMoveChar01");
    expect(manual.system.movement.walking).toEqual({ speed: 90 });
    expect(await page.evaluate(() => game.actors.get("manualMoveChar01").system.movement.walking.combat)).toBe(30);
  });

  test("monsters read their Speeds from the old movement and keep a copy in the biography", async ({ page }) => {
    await storeRaw(page, "Actor", [
      legacy("modesMonster0001", "monster", {
        movement: { base: 90, value: "fly 40' / 120', swim 20' / 60'" },
        details: { biography: "<p>Old notes</p>" },
      }),
      legacy("hoverMonster0001", "monster", { movement: { base: 30, value: "40' / 120', fly 80'H / 240'H" } }),
      legacy("firstEdMonster01", "monster", { movement: { base: 60, value: "Web 150' (50')" } }),
      legacy("bareMonster00001", "monster", { movement: { base: 90, value: "40" }, details: { biography: "" } }),
      legacy("plainMonster0001", "monster", {
        movement: { base: 120, value: "" },
        details: { biography: "<p>Kept</p>" },
      }),
    ]);

    await migrateWorldFrom(page, 10);
    await reloadWorld(page);

    const stored = async (id) => (await readStored(page, "Actor", id)).system;

    const modes = await stored("modesMonster0001");
    expect(modes.movement).toMatchObject({ walking: { speed: 90 }, flying: { speed: 120 }, swimming: { speed: 60 } });
    expect(modes.movement.hovering).toEqual({ speed: 0 });
    for (const key of ["base", "mod", "value"]) expect(modes.movement).not.toHaveProperty(key);
    expect(modes.details.biography).toMatch(/^<p>Old notes<\/p><hr><h3>Movement before the speed rework/);
    expect(modes.details.biography).toContain("<p>Base: 90</p>");
    expect(modes.details.biography).toContain("<p>Movement: fly 40' / 120', swim 20' / 60'</p>");

    const hover = await stored("hoverMonster0001");
    expect(hover.movement).toMatchObject({ walking: { speed: 120 }, hovering: { speed: 240 }, flying: { speed: 0 } });

    const firstEd = await stored("firstEdMonster01");
    expect(firstEd.movement).toMatchObject({ walking: { speed: 60 }, webcrawling: { speed: 150 } });

    const bare = await stored("bareMonster00001");
    expect(bare.movement.walking).toEqual({ speed: 90 });
    expect(bare.details.biography).toContain("<p>Movement: 40</p>");

    const plain = await stored("plainMonster0001");
    expect(plain.movement.walking).toEqual({ speed: 120 });
    expect(plain.details.biography).toBe("<p>Kept</p>");
  });

  test("a system compendium monster is converted in memory", async ({ page }) => {
    const movement = await page.evaluate(async () => {
      const gargoyle = await game.packs.get("acks.acks-monsters").getDocument("wEn0ghP4RfiUXeFS");
      const { walking, flying } = gargoyle.system.movement;
      return { walking: walking.speed, flying: flying.speed, biography: gargoyle.system.details.biography };
    });

    expect(movement.walking).toBe(90);
    expect(movement.flying).toBe(150);
    expect(movement.biography).toContain("Fly 150' (50')");
  });

  test("an unlinked token's old movement becomes a Walking Speed in its delta", async ({ page }) => {
    const sceneId = "moveScene0000001";
    const tokenId = "moveToken0000001";
    const base = legacy("deltaMonster0001", "monster", { movement: { base: 120, value: "" } });
    await storeRaw(page, "Actor", [base]);
    await storeRaw(page, "Scene", [
      {
        _id: sceneId,
        name: "Movement Scene",
        tokens: [
          {
            _id: tokenId,
            name: "Slow Ogre",
            actorId: base._id,
            actorLink: false,
            delta: { system: { _schemaVersion: 10, movement: { base: 60 } } },
          },
        ],
      },
    ]);

    try {
      await migrateWorldFrom(page, 10);

      const delta = (await readStored(page, "Scene", sceneId)).tokens.find((t) => t._id === tokenId).delta;
      expect(delta.system.movement).toEqual({ walking: { speed: 60 } });
      expect(delta.system).not.toHaveProperty("details");
      const speed = await page.evaluate(
        ({ sceneId, tokenId }) => game.scenes.get(sceneId).tokens.get(tokenId).actor.system.movement.walking.speed,
        { sceneId, tokenId },
      );
      expect(speed).toBe(60);
    } finally {
      await page.evaluate((id) => game.scenes.get(id)?.delete(), sceneId);
    }
  });
});

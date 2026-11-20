/* global game */
import { createActor, expect, openActorSheet, test } from "../support/foundry.mjs";

/**
 * Read the parts of a new actor that creation is expected to set.
 * @param {import("@playwright/test").Page} page
 * @param {string} actorId
 * @returns {Promise<{dex: number, isNew: boolean, flag: boolean|undefined, systemIsNew: boolean|undefined, money: string[]}>}
 */
function readNewActor(page, actorId) {
  return page.evaluate((id) => {
    const actor = game.actors.get(id);
    return {
      dex: actor.system.scores?.dex.value,
      isNew: actor.isNew(),
      flag: actor._source.flags.acks?.isNew,
      systemIsNew: actor._source.system.isNew,
      money: actor.items.filter((i) => i.type === "money").map((i) => i.name),
    };
  }, actorId);
}

test.describe("actor creation", () => {
  test("system data passed at creation is kept, and the character is still new with starting money", async ({
    page,
  }) => {
    const actorId = await createActor(page, {
      name: "Nimble Fighter",
      type: "character",
      system: { scores: { dex: { value: 16 } } },
    });

    const actor = await readNewActor(page, actorId);

    expect(actor.dex).toBe(16);
    expect(actor).toMatchObject({ isNew: true, flag: true, systemIsNew: undefined });
    expect(actor.money.length).toBeGreaterThan(0);
  });

  test("a character created without system data is new and gets starting money", async ({ page }) => {
    const actorId = await createActor(page, { name: "Blank Fighter", type: "character" });

    const actor = await readNewActor(page, actorId);

    expect(actor).toMatchObject({ dex: 10, isNew: true, flag: true });
    expect(actor.money.length).toBeGreaterThan(0);
  });

  test("a new monster is new", async ({ page }) => {
    const actorId = await createActor(page, { name: "Fresh Goblin", type: "monster" });

    expect(await readNewActor(page, actorId)).toMatchObject({ isNew: true, flag: true });
  });

  test("an explicit isNew flag passed at creation is kept", async ({ page }) => {
    const actorId = await createActor(page, { name: "Veteran", type: "character", flags: { acks: { isNew: false } } });

    expect(await readNewActor(page, actorId)).toMatchObject({ isNew: false, flag: false });
  });

  test("a copied actor, created with its items, is not new", async ({ page }) => {
    const actorId = await createActor(page, {
      name: "Copied Fighter",
      type: "character",
      items: [{ name: "Rope", type: "item" }],
    });

    expect((await readNewActor(page, actorId)).isNew).toBe(false);
  });

  test("a deprecated system.isNew passed at creation moves to the flag with a compatibility warning", async ({
    page,
  }) => {
    const warnings = [];
    const onConsole = (message) => {
      if (message.type() === "warning" && message.text().includes("isNew")) warnings.push(message.text());
    };
    page.on("console", onConsole);
    try {
      const actorId = await createActor(page, {
        name: "Old Macro Veteran",
        type: "character",
        system: { isNew: false },
      });

      expect(await readNewActor(page, actorId)).toMatchObject({ isNew: false, flag: false, systemIsNew: undefined });
      expect(warnings).toHaveLength(1);
    } finally {
      page.off("console", onConsole);
    }
  });

  test("a deprecated system.isNew passed with a copied actor's items still moves to the flag", async ({ page }) => {
    const actorId = await createActor(page, {
      name: "Copied Novice",
      type: "character",
      system: { isNew: true },
      items: [{ name: "Rope", type: "item" }],
    });

    expect(await readNewActor(page, actorId)).toMatchObject({ isNew: true, flag: true, systemIsNew: undefined });
  });

  test("an isNew flag passed at creation wins over a deprecated system.isNew", async ({ page }) => {
    const actorId = await createActor(page, {
      name: "Conflicted Fighter",
      type: "character",
      system: { isNew: false },
      flags: { acks: { isNew: true } },
    });

    expect(await readNewActor(page, actorId)).toMatchObject({ isNew: true, flag: true, systemIsNew: undefined });
  });
});

test.describe("the new actor prompt", () => {
  test("a new character's sheet offers to roll scores, until scores change", async ({ page }) => {
    const actorId = await createActor(page, { name: "Prompted Fighter", type: "character" });
    const rollScores = (sheet) => sheet.locator('[data-action="generateScores"]');

    let sheet = await openActorSheet(page, actorId);
    await expect(rollScores(sheet)).toBeVisible();

    await page.evaluate((id) => game.actors.get(id).update({ "system.scores.str.value": 14 }), actorId);
    sheet = await openActorSheet(page, actorId);
    await expect(rollScores(sheet)).toHaveCount(0);
  });

  test("a new monster's sheet offers to roll saves, until saves change", async ({ page }) => {
    const actorId = await createActor(page, { name: "Prompted Goblin", type: "monster" });
    const rollSaves = (sheet) => sheet.locator('[data-action="generateSaves"]');

    let sheet = await openActorSheet(page, actorId);
    await expect(rollSaves(sheet)).toBeVisible();

    const isNew = await page.evaluate(async (id) => {
      const actor = game.actors.get(id);
      await actor.update({ "system.saves.death.value": 12 });
      return actor.isNew();
    }, actorId);
    expect(isNew).toBe(false);
    sheet = await openActorSheet(page, actorId);
    await expect(rollSaves(sheet)).toHaveCount(0);
  });
});

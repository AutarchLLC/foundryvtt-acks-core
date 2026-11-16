/* global game */
import { createActor, expect, test } from "../support/foundry.mjs";

/**
 * Read the parts of a new actor that creation is expected to set.
 * @param {import("@playwright/test").Page} page
 * @param {string} actorId
 * @returns {Promise<{dex: number, isNew: boolean, money: string[]}>}
 */
function readNewActor(page, actorId) {
  return page.evaluate((id) => {
    const actor = game.actors.get(id);
    return {
      dex: actor.system.scores?.dex.value,
      isNew: actor.system.isNew,
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
    expect(actor.isNew).toBe(true);
    expect(actor.money.length).toBeGreaterThan(0);
  });

  test("an explicit isNew passed at creation is kept", async ({ page }) => {
    const actorId = await createActor(page, { name: "Veteran", type: "character", system: { isNew: false } });

    expect((await readNewActor(page, actorId)).isNew).toBe(false);
  });

  test("a character created without system data is new and gets starting money", async ({ page }) => {
    const actorId = await createActor(page, { name: "Blank Fighter", type: "character" });

    const actor = await readNewActor(page, actorId);

    expect(actor).toMatchObject({ dex: 10, isNew: true });
    expect(actor.money.length).toBeGreaterThan(0);
  });
});

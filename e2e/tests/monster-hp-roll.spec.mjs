/* global Scene, canvas, game */
import { createActor, expect, test } from "../support/foundry.mjs";
import { reloadWorld } from "../support/stored-data.mjs";

/** Hit Dice whose every roll lands in MIN_HP–MAX_HP, far from the actor's stored HP of 1. */
const HIT_DICE = "10d8+100";
const MIN_HP = 110;
const MAX_HP = 180;

/** The scene tokens are placed on; viewed while in use and deleted after each test. */
const SCENE_NAME = "HP Roll Scene";

/**
 * Place a token of the given actor on the test scene, creating and viewing the scene the first time.
 * @param {import("@playwright/test").Page} page
 * @param {string} actorId
 * @param {{actorLink?: boolean}} [tokenData]
 * @returns {Promise<{sceneId: string, tokenId: string}>}
 */
function placeToken(page, actorId, tokenData = {}) {
  return page.evaluate(
    async ({ actorId, tokenData, sceneName }) => {
      let scene = game.scenes.getName(sceneName);
      if (!scene) {
        scene = await Scene.implementation.create({ name: sceneName, width: 1000, height: 1000 });
        await scene.view();
      }
      const token = await game.actors.get(actorId).getTokenDocument({ x: 100, y: 100, ...tokenData });
      const [created] = await scene.createEmbeddedDocuments("Token", [token.toObject()]);
      return { sceneId: scene.id, tokenId: created.id };
    },
    { actorId, tokenData, sceneName: SCENE_NAME },
  );
}

/**
 * The HP a placed token stores in its delta and shows on its actor.
 * @param {import("@playwright/test").Page} page
 * @param {{sceneId: string, tokenId: string}} ids
 * @returns {Promise<{stored: object|null, shown: {value: number, max: number}}>}
 */
function tokenHp(page, { sceneId, tokenId }) {
  return page.evaluate(
    ({ sceneId, tokenId }) => {
      const token = game.scenes.get(sceneId).tokens.get(tokenId);
      const { value, max } = token.actor.system.hp;
      return { stored: token._source.delta?.system?.hp ?? null, shown: { value, max } };
    },
    { sceneId, tokenId },
  );
}

/**
 * @param {import("@playwright/test").Page} page
 * @param {boolean} enabled
 */
function setAutoRoll(page, enabled) {
  return page.evaluate((enabled) => game.settings.set("acks", "autoRollMonsterHP", enabled), enabled);
}

test.describe("roll monster HP", () => {
  test.afterEach(async ({ page }) => {
    await setAutoRoll(page, true);
    await page.waitForFunction(() => canvas.ready);
    await page.evaluate(async (name) => {
      const ids = game.scenes.filter((s) => s.name === name).map((s) => s.id);
      if (ids.length) await Scene.implementation.deleteDocuments(ids);
    }, SCENE_NAME);
  });

  const unlinkedActorData = (name, type = "monster") => ({
    name,
    type,
    prototypeToken: { actorLink: false },
    system: { hp: { hd: HIT_DICE, value: 1, max: 1 } },
  });

  test("an unlinked monster token gets HP rolled from its Hit Dice, kept after reload", async ({ page }) => {
    await setAutoRoll(page, true);
    const actorId = await createActor(page, unlinkedActorData("Rolled Monster"));
    const ids = await placeToken(page, actorId);

    await reloadWorld(page);
    const { stored, shown } = await tokenHp(page, ids);
    expect(stored.max).toBeGreaterThanOrEqual(MIN_HP);
    expect(stored.max).toBeLessThanOrEqual(MAX_HP);
    expect(stored.value).toBe(stored.max);
    expect(shown).toEqual({ value: stored.max, max: stored.max });
  });

  test("with the setting off, an unlinked monster token keeps its actor's HP", async ({ page }) => {
    await setAutoRoll(page, false);
    const actorId = await createActor(page, unlinkedActorData("Unrolled Monster"));
    const ids = await placeToken(page, actorId);

    expect(await tokenHp(page, ids)).toEqual({ stored: null, shown: { value: 1, max: 1 } });
  });

  test("a linked monster token does not roll HP", async ({ page }) => {
    await setAutoRoll(page, true);
    const actorId = await createActor(page, unlinkedActorData("Linked Monster"));
    const ids = await placeToken(page, actorId, { actorLink: true });

    expect((await tokenHp(page, ids)).shown).toEqual({ value: 1, max: 1 });
    const actorHp = await page.evaluate((id) => game.actors.get(id)._source.system.hp, actorId);
    expect(actorHp).toMatchObject({ value: 1, max: 1 });
  });

  test("an unlinked character token does not roll HP", async ({ page }) => {
    await setAutoRoll(page, true);
    const actorId = await createActor(page, unlinkedActorData("Unlinked Character", "character"));
    const ids = await placeToken(page, actorId);

    expect(await tokenHp(page, ids)).toEqual({ stored: null, shown: { value: 1, max: 1 } });
  });
});

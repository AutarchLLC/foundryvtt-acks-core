/* global game */
import { createActor, expect, placeToken, test } from "../support/foundry.mjs";
import { reloadWorld } from "../support/stored-data.mjs";

/** Hit Dice whose every roll lands in MIN_HP–MAX_HP, far from the actor's stored HP of 1. */
const HIT_DICE = "10d8+100";
const MIN_HP = 110;
const MAX_HP = 180;

/**
 * The HP a placed token stores in its delta and shows on its actor.
 * @param {import("@playwright/test").Page} page
 * @param {string} tokenId
 * @returns {Promise<{stored: object|null, shown: {value: number, max: number}}>}
 */
function tokenHp(page, tokenId) {
  return page.evaluate((tokenId) => {
    const token = game.scenes.find((s) => s.tokens.has(tokenId)).tokens.get(tokenId);
    const { value, max } = token.actor.system.hp;
    return { stored: token._source.delta?.system?.hp ?? null, shown: { value, max } };
  }, tokenId);
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
    const tokenId = await placeToken(page, actorId);

    await reloadWorld(page);
    const { stored, shown } = await tokenHp(page, tokenId);
    expect(stored.max).toBeGreaterThanOrEqual(MIN_HP);
    expect(stored.max).toBeLessThanOrEqual(MAX_HP);
    expect(stored.value).toBe(stored.max);
    expect(shown).toEqual({ value: stored.max, max: stored.max });
  });

  test("with the setting off, an unlinked monster token keeps its actor's HP", async ({ page }) => {
    await setAutoRoll(page, false);
    const actorId = await createActor(page, unlinkedActorData("Unrolled Monster"));
    const tokenId = await placeToken(page, actorId);

    expect(await tokenHp(page, tokenId)).toEqual({ stored: null, shown: { value: 1, max: 1 } });
  });

  test("a linked monster token does not roll HP", async ({ page }) => {
    await setAutoRoll(page, true);
    const actorId = await createActor(page, unlinkedActorData("Linked Monster"));
    const tokenId = await placeToken(page, actorId, { token: { actorLink: true } });

    expect((await tokenHp(page, tokenId)).shown).toEqual({ value: 1, max: 1 });
    const actorHp = await page.evaluate((id) => game.actors.get(id)._source.system.hp, actorId);
    expect(actorHp).toMatchObject({ value: 1, max: 1 });
  });

  test("an unlinked character token does not roll HP", async ({ page }) => {
    await setAutoRoll(page, true);
    const actorId = await createActor(page, unlinkedActorData("Unlinked Character", "character"));
    const tokenId = await placeToken(page, actorId);

    expect(await tokenHp(page, tokenId)).toEqual({ stored: null, shown: { value: 1, max: 1 } });
  });
});

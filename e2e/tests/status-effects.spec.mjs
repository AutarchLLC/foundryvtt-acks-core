/* global Actor, CONFIG, Scene, canvas, foundry, game, ui */
import { expect, test } from "../support/foundry.mjs";

const SCENE_NAME = "Status Effects Scene";

/** Foundry core status effects the system keeps, because core gives them special treatment. */
const KEPT_CORE = ["dead", "invisible", "fly", "burrow", "hover"];

/** Core-only status effects that the ACKS Conditions replace. */
const DROPPED_CORE = ["stun", "sleep", "blind", "frozen", "holyShield"];

/**
 * Create and view a scene with token vision, holding one monster token with sight.
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<string>} the token id
 */
async function viewSceneWithToken(page) {
  const tokenId = await page.evaluate(async (name) => {
    const scene = await Scene.implementation.create({ name, width: 1000, height: 1000, tokenVision: true });
    await scene.view();
    const actor = await Actor.implementation.create({ name: "Orc", type: "monster" });
    const tokenData = await actor.getTokenDocument({ x: 300, y: 300, sight: { enabled: true, range: 30 } });
    const [token] = await scene.createEmbeddedDocuments("Token", [tokenData.toObject()]);
    return token.id;
  }, SCENE_NAME);
  await page.waitForFunction((id) => canvas.ready && canvas.tokens.get(id)?.renderable !== undefined, tokenId);
  return tokenId;
}

test.describe("status effects", () => {
  test.afterEach(async ({ page }) => {
    // Status changes start scrolling text on the canvas; tearing the scene down mid-animation throws.
    await page.waitForFunction(() => !Object.keys(foundry.canvas.animation.CanvasAnimation.animations).length);
    await page.evaluate(async (name) => {
      await canvas.hud?.token?.close();
      const ids = game.scenes.filter((s) => s.name === name).map((s) => s.id);
      if (ids.length) await Scene.implementation.deleteDocuments(ids);
    }, SCENE_NAME);
  });

  test("the token HUD offers the ACKS Conditions and the kept core effects only", async ({ page }) => {
    const tokenId = await viewSceneWithToken(page);
    await page.evaluate(async (id) => {
      const token = canvas.tokens.get(id);
      token.control({ releaseOthers: true });
      await canvas.hud.token.bind(token);
    }, tokenId);

    const hudIds = await page
      .locator("#token-hud .status-effects [data-status-id]")
      .evaluateAll((els) => els.map((el) => el.dataset.statusId));
    const { conditions, combatStates } = await page.evaluate(() => ({
      conditions: CONFIG.ACKS.conditions.map((c) => c.id),
      combatStates: CONFIG.ACKS.combatStates.map((c) => c.id),
    }));

    expect(conditions).toHaveLength(59);
    expect(hudIds.toSorted()).toEqual([...conditions, ...KEPT_CORE].toSorted());
    for (const id of [...combatStates, ...DROPPED_CORE]) expect(hudIds).not.toContain(id);
  });

  test("Blinded is the special BLIND status and switches off the token's sight", async ({ page }) => {
    const tokenId = await viewSceneWithToken(page);
    // A GM only gets a vision source for a token they control.
    const isBlinded = () => page.evaluate((id) => canvas.tokens.get(id).vision?.isBlinded, tokenId);
    await page.evaluate((id) => canvas.tokens.get(id).control({ releaseOthers: true }), tokenId);
    await expect.poll(isBlinded).toBe(false);

    await page.evaluate((id) => canvas.tokens.get(id).actor.toggleStatusEffect("blinded", { active: true }), tokenId);

    expect(await page.evaluate(() => CONFIG.specialStatusEffects.BLIND)).toBe("blinded");
    await expect.poll(isBlinded).toBe(true);
  });

  test("marking a combatant defeated in the combat tracker applies Dead", async ({ page }) => {
    const tokenId = await viewSceneWithToken(page);
    await page.evaluate(async (id) => {
      const token = canvas.tokens.get(id);
      await token.document.toggleCombatant();
      await game.combat.activate();
      ui.sidebar.expand();
      ui.sidebar.changeTab("combat", "primary");
    }, tokenId);

    await page.locator(`#combat [data-combatant-id] [data-action="toggleDefeated"]`).first().click();

    await expect
      .poll(() => page.evaluate((id) => canvas.tokens.get(id).actor.statuses.has("dead"), tokenId))
      .toBe(true);
  });

  test("the world setting adds the core status effects back after a reload", async ({ page }) => {
    const reload = async () => {
      await page.reload();
      await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 60_000 });
    };
    try {
      await page.evaluate(() => game.settings.set("acks", "core-status-effects", true));
      await reload();
      const ids = await page.evaluate(() => CONFIG.statusEffects.map((s) => s.id));
      for (const id of DROPPED_CORE) expect(ids).toContain(id);
      expect(ids).toContain("blinded");
      expect(new Set(ids).size).toBe(ids.length);
    } finally {
      await page.evaluate(() => game.settings.set("acks", "core-status-effects", false));
      await reload();
    }
  });
  test("Combat States are applied once and removed by the combat helpers", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { AcksUtility } = await import("/systems/acks/module/util/acks-utility.mjs");
      const actor = await Actor.implementation.create({ name: "Fighter", type: "character" });
      await AcksUtility.addUniqueStatus(actor, "done");
      await AcksUtility.addUniqueStatus(actor, "done");
      const effects = actor.effects.filter((e) => e.statuses.has("done"));
      const applied = { count: effects.length, name: effects[0]?.name };
      await AcksUtility.removeEffect(actor, "done");
      return { ...applied, after: actor.statuses.has("done") };
    });

    expect(result).toEqual({ count: 1, name: "Done", after: false });
  });
});

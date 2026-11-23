/* global canvas, CONFIG, document, game, ui */
import { createActor, dialog, expect, latestChatMessage, placeToken, test } from "../support/foundry.mjs";

/**
 * Add a weapon to an actor and return the weapon's id.
 * @param {import("@playwright/test").Page} page
 * @param {string} actorId
 * @param {object} system - weapon system data
 * @returns {Promise<string>}
 */
function addWeapon(page, actorId, system) {
  return page.evaluate(
    async ({ id, system }) => {
      const [weapon] = await game.actors.get(id).createEmbeddedDocuments("Item", [
        {
          name: "Venom Dagger",
          type: "weapon",
          system: { melee: true, damage: { base: { formula: "1d4" } }, ...system },
        },
      ]);
      return weapon.id;
    },
    { id: actorId, system },
  );
}

/**
 * Post an item's card to chat.
 * @param {import("@playwright/test").Page} page
 * @param {string} actorId
 * @param {string} itemId
 * @returns {Promise<void>}
 */
async function showItemCard(page, actorId, itemId) {
  await page.evaluate(({ actorId, itemId }) => game.actors.get(actorId).items.get(itemId).showChatCard(), {
    actorId,
    itemId,
  });
}

/**
 * Save buttons (save key and label) on the last chat message.
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<{param: string, label: string}[]>}
 */
function lastMessageSaveButtons(page) {
  return page.evaluate(() => {
    const container = document.createElement("div");
    container.innerHTML = game.messages.contents.at(-1).content;
    return [...container.querySelectorAll('button[data-action="save"]')].map((button) => ({
      param: button.dataset.actionParam,
      label: button.textContent.trim(),
    }));
  });
}

/** `CONFIG.Dice.randomUniform` values that roll a natural 20 or a natural 1 (Foundry maps `1 - u` onto the faces) */
const NATURAL_20 = 0.001;
const NATURAL_1 = 0.999;

/**
 * Attack with a weapon, skipping the Attack Throw dialog, with every die rolled from a fixed `randomUniform` value.
 * @param {import("@playwright/test").Page} page
 * @param {string} actorId
 * @param {string} weaponId
 * @param {number} uniform - value returned by `CONFIG.Dice.randomUniform`
 * @returns {Promise<boolean>} whether the attack hit
 */
function attackWith(page, actorId, weaponId, uniform) {
  return page.evaluate(
    async ({ actorId, weaponId, uniform }) => {
      const original = CONFIG.Dice.randomUniform;
      CONFIG.Dice.randomUniform = () => uniform;
      try {
        const actor = game.actors.get(actorId);
        const outcome = await actor.makeAttackThrow({ item: actor.items.get(weaponId), skipDialog: true });
        return outcome.resolution.isHit;
      } finally {
        CONFIG.Dice.randomUniform = original;
      }
    },
    { actorId, weaponId, uniform },
  );
}

test.describe("weapon saving throw button", () => {
  test("a hit with a weapon that has a saving throw offers that save on the attack card", async ({ page }) => {
    const actorId = await createActor(page, { name: "Assassin", type: "character" });
    const weaponId = await addWeapon(page, actorId, { save: "paralysis" });

    expect(await attackWith(page, actorId, weaponId, NATURAL_20)).toBe(true);

    expect(await lastMessageSaveButtons(page)).toEqual([{ param: "paralysis", label: "Paralysis - Save" }]);
  });

  test("a miss offers no save on the attack card", async ({ page }) => {
    const actorId = await createActor(page, { name: "Assassin", type: "character" });
    const weaponId = await addWeapon(page, actorId, { save: "paralysis" });

    expect(await attackWith(page, actorId, weaponId, NATURAL_1)).toBe(false);

    expect(await lastMessageSaveButtons(page)).toEqual([]);
  });

  test("a hit with a weapon without a saving throw offers no save on the attack card", async ({ page }) => {
    const actorId = await createActor(page, { name: "Guard", type: "character" });
    const weaponId = await addWeapon(page, actorId, {});

    expect(await attackWith(page, actorId, weaponId, NATURAL_20)).toBe(true);

    expect(await lastMessageSaveButtons(page)).toEqual([]);
  });

  test("the weapon item card offers the weapon's saving throw", async ({ page }) => {
    const actorId = await createActor(page, { name: "Assassin", type: "character" });
    const weaponId = await addWeapon(page, actorId, { save: "death" });

    await showItemCard(page, actorId, weaponId);

    expect(await lastMessageSaveButtons(page)).toEqual([{ param: "death", label: "Death - Save" }]);
  });

  test("a weapon without a saving throw has no save button on its item card", async ({ page }) => {
    const actorId = await createActor(page, { name: "Guard", type: "character" });
    const weaponId = await addWeapon(page, actorId, {});

    await showItemCard(page, actorId, weaponId);

    expect(await lastMessageSaveButtons(page)).toEqual([]);
  });

  test("a spell's item card still offers its saving throw", async ({ page }) => {
    const actorId = await createActor(page, { name: "Mage", type: "character" });
    const spellId = await page.evaluate(async (id) => {
      const [spell] = await game.actors
        .get(id)
        .createEmbeddedDocuments("Item", [{ name: "Hold Person", type: "spell", system: { save: "spell" } }]);
      return spell.id;
    }, actorId);

    await showItemCard(page, actorId, spellId);

    expect(await lastMessageSaveButtons(page)).toEqual([{ param: "spell", label: "Spells - Save" }]);
  });

  test.describe("on a scene", () => {
    test("clicking the attack card's save button rolls that save for the controlled token", async ({ page }) => {
      const actorId = await createActor(page, { name: "Assassin", type: "character" });
      const weaponId = await addWeapon(page, actorId, { save: "paralysis" });
      const victimId = await createActor(page, { name: "Orc", type: "monster" });
      const tokenId = await placeToken(page, victimId);
      await page.evaluate((id) => {
        canvas.tokens.get(id).control({ releaseOthers: true });
        ui.sidebar.expand();
        ui.sidebar.changeTab("chat", "primary");
      }, tokenId);

      expect(await attackWith(page, actorId, weaponId, NATURAL_20)).toBe(true);
      await (await latestChatMessage(page)).getByRole("button", { name: "Paralysis - Save" }).click();

      const saveDialog = dialog(page, "Paralysis Save");
      await expect(saveDialog).toBeVisible();
      await saveDialog.getByRole("button", { name: "Roll" }).click();
      await expect.poll(() => page.evaluate(() => game.messages.contents.at(-1).speaker.alias)).toBe("Orc");
    });
  });
});

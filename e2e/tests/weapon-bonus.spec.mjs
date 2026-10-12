/* global Item, game */
import { createActor, expect, test } from "../support/foundry.mjs";

/**
 * Build an attack throw with the given weapon, as the Attack Throw dialog does.
 * @param {import("@playwright/test").Page} page
 * @param {string} actorId
 * @param {object} weaponSystem - system data of the weapon added to the actor
 * @returns {Promise<{attack: TRollSpec, damage: TRollSpec}>}
 */
function buildWeaponAttack(page, actorId, weaponSystem) {
  return page.evaluate(
    async ({ id, system }) => {
      const { buildAttackThrow } = await import("/systems/acks/module/throw/attack-throw-builder.mjs");
      const actor = game.actors.get(id);
      const [weapon] = await actor.createEmbeddedDocuments("Item", [{ name: "Bonus Sword", type: "weapon", system }]);
      const { attack, damage } = buildAttackThrow(actor, weapon, { attackType: "melee" });
      return { attack, damage };
    },
    { id: actorId, system: weaponSystem },
  );
}

test.describe("weapon bonus", () => {
  test("a legacy numeric bonus becomes the attack bonus", async ({ page }) => {
    const bonus = await page.evaluate(async () => {
      const weapon = await Item.implementation.create({
        name: "Old Net",
        type: "weapon",
        system: { _schemaVersion: 3, bonus: 2 },
      });
      return weapon.system.bonus;
    });

    expect(bonus).toEqual({ attack: 2, damage: 0 });
  });

  test("attack and damage bonuses are added to the attack throw and damage roll", async ({ page }) => {
    const actorId = await createActor(page, { name: "Bonus Fighter", type: "character" });
    const { attack, damage } = await buildWeaponAttack(page, actorId, {
      melee: true,
      bonus: { attack: 1, damage: 3 },
      damage: { base: { formula: "1d8" } },
    });

    expect(attack.modifiers).toContainEqual({ label: "Weapon Bonus", value: "+1" });
    expect(damage.modifiers).toContainEqual({ label: "Weapon Bonus", value: "+3" });
    expect(damage.formula).toMatch(/^1d8 .*\+ 3/);
  });

  test("a zero damage bonus is left out of the damage roll", async ({ page }) => {
    const actorId = await createActor(page, { name: "Plain Fighter", type: "character" });
    const { damage } = await buildWeaponAttack(page, actorId, {
      melee: true,
      damage: { base: { formula: "1d6" } },
    });

    expect(damage.modifiers.map((m) => m.label)).not.toContain("Weapon Bonus");
  });

  test("both bonuses are edited in the Details fieldset of the weapon sheet", async ({ page }) => {
    const elementId = await page.evaluate(async () => {
      const weapon = await Item.implementation.create({ name: "Sheet Sword", type: "weapon" });
      await weapon.sheet.render({ force: true });
      weapon.sheet.changeTab("details", "primary");
      return weapon.sheet.id;
    });
    const sheet = page.locator(`#${elementId}`);

    const details = sheet.locator('.tab[data-tab="details"] fieldset', { hasText: "Details" }).first();
    await expect(details.locator('input[name="system.bonus.attack"]')).toBeVisible();
    await expect(details.locator('input[name="system.bonus.damage"]')).toBeVisible();

    await details.locator('input[name="system.bonus.damage"]').fill("2");
    await details.locator('input[name="system.bonus.damage"]').blur();
    await expect.poll(() => page.evaluate(() => game.items.getName("Sheet Sword").system.bonus.damage)).toBe(2);
  });
});

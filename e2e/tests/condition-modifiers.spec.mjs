/* global game */
import { createActor, expect, test } from "../support/foundry.mjs";

/**
 * Toggle Conditions on an actor from the token HUD's code path and read the values they modify.
 * @param {import("@playwright/test").Page} page
 * @param {string} actorId
 * @param {Record<string, boolean>} toggles  Condition id → whether it should be active
 * @returns {Promise<{ac: number, meleeAttack: number, missileAttack: number, save: number}>}
 */
function toggleConditions(page, actorId, toggles) {
  return page.evaluate(
    async ({ id, toggles }) => {
      const actor = game.actors.get(id);
      for (const [statusId, active] of Object.entries(toggles)) {
        await actor.toggleStatusEffect(statusId, { active });
      }
      const { ac, attack, save } = actor.system;
      return { ac: ac.value, meleeAttack: attack.mod.melee, missileAttack: attack.mod.missile, save: save.mod };
    },
    { id: actorId, toggles },
  );
}

test.describe("condition modifiers", () => {
  test("a Condition changes the values it modifies while it is on", async ({ page }) => {
    const actorId = await createActor(page, { name: "Disordered Fighter", type: "character" });
    const before = await toggleConditions(page, actorId, {});

    const disordered = await toggleConditions(page, actorId, { disordered: true });
    expect(disordered.ac).toBe(before.ac - 2);

    const cleared = await toggleConditions(page, actorId, { disordered: false });
    expect(cleared.ac).toBe(before.ac);
  });

  test("Conditions that modify the same value add together", async ({ page }) => {
    const actorId = await createActor(page, { name: "Blessed Bard", type: "character" });

    const values = await toggleConditions(page, actorId, { blessed: true, inspired: true, hungry: true });

    expect(values).toMatchObject({ meleeAttack: 1, missileAttack: 1, save: -1 });
    expect(values.ac).toBe(2);
  });

  test("the attack throw lists each Condition next to the Actor Tweaks bonus", async ({ page }) => {
    const actorId = await createActor(page, {
      name: "Blind Swordsman",
      type: "character",
      system: { attack: { mod: { melee: 1 } } },
    });
    await toggleConditions(page, actorId, { blinded: true, charging: true });

    const { attack } = await buildMeleeAttack(page, actorId);

    expect(attack.modifiers).toContainEqual({ label: "Melee Throw Bonus", value: "+1" });
    expect(attack.modifiers).toContainEqual({ label: "Blinded", value: "-4" });
    expect(attack.modifiers).toContainEqual({ label: "Charging", value: "+2" });
    expect(attack.formula).toMatch(/\+ 1 - 4 \+ 2/);
  });

  test("the damage roll lists each Condition next to the Actor Tweaks bonus", async ({ page }) => {
    const actorId = await createActor(page, { name: "Queasy Brute", type: "monster" });
    await toggleConditions(page, actorId, { queasy: true });

    const { damage } = await buildMeleeAttack(page, actorId);

    expect(damage.modifiers).toContainEqual({ label: "Queasy", value: "-3" });
  });

  test("an effect that does not simply add shows as Other Effects, so the total still matches", async ({ page }) => {
    const actorId = await createActor(page, {
      name: "Doubled Duelist",
      type: "monster",
      system: { attack: { mod: { melee: 2 } } },
    });
    await page.evaluate(async (id) => {
      await game.actors.get(id).createEmbeddedDocuments("ActiveEffect", [
        {
          name: "Doubled Bonus",
          system: { changes: [{ key: "system.attack.mod.melee", type: "multiply", value: 2 }] },
        },
      ]);
    }, actorId);

    const { attack } = await buildMeleeAttack(page, actorId);

    expect(attack.modifiers).toContainEqual({ label: "Melee Throw Bonus", value: "+2" });
    expect(attack.modifiers).toContainEqual({ label: "Other Effects", value: "+2" });
    expect(attack.modifiers.map((m) => m.label)).not.toContain("Doubled Bonus");
  });
});

/**
 * Build a melee attack throw with a new 1d6 sword, as the Attack Throw dialog does.
 * @param {import("@playwright/test").Page} page
 * @param {string} actorId
 * @returns {Promise<{attack: TRollSpec, damage: TRollSpec}>}
 */
function buildMeleeAttack(page, actorId) {
  return page.evaluate(async (id) => {
    const { buildAttackThrow } = await import("/systems/acks/module/throw/attack-throw-builder.mjs");
    const actor = game.actors.get(id);
    const [weapon] = await actor.createEmbeddedDocuments("Item", [
      { name: "Sword", type: "weapon", system: { melee: true, damage: { base: { formula: "1d6" } } } },
    ]);
    const { attack, damage } = buildAttackThrow(actor, weapon, { attackType: "melee" });
    return { attack, damage };
  }, actorId);
}

/* global Actor */
import { expect, test } from "../support/foundry.mjs";

/** Expected modifier for each score from 1 to 27, per the ACKS II attribute modifier table. */
const EXPECTED = {
  1: -3,
  2: -3,
  3: -3,
  4: -2,
  5: -2,
  6: -1,
  8: -1,
  9: 0,
  12: 0,
  13: 1,
  15: 1,
  16: 2,
  17: 2,
  18: 3,
  19: 4,
  20: 5,
  21: 6,
  22: 7,
  23: 8,
  24: 9,
  25: 10,
  27: 10,
};

test.describe("attribute modifiers", () => {
  test("the shared lookup covers scores below 3 and above 18", async ({ page }) => {
    const modifiers = await page.evaluate(async (scores) => {
      const { default: CharacterData } = await import("/systems/acks/module/data/actor/character-data.mjs");
      return Object.fromEntries(scores.map((score) => [score, CharacterData.getAttributeModifier(Number(score))]));
    }, Object.keys(EXPECTED));

    expect(modifiers).toEqual(EXPECTED);
  });

  test("a character's score modifiers come from the same table", async ({ page }) => {
    const mods = await page.evaluate(async () => {
      const actor = await Actor.implementation.create({ name: "Mighty Fighter", type: "character" });
      await actor.update({
        "system.scores.str.value": 20,
        "system.scores.int.value": 3,
        "system.scores.wis.value": 9,
        "system.scores.dex.value": 18,
        "system.scores.con.value": 13,
        "system.scores.cha.value": 25,
      });
      return Object.fromEntries(Object.entries(actor.system.scores).map(([key, score]) => [key, score.mod]));
    });

    expect(mods).toEqual({ str: 5, int: -3, wis: 0, dex: 3, con: 1, cha: 10 });
  });

  test("score modifiers are derived data and follow Active Effects", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const actor = await Actor.implementation.create({ name: "Blessed Fighter", type: "character" });
      await actor.update({ "system.scores.str.value": 13 });
      const before = actor.system.scores.str.mod;
      await actor.createEmbeddedDocuments("ActiveEffect", [
        {
          name: "Giant Strength",
          system: { changes: [{ key: "system.scores.str.value", type: "add", value: "5" }] },
        },
      ]);
      return {
        stored: actor._source.system.scores.str,
        before,
        value: actor.system.scores.str.value,
        after: actor.system.scores.str.mod,
      };
    });

    expect(result.stored).toEqual({ value: 13 });
    expect(result).toMatchObject({ before: 1, value: 18, after: 3 });
  });

  test("the modifiers info dialog shows modifiers above 18", async ({ page }) => {
    const heading = await page.evaluate(async () => {
      const actor = await Actor.implementation.create({ name: "Mighty Fighter", type: "character" });
      await actor.update({ "system.scores.str.value": 20 });
      const { default: CharacterModifiersInfo } =
        await import("/systems/acks/module/apps/character-modifiers-info.mjs");
      const app = await new CharacterModifiersInfo({
        attributes: actor.toObject().system.scores,
        actorName: actor.name,
      }).render({ force: true });
      const text = app.element.querySelector("h2").textContent.trim();
      await app.close();
      return text;
    });

    expect(heading).toMatch(/: 20 \(\+5\)$/);
  });
});

/* global Actor, Scene, foundry */
import { expect, test } from "../support/foundry.mjs";

/**
 * Run the core status effects migration's updateActor on an actor source holding the given effects.
 * @param {import("@playwright/test").Page} page
 * @param {object[]} effects  ActiveEffect source data
 * @returns {Promise<object[]>} the effects after migration
 */
async function migrateEffects(page, effects) {
  return page.evaluate(async (effects) => {
    const { Migration6CoreStatusEffects } = await import("/systems/acks/module/migration/migrations/index.mjs");
    const source = { type: "monster", system: { _schemaVersion: 5 }, items: [], effects };
    await new Migration6CoreStatusEffects().updateActor(source);
    return foundry.utils.deepClone(source.effects);
  }, effects);
}

test.describe("core status effects migration", () => {
  test("a plain core status becomes the matching ACKS Condition and keeps its state", async ({ page }) => {
    const effects = await migrateEffects(page, [
      {
        _id: "sleepEffect00001",
        name: "Asleep",
        img: "icons/svg/sleep.svg",
        statuses: ["sleep"],
        disabled: true,
        duration: { rounds: 3 },
        flags: { world: { note: "kept" } },
      },
    ]);

    expect(effects).toEqual([
      {
        _id: "sleepEffect00001",
        name: "Slumbering",
        img: "icons/svg/sleep.svg",
        statuses: ["slumbering"],
        disabled: true,
        duration: { rounds: 3 },
        flags: { world: { note: "kept" } },
      },
    ]);
  });

  test("a plain core status is dropped when the actor already has the ACKS Condition", async ({ page }) => {
    const effects = await migrateEffects(page, [
      { _id: "blindedEffect001", name: "Blinded", img: "icons/svg/blind.svg", statuses: ["blinded"] },
      { _id: "blindEffect00001", name: "Blind", img: "icons/svg/blind.svg", statuses: ["blind"] },
    ]);

    expect(effects.map((e) => e._id)).toEqual(["blindedEffect001"]);
  });

  test("a custom effect gets its status ids remapped and keeps its own name and icon", async ({ page }) => {
    const custom = { _id: "potionEffect0001", name: "Potion of Woe", img: "icons/potion.webp" };
    const effects = await migrateEffects(page, [{ ...custom, statuses: ["blind", "deaf"] }]);

    expect(effects).toEqual([{ ...custom, statuses: ["blinded", "deafened"] }]);
  });

  test("an old ACKS Slumbering effect gets the current Slumbering image", async ({ page }) => {
    const effects = await migrateEffects(page, [
      { _id: "slumberEffect001", name: "Slumbering", img: "icons/svg/stoned.svg", statuses: ["slumbering"] },
    ]);

    expect(effects[0].img).toBe("icons/svg/sleep.svg");
  });

  test("statuses without an ACKS Condition and kept core statuses are left alone", async ({ page }) => {
    const untouched = [
      { _id: "stunEffect000001", name: "Stunned", img: "icons/svg/daze.svg", statuses: ["stun"] },
      { _id: "poisonEffect0001", name: "Poisoned", img: "icons/svg/poison.svg", statuses: ["poison"] },
      { _id: "deadEffect000001", name: "Dead", img: "icons/svg/skull.svg", statuses: ["dead"] },
      { _id: "invisibleEffect1", name: "Invisible", img: "icons/svg/invisible.svg", statuses: ["invisible"] },
    ];
    const effects = await migrateEffects(page, untouched);

    expect(effects).toEqual(untouched);
  });
});

test.describe("core status effects migration in the world", () => {
  test("the migration runner converts core statuses on world actors, token deltas and world compendiums", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { Migration6CoreStatusEffects } = await import("/systems/acks/module/migration/migrations/index.mjs");
      const { default: MigrationRunner } = await import("/systems/acks/module/migration/runner/migration-runner.mjs");
      const { CompendiumCollection } = foundry.documents.collections;

      const coreEffect = (id, img, data = {}) => ({ name: id, img, statuses: [id], ...data });
      // A schema version before the migration, so the runner picks these actors up.
      const legacyActor = (name, effects, items = []) => ({
        name,
        type: "monster",
        system: { _schemaVersion: 5 },
        items,
        effects,
      });
      const summarize = (effects) =>
        effects
          .map((e) => ({ name: e.name, img: e.img, statuses: [...e.statuses], disabled: e.disabled }))
          .sort((a, b) => a.name.localeCompare(b.name));

      const worldActor = await Actor.implementation.create(
        legacyActor(
          "Sleepy Orc",
          [
            coreEffect("sleep", "icons/svg/sleep.svg", { flags: { world: { note: "kept" } } }),
            coreEffect("blind", "icons/svg/blind.svg"),
            { name: "Blinded", img: "icons/svg/blind.svg", statuses: ["blinded"] },
            { name: "Potion of Woe", img: "icons/svg/acid.svg", statuses: ["deaf"] },
            coreEffect("stun", "icons/svg/daze.svg", { disabled: true }),
          ],
          [{ name: "Rope", type: "item", system: { _schemaVersion: 5 } }],
        ),
      );
      const sleepId = worldActor.effects.find((e) => e.statuses.has("sleep")).id;

      const scene = await Scene.implementation.create({ name: "Core Status Migration Scene", active: false });
      const tokenActor = await Actor.implementation.create(legacyActor("Goblin", []));
      const tokenData = await tokenActor.getTokenDocument({ actorLink: false });
      const [token] = await scene.createEmbeddedDocuments("Token", [tokenData.toObject()]);
      // Added after the token exists, so the token inherits it instead of copying it into its delta.
      await tokenActor.createEmbeddedDocuments("ActiveEffect", [coreEffect("stun", "icons/svg/daze.svg")]);
      await token.actor.createEmbeddedDocuments("ActiveEffect", [coreEffect("blind", "icons/svg/blind.svg")]);

      const pack = await CompendiumCollection.createCompendium({
        type: "Actor",
        label: "Core Status Migration Pack",
      });
      try {
        const [packActor] = await Actor.implementation.createDocuments(
          [legacyActor("Frightened Kobold", [coreEffect("fear", "icons/svg/terror.svg")])],
          { pack: pack.collection, keepId: true },
        );

        await new MigrationRunner([new Migration6CoreStatusEffects()]).runMigration();

        const slumbering = worldActor.effects.find((e) => e.statuses.has("slumbering"));
        const migratedToken = scene.tokens.get(token.id);
        const migratedPackActor = await pack.getDocument(packActor.id);
        return {
          world: {
            effects: summarize(worldActor.effects.contents),
            slumberingKeptId: slumbering?.id === sleepId,
            slumberingNote: slumbering?.flags.world?.note,
            statuses: [...worldActor.statuses].sort(),
            items: worldActor.items.map((i) => ({ name: i.name, schema: i._source.system._schemaVersion })),
          },
          token: {
            statuses: [...migratedToken.actor.statuses].sort(),
            deltaEffects: migratedToken.delta._source.effects.filter((e) => !e._tombstone).map((e) => e.statuses),
            baseActorEffects: tokenActor.effects.map((e) => [...e.statuses]),
          },
          packStatuses: [...migratedPackActor.statuses],
        };
      } finally {
        await pack.deleteCompendium();
        await scene.delete();
      }
    });

    expect(result.world).toEqual({
      effects: [
        { name: "Blinded", img: "icons/svg/blind.svg", statuses: ["blinded"], disabled: false },
        { name: "Potion of Woe", img: "icons/svg/acid.svg", statuses: ["deafened"], disabled: false },
        { name: "Slumbering", img: "icons/svg/sleep.svg", statuses: ["slumbering"], disabled: false },
        { name: "stun", img: "icons/svg/daze.svg", statuses: ["stun"], disabled: true },
      ],
      slumberingKeptId: true,
      slumberingNote: "kept",
      statuses: ["blinded", "deafened", "slumbering"],
      items: [{ name: "Rope", schema: 6 }],
    });
    // Only the delta's own effect changes; the base actor's stun stays inherited, not copied into the delta.
    expect(result.token).toEqual({
      statuses: ["blinded", "stun"],
      deltaEffects: [["blinded"]],
      baseActorEffects: [["stun"]],
    });
    expect(result.packStatuses).toEqual(["frightened"]);
  });
});

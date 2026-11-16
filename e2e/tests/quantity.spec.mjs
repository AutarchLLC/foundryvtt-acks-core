/* global Actor, DragEvent, Item, foundry, game */
import { createActor, expect, openActorSheet, test } from "../support/foundry.mjs";
import { migrateWorldFrom, readStored, reloadWorld, storeRaw } from "../support/stored-data.mjs";

/**
 * Physical Items and Money as stored before quantity became a plain whole number (schema 7):
 * gear held `quantity.value` (fractions allowed), weapons and armour had no quantity,
 * and money allowed fractional Carried and Banked coins.
 * @param {string} prefix  Makes the ids unique (16 characters in all)
 */
function legacyItems(prefix) {
  const system = (data) => ({ _schemaVersion: 7, ...data });
  return [
    { _id: `${prefix}Gear0000000`, name: "Rope", type: "item", system: system({ quantity: { value: 2.5 } }) },
    { _id: `${prefix}Weapon00000`, name: "Spear", type: "weapon", system: system({ weight6: 1 }) },
    { _id: `${prefix}Armor000000`, name: "Leather", type: "armor", system: system({ weight6: 6 }) },
    {
      _id: `${prefix}Money000000`,
      name: "Gold",
      type: "money",
      system: system({ coppervalue: 100, quantity: 12.7, quantitybank: 3.5 }),
    },
  ];
}

/**
 * The stored quantities a migrated copy of legacyItems() must hold.
 * @param {object[]} items  Stored item data
 */
function expectMigratedQuantities(items) {
  const byType = Object.fromEntries(items.map((item) => [item.type, item.system]));
  expect(byType.item.quantity).toBe(2);
  expect(byType.weapon.quantity).toBe(1);
  expect(byType.armor.quantity).toBe(1);
  expect(byType.money.quantity).toBe(12);
  expect(byType.money.quantitybank).toBe(3);
}

test.describe("quantity of new items", () => {
  test("new gear, weapons and armour hold one, and new money holds none", async ({ page }) => {
    const quantities = await page.evaluate(async () => {
      const result = {};
      for (const type of ["item", "weapon", "armor", "money"]) {
        const item = await Item.implementation.create({ name: `New ${type}`, type });
        result[type] = item.system.quantity;
      }
      return result;
    });

    expect(quantities).toEqual({ item: 1, weapon: 1, armor: 1, money: 0 });
  });
});

test.describe("quantity migration", () => {
  test("legacy world and actor-owned items store a whole-number quantity after migrating and reloading", async ({
    page,
  }) => {
    const worldItems = legacyItems("world");
    const actorItems = legacyItems("owned");
    await storeRaw(page, "Item", worldItems);
    await storeRaw(page, "Actor", [
      { _id: "quantityActor001", name: "Packer", type: "character", system: { _schemaVersion: 7 }, items: actorItems },
    ]);

    await migrateWorldFrom(page, 7);
    await reloadWorld(page);

    const stored = await Promise.all(worldItems.map((item) => readStored(page, "Item", item._id)));
    expectMigratedQuantities(stored);
    const actor = await readStored(page, "Actor", "quantityActor001");
    expectMigratedQuantities(actor.items);

    const loaded = await page.evaluate(() =>
      game.actors.get("quantityActor001").items.map((item) => [item.type, item.system.quantity]),
    );
    expect(Object.fromEntries(loaded)).toEqual({ item: 2, weapon: 1, armor: 1, money: 12 });
  });
});

test.describe("encumbrance", () => {
  test("weight is multiplied by quantity for gear, weapons and armour, and clothing adds none", async ({ page }) => {
    const encumbrance = await page.evaluate(async () => {
      const actor = await Actor.implementation.create({
        name: "Pack Mule",
        type: "character",
        items: [
          { name: "Javelins", type: "weapon", system: { weight6: 6, quantity: 3 } },
          { name: "Shields", type: "armor", system: { weight6: 6, quantity: 2 } },
          { name: "Torches", type: "item", system: { weight6: 1, quantity: 6 } },
          { name: "Cloaks", type: "item", system: { subtype: "clothing", weight6: 6, quantity: 4 } },
        ],
      });
      return actor.system.encumbrance.value6;
    });

    // 3 stone of javelins, 2 of shields, 1 of torches
    expect(encumbrance).toBe(6 * 6);
  });
});

test.describe("inventory rows", () => {
  test("editing quantity in the rows for gear, weapons, armour and money updates the item", async ({ page }) => {
    const actorId = await createActor(page, {
      name: "Quartermaster",
      type: "character",
      items: [
        { name: "Rations", type: "item" },
        { name: "Daggers", type: "weapon", system: { weight6: 6 } },
        { name: "Helmets", type: "armor", system: { weight6: 1 } },
        { name: "Silver", type: "money", system: { coppervalue: 10 } },
      ],
    });
    const sheet = await openActorSheet(page, actorId);
    await page.evaluate((id) => game.actors.get(id).sheet.changeTab("inventory", "primary"), actorId);

    /** @param {string} name  Item name */
    const row = (name) => sheet.locator(".tab[data-tab='inventory'] li[data-item-id]", { hasText: name });
    await expect(row("Daggers").locator('input[data-name="system.quantity"]')).toHaveValue("1");
    await expect(row("Helmets").locator('input[data-name="system.quantity"]')).toHaveValue("1");

    const edits = [
      ["Rations", "system.quantity", 4],
      ["Daggers", "system.quantity", 5],
      ["Helmets", "system.quantity", 2],
      ["Silver", "system.quantity", 30],
      ["Silver", "system.quantitybank", 70],
    ];
    for (const [name, field, value] of edits) {
      const input = row(name).locator(`input[data-name="${field}"]`);
      await input.fill(String(value));
      await input.blur();
      await expect
        .poll(() =>
          page.evaluate(
            ({ id, name, field }) => foundry.utils.getProperty(game.actors.get(id).items.getName(name), field),
            { id: actorId, name, field },
          ),
        )
        .toBe(value);
    }

    // the weight column shows weight × quantity: 5 daggers of 1 stone each
    await expect(row("Daggers").locator(".item__weight")).toHaveText("5");
  });
});

test.describe("item sheets", () => {
  for (const type of ["item", "weapon", "armor"]) {
    test(`the ${type} sheet edits quantity`, async ({ page }) => {
      const elementId = await page.evaluate(async (type) => {
        const item = await Item.implementation.create({ name: "Sheet Stack", type });
        await item.sheet.render({ force: true });
        // weapons keep their Details in a tab of their own
        if (type === "weapon") item.sheet.changeTab("details", "primary");
        return item.sheet.id;
      }, type);
      const input = page.locator(`#${elementId} input[name="system.quantity"]`);

      await expect(input).toBeVisible();
      await expect(input).toHaveValue("1");
      await input.fill("7");
      await input.blur();
      await expect.poll(() => page.evaluate(() => game.items.getName("Sheet Stack").system.quantity)).toBe(7);
    });
  }
});

test.describe("bundle drop", () => {
  test("a bundle entry becomes one item holding the entry's quantity, and money adds to the coins", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const [torch, gold] = await Item.implementation.createDocuments([
        { name: "Torch", type: "item", system: { weight6: 1 } },
        { name: "Gold", type: "money", system: { coppervalue: 100 } },
      ]);
      const entry = (item, quantity) => ({
        id: item.id,
        uuid: item.uuid,
        quantity,
        name: item.name,
        img: item.img,
        type: item.type,
        inCompendium: false,
      });
      const bundle = await Item.implementation.create({
        name: "Explorer's Kit",
        type: "bundle",
        system: { itemList: [entry(torch, 6), entry(gold, 25)] },
      });
      const actor = await Actor.implementation.create({
        name: "Explorer",
        type: "character",
        items: [{ name: "Torch", type: "item", system: { quantity: 2 } }],
      });

      // what dropping the bundle on the character sheet does
      await actor.sheet._onDropItem(new DragEvent("drop"), bundle);

      return {
        torches: actor.items.filter((i) => i.name === "Torch").map((i) => i.system.quantity),
        gold: actor.items.filter((i) => i.name === "Gold").map((i) => i.system.quantity),
      };
    });

    // the torches already carried are not merged into
    expect(result.torches.sort()).toEqual([2, 6]);
    expect(result.gold).toEqual([25]);
  });
});

test.describe("system compendiums", () => {
  test("every Physical Item and Money entry loads valid, with a whole-number quantity", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const invalid = [];
      const badQuantity = [];
      const check = (item) => {
        if (["item", "weapon", "armor", "money"].includes(item.type) && !Number.isInteger(item.system.quantity)) {
          badQuantity.push(item.uuid);
        }
      };
      for (const pack of game.packs.filter((p) => p.metadata.packageName === "acks")) {
        if (!["Item", "Actor"].includes(pack.documentName)) continue;
        const documents = await pack.getDocuments();
        invalid.push(...[...pack.invalidDocumentIds].map((id) => `${pack.collection}.${id}`));
        for (const document of documents) {
          if (pack.documentName === "Item") check(document);
          else document.items.forEach(check);
        }
      }
      return { invalid, badQuantity };
    });

    expect(result).toEqual({ invalid: [], badQuantity: [] });
  });
});

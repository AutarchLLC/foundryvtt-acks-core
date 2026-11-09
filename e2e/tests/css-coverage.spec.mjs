/* global acksCssStyleDiff, acksCssUsage, canvas, document, foundry, game, getComputedStyle, ui */
/**
 * CSS coverage tour. Not a regular test: run it by hand when cleaning up the system stylesheets.
 *
 *   ACKS_CSS_COVERAGE=1 npx playwright test -c e2e css-coverage
 *
 * It opens every sheet, tab, app, dialog and chat card and records which selectors of the system
 * stylesheets matched the live DOM (scripts/css-usage-tracker.js), written to css-usage/runtime.json
 * for `node scripts/css-usage.mjs`. At every step it also compares the computed style of every
 * element under the stylesheets from git ref ACKS_CSS_BASE (default `master`) and under the working
 * copy; any difference is written to css-usage/style-diff.json and fails the test.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { MODULE_PATH, SRC_NAME, styleSources } from "../../scripts/common.mjs";
import { ROOT } from "../scripts/foundry-env.mjs";
import { createActor, expect, openActorSheet, test } from "../support/foundry.mjs";

const ENABLED = process.env.ACKS_CSS_COVERAGE === "1";
const BASE_REF = process.env.ACKS_CSS_BASE || "master";
const OUT_DIR = path.join(ROOT, "css-usage");
const TRACKER = path.join(ROOT, "scripts", "css-usage-tracker.js");
// Time for renders, transitions and the tracker's debounced check to settle after each step.
const SETTLE_MS = 400;

/**
 * The system stylesheets listed in system.json, concatenated in load order, with relative `url()`s
 * made absolute so the text can be applied from an inline style element.
 * @param {string} [ref]  Git ref to read from; the working copy when omitted.
 * @returns {Promise<string>}
 */
async function readSystemCss(ref) {
  const read = async (file) =>
    ref
      ? execFileSync("git", ["show", `${ref}:${file}`], { cwd: ROOT, encoding: "utf8" })
      : fs.readFile(path.join(ROOT, file), "utf8");
  const manifest = JSON.parse(await read(MODULE_PATH));
  const sheets = [];
  for (const src of styleSources(manifest)) {
    const dir = path.posix.join("/systems/acks", path.posix.dirname(src));
    const css = await read(`${SRC_NAME}/${src}`);
    sheets.push(
      css.replace(/url\((["']?)(\.{1,2}\/[^)"']+)\1\)/g, (_, q, url) => `url(${q}${path.posix.join(dir, url)}${q})`),
    );
  }
  return sheets.join("\n");
}

/**
 * Install `acksCssStyleDiff` in the page: swaps the system stylesheets between the base and the
 * current ones and compares the computed style of every element under both.
 * Runs in the browser.
 * @param {{baseCss: string, currentCss: string}} css  Stylesheets at the base ref and in the working copy
 */
function installStyleDiff({ baseCss, currentCss }) {
  // Foundry v14 loads each system stylesheet with `@import "systems/acks/…" layer(system)`.
  const node = [...document.querySelectorAll("style")].find((s) => s.textContent.includes("systems/acks/"));
  if (!node) throw new Error("System stylesheet imports not found");
  const original = node.textContent;
  const props = [...getComputedStyle(document.body)].filter((p) => !/^(transition|animation)/.test(p));

  const use = (css) => {
    node.textContent = `@layer system {\n${css}\n}`;
  };
  const snapshot = (elements) =>
    elements.map((el) => {
      const style = getComputedStyle(el);
      const before = getComputedStyle(el, "::before");
      const after = getComputedStyle(el, "::after");
      return [
        ...props.map((p) => style.getPropertyValue(p)),
        before.content,
        before.fontFamily,
        before.color,
        after.content,
      ];
    });
  const names = [...props, "::before content", "::before font-family", "::before color", "::after content"];
  const describe = (el) => {
    const app = el.closest("[id]");
    return `${app ? `#${app.id} ` : ""}${el.tagName.toLowerCase()}${[...el.classList].map((c) => `.${c}`).join("")}`;
  };

  globalThis.acksCssStyleDiff = {
    /**
     * @returns {string[]}  One line per element whose computed style differs.
     */
    compare() {
      const elements = [...document.querySelectorAll("body *")];
      use(baseCss);
      const base = snapshot(elements);
      use(currentCss);
      const current = snapshot(elements);
      const diffs = [];
      elements.forEach((el, i) => {
        const changed = names
          .map((name, j) => (base[i][j] === current[i][j] ? null : `${name}: ${base[i][j]} -> ${current[i][j]}`))
          .filter(Boolean);
        if (changed.length) diffs.push(`${describe(el)} :: ${changed.slice(0, 5).join("; ")}`);
      });
      return diffs;
    },
    restore() {
      node.textContent = original;
    },
  };
}

/**
 * Close Foundry's onboarding tours; they pop up over the UI and intercept clicks.
 * @param {import("@playwright/test").Page} page
 */
function dismissTours(page) {
  return page.evaluate(async () => {
    foundry.nue.Tour.activeTour?.exit();
    for (const app of [...foundry.applications.instances.values()]) {
      if (app instanceof foundry.applications.api.DialogV2 && /tour/i.test(app.title))
        await app.close({ animate: false });
    }
  });
}

/**
 * Close every document sheet, app and dialog opened by the tour.
 * @param {import("@playwright/test").Page} page
 */
function closeWindows(page) {
  return page.evaluate(async () => {
    for (const app of [...foundry.applications.instances.values()]) {
      if (app.rendered && app.hasFrame) await app.close({ animate: false });
    }
  });
}

/**
 * Render a document's sheet and return a locator for it.
 * @param {import("@playwright/test").Page} page
 * @param {string} uuid
 */
async function openSheet(page, uuid) {
  const id = await page.evaluate(async (uuid) => {
    const sheet = (await foundry.utils.fromUuid(uuid)).sheet;
    await sheet.render({ force: true });
    return sheet.id;
  }, uuid);
  const sheet = page.locator(`#${id}`);
  await expect(sheet).toBeVisible();
  return sheet;
}

test.describe("CSS coverage tour", () => {
  test.skip(!ENABLED, "Set ACKS_CSS_COVERAGE=1 to run the CSS coverage tour");

  test("visits every sheet, app, dialog and chat card", async ({ page }) => {
    test.setTimeout(10 * 60_000);
    const css = { baseCss: await readSystemCss(BASE_REF), currentCss: await readSystemCss() };
    const styleDiffs = {};
    const visited = [];

    await page.addScriptTag({ path: TRACKER });
    await page.evaluate(installStyleDiff, css);

    /**
     * Run an action, let the UI settle, then record selector hits and style differences.
     * @param {string} label
     * @param {() => Promise<unknown>} [action]
     */
    const step = async (label, action) => {
      await dismissTours(page);
      if (action) await action();
      await page.waitForTimeout(SETTLE_MS);
      const diffs = await page.evaluate(async () => {
        acksCssUsage.check();
        return acksCssStyleDiff.compare();
      });
      if (diffs.length) styleDiffs[label] = diffs.slice(0, 25);
      visited.push(label);
    };

    /** Click through every primary tab of a sheet. */
    const visitTabs = async (label, sheet) => {
      const tabs = await sheet
        .locator('nav [data-group="primary"][data-tab]')
        .evaluateAll((els) => els.map((e) => e.dataset.tab));
      if (!tabs.length) await step(label);
      for (const tab of tabs) {
        await step(`${label}:${tab}`, () => sheet.locator(`nav [data-group="primary"][data-tab="${tab}"]`).click());
      }
    };

    try {
      // --- Actors --------------------------------------------------------------------------------
      const fighterId = await createActor(page, { name: "Coverage Fighter", type: "character" });
      const henchmanId = await createActor(page, { name: "Coverage Henchman", type: "character" });
      const orcId = await createActor(page, { name: "Coverage Orc", type: "monster" });
      await page.evaluate(
        async ({ fighterId, henchmanId, orcId }) => {
          const fighter = game.actors.get(fighterId);
          const orc = game.actors.get(orcId);
          await fighter.update({
            "system.spells.enabled": true,
            "system.details.xp.bonus": 10,
            "prototypeToken.actorLink": true,
            "prototypeToken.disposition": 1,
            "flags.acks.party": true,
          });
          await game.actors
            .get(henchmanId)
            .update({ "system.retainer.enabled": true, "prototypeToken.actorLink": true, "flags.acks.party": true });
          await fighter.addHenchman(henchmanId);
          const effect = { name: "Blessed", img: "icons/svg/aura.svg", changes: [] };
          const { DAMAGE_TYPE } = await import("/systems/acks/module/constants.mjs");
          const damage = (types, extraordinary = false) => ({ base: { formula: "1d6", types, extraordinary } });
          await fighter.createEmbeddedDocuments("Item", [
            // Every damage type, so all damage icons render.
            { name: "Sword", type: "weapon", system: { equipped: true, damage: damage(Object.values(DAMAGE_TYPE)) } },
            {
              name: "Longbow",
              type: "weapon",
              system: { missile: true, damage: damage([DAMAGE_TYPE.PIERCING], true) },
            },
            { name: "Chain Mail", type: "armor", system: { equipped: true } },
            { name: "Rope", type: "item", system: { quantity: { value: 2 } } },
            { name: "Anvil", type: "item", system: { weight6: 600 } },
            { name: "Magic Missile", type: "spell", system: { lvl: 1 } },
            { name: "Alertness", type: "ability" },
            { name: "Common", type: "language" },
            { name: "Gold", type: "money" },
            { name: "Backpack", type: "bundle" },
          ]);
          await fighter.createEmbeddedDocuments("ActiveEffect", [effect]);
          await fighter.items.getName("Sword").createEmbeddedDocuments("ActiveEffect", [effect]);
          await orc.update({ "prototypeToken.disposition": -1 });
          await orc.createEmbeddedDocuments("Item", [
            { name: "Axe", type: "weapon" },
            { name: "Ferocity", type: "ability" },
          ]);
          await orc.createEmbeddedDocuments("ActiveEffect", [effect]);
        },
        { fighterId, henchmanId, orcId },
      );

      await visitTabs("character", await openActorSheet(page, fighterId));
      await closeWindows(page);
      await visitTabs("henchman", await openActorSheet(page, henchmanId));
      await closeWindows(page);
      await visitTabs("monster", await openActorSheet(page, orcId));
      await closeWindows(page);

      // --- Item sheets ---------------------------------------------------------------------------
      const itemUuids = await page.evaluate(
        (ids) => ids.flatMap((id) => game.actors.get(id).items.map((i) => [`${i.type}:${i.name}`, i.uuid])),
        [fighterId, orcId],
      );
      for (const [label, uuid] of itemUuids) {
        await visitTabs(`item ${label}`, await openSheet(page, uuid));
        await closeWindows(page);
      }

      // --- Apps ----------------------------------------------------------------------------------
      const openApp = (file, options) =>
        page.evaluate(
          async ({ file, options, fighterId }) => {
            const actor = game.actors.get(fighterId);
            const resolved = Object.fromEntries(
              Object.entries(options).map(([k, v]) => [
                k,
                v === "$actor" ? actor : v === "$scores" ? actor.toObject().system.scores : v,
              ]),
            );
            const module = await import(`/systems/acks/module/apps/${file}`);
            const App = module.default ?? Object.values(module).find((v) => typeof v === "function");
            await new App(resolved).render({ force: true });
          },
          { file, options, fighterId },
        );
      await step("app modifiers info", () =>
        openApp("character-modifiers-info.mjs", { attributes: "$scores", actorName: "Coverage Fighter" }),
      );
      await step("app stat generator", () => openApp("character-stat-generator.mjs", { actor: "$actor" }));
      await step("app actor tweaks", () => openApp("actor-tweaks-config.mjs", { document: "$actor" }));
      await step("app party overview", () => openApp("party-overview-app.mjs", {}));
      await closeWindows(page);
      await step("app mortal wounds", () => openApp("character-mortal-wounds-app.mjs", { actor: "$actor" }));
      await step("chat mortal wounds result", () => page.locator(".mortal-wounds-app button[type=submit]").click());
      await closeWindows(page);
      await step("app tampering", () => openApp("character-tampering-mortality-app.mjs", { actor: "$actor" }));
      await step("chat tampering result", () => page.locator(".tampering-mortality-app button[type=submit]").click());
      await closeWindows(page);

      // --- Dialogs -------------------------------------------------------------------------------
      const dialogs = [
        ["confirmDeletion", []],
        ["confirm", ["Coverage", "<p>Coverage message</p>"]],
        ["confirmCombatActionDeclaration", []],
        ["showWelcomeMessage", []],
        ["inputNewQuantity", [3]],
        ["inputXPAmount", []],
        ["chooseMonsterHitDice", []],
        ["chooseItemNameAndType", []],
      ];
      for (const [name, args] of dialogs) {
        await step(`dialog ${name}`, () =>
          page.evaluate(
            async ({ name, args }) => {
              const ACKSDialog = await import("/systems/acks/module/dialog/index.mjs");
              void ACKSDialog[name](...args);
            },
            { name, args },
          ),
        );
        await closeWindows(page);
      }

      // --- Rolls and chat cards ------------------------------------------------------------------
      const rollWithDialog = async (label, call) => {
        await step(`roll dialog ${label}`, () => page.evaluate(call, { fighterId, orcId }));
        await step(`chat ${label}`, () =>
          page.locator("dialog.application").last().locator('button[data-action="ok"]').click(),
        );
      };
      await rollWithDialog("save", ({ fighterId }) => {
        void game.actors.get(fighterId).rollSave("paralysis");
      });
      await rollWithDialog("check", ({ fighterId }) => {
        void game.actors.get(fighterId).rollCheck("str");
      });
      await rollWithDialog("morale", ({ orcId }) => {
        void game.actors.get(orcId).rollMorale();
      });
      await closeWindows(page);
      await step("chat item cards", () =>
        page.evaluate(async (id) => {
          for (const item of game.actors.get(id).items) await item.showChatCard();
        }, fighterId),
      );

      // --- Scene: tokens, attack throws, combat, HUD ---------------------------------------------
      const [fighterToken, orcToken] = await page.evaluate(
        async (ids) => {
          const data = [];
          for (const [i, id] of ids.entries()) {
            const token = await game.actors.get(id).getTokenDocument({ x: 400 + i * 200, y: 400 });
            data.push(token.toObject());
          }
          return (await canvas.scene.createEmbeddedDocuments("Token", data)).map((t) => t.id);
        },
        [fighterId, orcId],
      );

      for (const [label, weapon] of [
        ["melee", "Sword"],
        ["missile", "Longbow"],
      ]) {
        await step(`dialog attack throw ${label}`, () =>
          page.evaluate(
            ({ fighterId, orcToken, weapon }) => {
              canvas.tokens.setTargets([orcToken]);
              const actor = game.actors.get(fighterId);
              void actor.makeAttackThrow({ item: actor.items.getName(weapon) });
            },
            { fighterId, orcToken, weapon },
          ),
        );
        await step(`chat attack throw ${label}`, () =>
          page.locator(".attack-throw-dialog button[type=submit]").click(),
        );
      }
      await page.evaluate(() => canvas.tokens.setTargets([]));

      await step("combat tracker", () =>
        page.evaluate(
          async (ids) => {
            const tokens = ids.map((id) => canvas.scene.tokens.get(id));
            await foundry.documents.TokenDocument.implementation.createCombatants(tokens);
            ui.sidebar.changeTab("combat", "primary");
          },
          [fighterToken, orcToken],
        ),
      );
      await step("surprise matrix", () => page.evaluate(() => void game.combat.startCombat()));
      await step("dialog surprise modifiers", () =>
        page.evaluate(async () => {
          const ACKSDialog = await import("/systems/acks/module/dialog/index.mjs");
          void ACKSDialog.inputIndividualSurpriseModifiers(game.combat.combatants.contents);
        }),
      );
      await closeWindows(page);
      await step("combat initiative", () => page.evaluate(() => game.combat.rollAll()));
      await step("token hud", () =>
        page.evaluate((id) => {
          const token = canvas.tokens.get(id);
          token.control();
          canvas.hud.token.bind(token);
        }, fighterToken),
      );
      await page.evaluate(() => canvas.hud.token.close());
      await step("chat log", () => page.evaluate(() => ui.sidebar.changeTab("chat", "primary")));

      // --- Dark theme ----------------------------------------------------------------------------
      const colorScheme = await page.evaluate(() => game.settings.get("core", "uiConfig").colorScheme);
      try {
        await page.evaluate(() =>
          game.settings.set("core", "uiConfig", {
            ...game.settings.get("core", "uiConfig"),
            colorScheme: { applications: "dark", interface: "dark" },
          }),
        );
        await visitTabs("dark character", await openActorSheet(page, fighterId));
        await closeWindows(page);
        await visitTabs("dark monster", await openActorSheet(page, orcId));
        await closeWindows(page);
        const swordUuid = itemUuids.find(([label]) => label === "weapon:Sword")[1];
        await visitTabs("dark item weapon:Sword", await openSheet(page, swordUuid));
        await closeWindows(page);
      } finally {
        await page.evaluate(
          (colorScheme) =>
            game.settings.set("core", "uiConfig", { ...game.settings.get("core", "uiConfig"), colorScheme }),
          colorScheme,
        );
      }
    } finally {
      const report = await page.evaluate(() => {
        acksCssUsage.stop();
        acksCssStyleDiff.restore();
        return acksCssUsage.report();
      });
      await page.evaluate(async () => {
        if (canvas.hud.token.rendered) await canvas.hud.token.close();
        const ids = canvas.scene?.tokens.map((t) => t.id) ?? [];
        if (ids.length) await canvas.scene.deleteEmbeddedDocuments("Token", ids);
      });
      await fs.mkdir(OUT_DIR, { recursive: true });
      await fs.writeFile(path.join(OUT_DIR, "runtime.json"), JSON.stringify(report, null, 2));
      await fs.writeFile(
        path.join(OUT_DIR, "style-diff.json"),
        JSON.stringify({ base: BASE_REF, visited, styleDiffs }, null, 2),
      );
      const hits = report.selectors.filter((s) => s.hit).length;
      process.stdout.write(
        `CSS coverage: ${hits} of ${report.selectors.length} selectors matched in ${visited.length} steps\n`,
      );
    }

    expect(styleDiffs, `computed styles differ from the stylesheets at ${BASE_REF}`).toEqual({});
  });
});

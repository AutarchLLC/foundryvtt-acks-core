/* global Actor, foundry, game */
import { test as base, expect } from "@playwright/test";
import { TEST_USER } from "../scripts/foundry-env.mjs";

/**
 * Log a page into the world as the given user and wait until Foundry is ready.
 * @param {import("@playwright/test").Page} page
 * @param {string} userName
 */
export async function joinWorld(page, userName) {
  await page.goto("/join");
  await page.locator("select[name=userId]").selectOption({ label: userName });
  await page.locator("button[name=join]").click();
  await page.waitForURL("**/game");
  await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 60_000 });
  // Chat pop-up notifications render asynchronously and throw if their message is deleted
  // mid-render (as resetWorld does), so only show the chat tab pip. This is a client setting.
  await page.evaluate(async () => {
    const uiConfig = game.settings.get("core", "uiConfig");
    await game.settings.set("core", "uiConfig", { ...uiConfig, chatNotifications: "pip" });
  });
}

/**
 * Bring the world back to a known state between tests: no world actors, items, chat
 * messages or combats, no open sheets or dialogs, and the game unpaused.
 * @param {import("@playwright/test").Page} page
 */
export async function resetWorld(page) {
  await page.evaluate(async () => {
    const { DialogV2, DocumentSheetV2 } = foundry.applications.api;
    for (const app of [...foundry.applications.instances.values()]) {
      if (app instanceof DialogV2 || app instanceof DocumentSheetV2) await app.close({ animate: false });
    }
    for (const collection of [game.combats, game.messages, game.actors, game.items]) {
      const ids = collection.map((d) => d.id);
      if (ids.length) await collection.documentClass.deleteDocuments(ids);
    }
    if (game.paused) game.togglePause(false, { broadcast: true });
  });
}

/**
 * @typedef {object} FoundryFixtures
 * @property {import("@playwright/test").Page} page  A GM page in a freshly reset world.
 * @property {string[]} pageErrors  Uncaught exceptions thrown in the page during this test.
 */

/**
 * Playwright `test` with Foundry fixtures. One GM login is shared by all tests in a worker
 * (joining takes several seconds); the world is reset before each test, and any uncaught
 * page exception fails the test.
 * @type {import("@playwright/test").TestType<FoundryFixtures, { gmPage: import("@playwright/test").Page }>}
 */
export const test = base.extend({
  gmPage: [
    async ({ browser }, use, workerInfo) => {
      const { baseURL, viewport } = workerInfo.project.use;
      const context = await browser.newContext({ baseURL, viewport });
      const page = await context.newPage();
      await joinWorld(page, TEST_USER);
      await use(page);
      await context.close();
    },
    { scope: "worker" },
  ],

  pageErrors: async ({ gmPage }, use) => {
    const errors = [];
    const onError = (error) => errors.push(error.stack ?? String(error));
    gmPage.on("pageerror", onError);
    await use(errors);
    gmPage.off("pageerror", onError);
  },

  page: async ({ gmPage, pageErrors }, use) => {
    await resetWorld(gmPage);
    await use(gmPage);
    expect(pageErrors, "uncaught exceptions in the page").toEqual([]);
  },
});

export { expect };

/**
 * Create a world actor and return its id.
 * @param {import("@playwright/test").Page} page
 * @param {object} data  Actor creation data
 * @returns {Promise<string>}
 */
export function createActor(page, data) {
  return page.evaluate(async (data) => (await Actor.implementation.create(data)).id, data);
}

/**
 * Render an actor's sheet and return a locator for its window.
 * @param {import("@playwright/test").Page} page
 * @param {string} actorId
 * @returns {Promise<import("@playwright/test").Locator>}
 */
export async function openActorSheet(page, actorId) {
  const elementId = await page.evaluate(async (id) => {
    const sheet = game.actors.get(id).sheet;
    await sheet.render({ force: true });
    return sheet.id;
  }, actorId);
  const sheet = page.locator(`#${elementId}`);
  await expect(sheet).toBeVisible();
  return sheet;
}

/**
 * Locator for an open DialogV2 window by its title.
 * @param {import("@playwright/test").Page} page
 * @param {string} title
 * @returns {import("@playwright/test").Locator}
 */
export function dialog(page, title) {
  return page.locator("dialog.application").filter({
    has: page.locator(".window-title", { hasText: title }),
  });
}

/**
 * Locator for the newest chat message in the sidebar chat log. Matches on the message id, as
 * ACKS chat templates nest their own `.chat-message` elements inside the message.
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<import("@playwright/test").Locator>}
 */
export async function latestChatMessage(page) {
  const id = await page.evaluate(() => game.messages.contents.at(-1)?.id);
  return page.locator(`#chat .chat-log li[data-message-id="${id}"]`);
}

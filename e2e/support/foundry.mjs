/* global Actor, Scene, canvas, fetch, foundry, game, localStorage */
import { test as base, expect } from "@playwright/test";
import { TEST_USER } from "../scripts/foundry-env.mjs";

/**
 * Log a page into the world as the given user and wait until Foundry is ready.
 * @param {import("@playwright/test").Page} page
 * @param {string} userName
 */
export async function joinWorld(page, userName) {
  await page.goto("/join");
  await skipTours(page);
  await page.locator("select[name=userId]").selectOption({ label: userName });
  await page.locator("button[name=join]").click();
  await page.waitForURL("**/game");
  await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 60_000 });
  // Both are client settings for UI that runs asynchronously and throws when resetWorld deletes what it
  // shows: chat pop-ups (only show the chat tab pip) and the text a status change floats over a token.
  await page.evaluate(async () => {
    const uiConfig = game.settings.get("core", "uiConfig");
    await game.settings.set("core", "uiConfig", { ...uiConfig, chatNotifications: "pip" });
    await game.settings.set("core", "scrollingStatusText", false);
  });
}

/**
 * JSON files of the tours Foundry core registers (`registerTours()` in `client/nue/_module.mjs`).
 */
const CORE_TOURS = {
  welcome: "welcome",
  installingASystem: "installing-a-system",
  creatingAWorld: "creating-a-world",
  backupsOverview: "backups-overview",
  compatOverview: "compatibility-preview-overview",
  uiOverview: "ui-overview",
  sidebar: "sidebar",
  canvasControls: "canvas-controls",
};

/**
 * Mark every core onboarding tour as completed for this browser, so none starts by itself.
 * In a new world Foundry starts the welcome tour a few seconds after `ready` (then offers a
 * follow-up tour), and its overlay intercepts clicks on whatever a test has open. Tour progress
 * is the client setting `core.tourProgress`, kept in localStorage and read when the tours are
 * registered before `ready`, so it must be written before joining. Call on the `/join` page.
 * @param {import("@playwright/test").Page} page
 */
async function skipTours(page) {
  await page.evaluate(async (tours) => {
    const core = {};
    for (const [id, file] of Object.entries(tours)) {
      // Relative to /join, so it honours a route prefix.
      const response = await fetch(`tours/${file}.json`);
      if (!response.ok) throw new Error(`Cannot load tour ${file}: ${response.status}`);
      // A tour is completed when its step index equals its step count.
      core[id] = (await response.json()).steps.length;
    }
    localStorage.setItem("core.tourProgress", JSON.stringify({ core }));
  }, CORE_TOURS);
}

/**
 * Bring the world back to a known state between tests: no scenes, world actors, items, chat
 * messages or combats, no open sheets, dialogs or token HUD, and the game unpaused.
 * @param {import("@playwright/test").Page} page
 */
export async function resetWorld(page) {
  // Tearing a scene down mid-animation throws.
  await page.waitForFunction(() => !Object.keys(foundry.canvas.animation.CanvasAnimation.animations).length);
  await page.evaluate(async () => {
    const { DialogV2, DocumentSheetV2 } = foundry.applications.api;
    for (const app of [...foundry.applications.instances.values()]) {
      if (app instanceof DialogV2 || app instanceof DocumentSheetV2) await app.close({ animate: false });
    }
    if (canvas.hud?.token?.rendered) await canvas.hud.token.close();
    // Combats before the scenes their combatants' tokens live on, scenes before the actors their tokens show.
    for (const collection of [game.combats, game.scenes, game.messages, game.actors, game.items]) {
      const ids = collection.map((d) => d.id);
      if (ids.length) await collection.documentClass.deleteDocuments(ids);
    }
    if (game.paused) game.togglePause(false, { broadcast: true });
  });
  // Deleting the viewed scene makes the canvas draw a blank one, asynchronously.
  await page.waitForFunction(() => !canvas.scene && !canvas.loading);
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
 * Place a token of a world actor on the viewed scene and wait until the canvas draws it. The first
 * call in a test creates and views a scene; `resetWorld` deletes it before the next test.
 * @param {import("@playwright/test").Page} page
 * @param {string} actorId
 * @param {object} [options]
 * @param {object} [options.token]  Token data merged over the actor's prototype token (default position 300, 300)
 * @param {object} [options.scene]  Scene creation data, used only when this call creates the scene
 * @returns {Promise<string>} the token id
 */
export async function placeToken(page, actorId, { token = {}, scene = {} } = {}) {
  const tokenId = await page.evaluate(
    async ({ actorId, token, scene }) => {
      let viewed = canvas.scene;
      if (!viewed) {
        viewed = await Scene.implementation.create({ name: "Test Scene", width: 1000, height: 1000, ...scene });
        await viewed.view();
      }
      const tokenData = await game.actors.get(actorId).getTokenDocument({ x: 300, y: 300, ...token });
      const [created] = await viewed.createEmbeddedDocuments("Token", [tokenData.toObject()]);
      return created.id;
    },
    { actorId, token, scene },
  );
  // `canvas.loading` stays true until the whole draw is done; `ready` turns true part way through it.
  await page.waitForFunction((id) => canvas.ready && !canvas.loading && !!canvas.tokens.get(id), tokenId);
  return tokenId;
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

/* global foundry, game */

/**
 * Helpers for tests that seed documents in their stored (raw) form, as an older system version left them in
 * the database, and check what a migration wrote back. Creating legacy documents through the document API would
 * clean them first: migrateData() would convert the legacy fields and the schema would drop them.
 */

/**
 * Write documents straight to the database, bypassing client-side cleaning and migration.
 * @param {import("@playwright/test").Page} page
 * @param {string} type  Document name
 * @param {object[]} data
 * @param {string} [pack]  Compendium collection id
 */
export function storeRaw(page, type, data, pack) {
  return page.evaluate(
    ({ type, data, pack }) =>
      foundry.helpers.SocketInterface.dispatch("modifyDocument", {
        type,
        action: "create",
        operation: { data, keepId: true, ...(pack ? { pack } : {}) },
      }),
    { type, data, pack },
  );
}

/**
 * Read a document's stored data straight from the database.
 * @param {import("@playwright/test").Page} page
 * @param {string} type  Document name
 * @param {string} id
 * @param {string} [pack]  Compendium collection id
 * @returns {Promise<object>}
 */
export function readStored(page, type, id, pack) {
  return page.evaluate(
    async ({ type, id, pack }) => {
      const response = await foundry.helpers.SocketInterface.dispatch("modifyDocument", {
        type,
        action: "get",
        operation: { query: { _id: id }, ...(pack ? { pack } : {}) },
      });
      return response.result[0];
    },
    { type, id, pack },
  );
}

/**
 * Reload the page and wait until Foundry is ready and no migration is pending.
 * @param {import("@playwright/test").Page} page
 */
export async function reloadWorld(page) {
  await page.reload();
  await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 60_000 });
  const currentVersion = await page.evaluate(
    async () => (await import("/systems/acks/module/migration/schema-version.mjs")).CURRENT_SCHEMA_VERSION,
  );
  // runMigrations() records the version only once the whole migration has finished.
  // The predicate must stay synchronous: a returned Promise counts as truthy.
  await page.waitForFunction(
    (version) => game.settings.get("acks", "systemSchemaVersion") === version,
    currentVersion,
    { timeout: 60_000 },
  );
}

/**
 * Pretend the world was last migrated at the given schema version, then load it, so the migration runs.
 * @param {import("@playwright/test").Page} page
 * @param {number} version
 */
export async function migrateWorldFrom(page, version) {
  await page.evaluate((version) => game.settings.set("acks", "systemSchemaVersion", version), version);
  await reloadWorld(page);
}

/* global game, ui */

import MigrationList from "./runner/migration-list.mjs";
import MigrationRunner from "./runner/migration-runner.mjs";

/**
 * The current data schema version.
 * Bump this to the highest *MigrationBase.version* number whenever you add a
 * new migration class. Must be a plain integer — matches the version numbers
 * used on individual MigrationBase subclasses in migration/migrations/.
 *
 * Documents whose system._schemaVersion === CURRENT_SCHEMA_VERSION are
 * considered fully migrated and are skipped by both the bulk migrator and
 * the migrateData() safety-net.
 *
 * @type {number}
 */
export const CURRENT_SCHEMA_VERSION = 3; // bump to highest migration version when you add migrations

/**
 * Run all pending data migrations.
 *
 * - Only the GM executes migrations.
 * - Gated by the "systemSchemaVersion" world setting; runs at most once per
 *   CURRENT_SCHEMA_VERSION bump.
 * - Covers: world actors + their embedded items, world items, and unlinked
 *   token deltas in every scene.
 * - Compendium packs must be migrated separately via JSON source edits:
 *     npm run packs:databaseToSource  → edit JSON  → npm run packs:sourceToDatabase
 */
export async function runMigrations() {
  if (!game.user.isGM) {
    return;
  }

  //await MigrationRunner.resetSchemaVersions(2); // FIXME: reset for testing; remove in production

  /** @type number */
  const worldSchemaVersion = game.settings.get("acks", "systemSchemaVersion") ?? 0;
  const migrations = MigrationList.fromVersionTo(worldSchemaVersion, CURRENT_SCHEMA_VERSION);
  const migrationRunner = new MigrationRunner(migrations);

  if (migrationRunner.needsMigration(worldSchemaVersion, CURRENT_SCHEMA_VERSION)) {
    console.info(`ACKS | Starting migration from schema v${worldSchemaVersion} to v${CURRENT_SCHEMA_VERSION}…`);
    const notice = ui.notifications.warn(`ACKS | Data migration in progress — do not close the browser.`, {
      permanent: true,
    });

    try {
      await migrationRunner.runMigration();

      await game.settings.set("acks", "systemSchemaVersion", CURRENT_SCHEMA_VERSION);

      console.info(`ACKS | Migration to schema v${CURRENT_SCHEMA_VERSION} complete.`);
      ui.notifications.info(`ACKS | Migration to schema v${CURRENT_SCHEMA_VERSION} complete.`);
    } catch (err) {
      console.error("ACKS | Migration failed:", err);
      ui.notifications.error("ACKS | Migration failed. See browser console for details.", {
        permanent: true,
      });
    } finally {
      ui.notifications.remove?.(notice);
    }
  }
}

/**
 * True when the given raw system data object is already at the current schema.
 * Call this at the top of every migrateData() override for a fast exit.
 *
 * @example
 * ```js
 * static migrateData(source) {
 *   if (isCurrentSchema(source)) return super.migrateData(source);
 *   // … field renames, type coercions …
 *   return super.migrateData(source);
 * }
 * ```
 * @param {object} source  Raw system data (the `source` arg of migrateData)
 * @returns {boolean}
 */
export function isCurrentSchema(source) {
  return (source?._schemaVersion ?? 0) >= CURRENT_SCHEMA_VERSION;
}

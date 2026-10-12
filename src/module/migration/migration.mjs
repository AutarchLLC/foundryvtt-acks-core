/* global game, ui */

import MigrationList from "./runner/migration-list.mjs";
import MigrationRunner from "./runner/migration-runner.mjs";
import { CURRENT_SCHEMA_VERSION, isCurrentSchema } from "./schema-version.mjs";

// CURRENT_SCHEMA_VERSION lives in schema-version.mjs (bump it there).
export { CURRENT_SCHEMA_VERSION, isCurrentSchema };

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

  //await MigrationRunner.resetSchemaVersions(CURRENT_SCHEMA_VERSION - 1); // FIXME: reset for testing; remove in production

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
 * FOR DEVELOPMENT ONLY!
 * Forcefully reset world schema version and run migration.
 * Useful when migrating compendium packs:
 * - Create and open new world.
 * - Import all content from a pack (saving documents IDs) into a world.
 * - Force migration.
 * - Delete content from pack.
 * - Export content from world back into compendium.
 * - Repeat for all packs.
 * ...
 * - Profit :)
 * @param {number} from
 * @return {Promise<void>}
 */
export async function forceWorldMigration(from = 0) {
  await MigrationRunner.resetSchemaVersions(from);
  await runMigrations();
}

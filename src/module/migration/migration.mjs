/* global game, Actor, Item, foundry, ui */

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
export const CURRENT_SCHEMA_VERSION = 1; // bump to highest migration version when you add migrations

// ─── Public API ──────────────────────────────────────────────────────────────

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

  await game.settings.set("acks", "systemSchemaVersion", 0); // FIXME: reset for testing; remove in production

  /** @type number */
  const worldSchemaVersion = game.settings.get("acks", "systemSchemaVersion") ?? 0;
  const migrations = MigrationList.afterVersion(worldSchemaVersion);
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

  //await _migrateSceneTokens();
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


async function _migrateSceneTokens() {
  for (const scene of game.scenes) {
    const tokenUpdates = [];

    for (const token of scene.tokens) {
      // Linked tokens derive their data from the world actor (migrated above).
      if (token.actorLink) continue;

      // Unlinked tokens store actor overrides in token.delta.
      // Only bother if the delta carries system data at all.
      const deltaObj = token.delta?.toObject?.() ?? {};
      if (!deltaObj.system || Object.keys(deltaObj.system).length === 0) continue;

      if (isCurrentSchema(deltaObj.system)) continue;

      // Deep-clone so we can mutate safely, then apply actor-level transforms.
      const system = foundry.utils.deepClone(deltaObj.system);
      const changed = _migrateActorSystemInPlace(system);
      if (changed) tokenUpdates.push({ _id: token.id, "delta.system": system });
    }

    if (tokenUpdates.length) {
      console.log(`ACKS | Migrating ${tokenUpdates.length} unlinked token(s) in scene "${scene.name}"…`);
      await scene.updateEmbeddedDocuments("Token", tokenUpdates);
    }
  }
}

/**
 * Mutate a raw system object in-place (for unlinked token deltas).
 * Must mirror the logic in _buildActorUpdate, but operates directly on the
 * object rather than building dot-notation update keys.
 *
 * @param {object} system  Raw system data, already deep-cloned
 * @returns {boolean}      True if any change was made
 */
function _migrateActorSystemInPlace(system) {
  if (isCurrentSchema(system)) return false;

  // ── MIRROR OF _buildActorUpdate LOGIC ────────────────────────────────────
  //
  // Example A — rename:
  //   if (system.saves?.wand && !system.saves?.implements) {
  //     system.saves.implements = { value: system.saves.wand.value };
  //     delete system.saves.wand;
  //   }
  //
  // ─────────────────────────────────────────────────────────────────────────

  system._schemaVersion = CURRENT_SCHEMA_VERSION;
  return true;
}

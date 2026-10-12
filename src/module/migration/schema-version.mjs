/**
 * Schema version constants, kept in a dependency-free module so data models can import them.
 * migration.mjs imports the migration classes, which import data models; importing migration.mjs
 * from BaseDataModel would make every data model part of that cycle.
 * Re-exported from migration.mjs.
 */

/**
 * The current data schema version.
 * Bump this to the highest *MigrationBase.version* number whenever you add a
 * new migration class. Must be a plain integer — matches the version numbers
 * used on individual MigrationBase subclasses in migration/migrations/.
 *
 * Documents whose system._schemaVersion === CURRENT_SCHEMA_VERSION are
 * considered fully migrated and are skipped by both the bulk migrator and
 * the migrateData() safety-net. New documents are stamped with it on creation
 * (see BaseDataModel#_preCreate).
 *
 * @type {number}
 */
export const CURRENT_SCHEMA_VERSION = 4; // bump to highest migration version when you add migrations

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

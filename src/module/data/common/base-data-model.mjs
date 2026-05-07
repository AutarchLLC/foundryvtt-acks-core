/* global foundry */

/**
 * Base Data Model. Every Data Model should extend it.
 * @see https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html
 * @see https://foundryvtt.wiki/en/development/api/DataModel
 * @see https://foundryvtt.com/article/system-data-models/
 */
export default class BaseDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { NumberField } = foundry.data.fields;

    return {
      // Schema version marker used by migration.mjs to detect already-migrated documents.
      // Never display or edit this field in sheets.
      _schemaVersion: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
    };
  }

  /**
   * Migrate source data towards the current data model schema.
   * Shared in-memory migrations that apply to all actor types (and are no-ops for items).
   * Acts as a safety net for freshly imported compendium documents that haven't gone
   * through the world migration runner yet.
   * @param {object} source  The candidate source data from which the model will be constructed.
   * @override
   */
  static migrateData(source) {
    // Migration 1: saves.wand → saves.implements, saves.breath → saves.blast
    if (source?.saves) {
      this._addDataFieldMigration(source.saves, "wand", "implements");
      this._addDataFieldMigration(source.saves, "breath", "blast");
    }

    return super.migrateData(source);
  }
}

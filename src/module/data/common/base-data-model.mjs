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
}

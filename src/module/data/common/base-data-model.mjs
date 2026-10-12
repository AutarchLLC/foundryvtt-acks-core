/* global foundry */
import { CURRENT_SCHEMA_VERSION } from "../../migration/schema-version.mjs";

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
      // The initial value must stay 0: Foundry fills it in for any stored document that lacks the field
      // (legacy data), and those must still be migrated. New documents are stamped in _preCreate instead.
      _schemaVersion: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
    };
  }

  /**
   * Migrate source data towards the current data model schema.
   * Acts as a safety net for freshly imported compendium documents that haven't gone
   * through the world migration runner yet.
   * @param {object} source  The candidate source data from which the model will be constructed.
   * @override
   */
  static migrateData(source) {
    return super.migrateData(source);
  }

  /**
   * Stamp new documents with the current schema version, so migrateData() and the migration runner
   * skip them.
   *
   * Creation data that already carries a `_schemaVersion` keeps it. Compendium imports, duplicates and
   * JSON imports are all built with `toObject()`, which always includes the field, so a document created
   * from old data keeps its old version and is still migrated.
   *
   * @param {object} data     The initial data object provided to the document creation request
   * @param {object} options  Additional options which modify the creation request
   * @param {User} user       The User requesting the document creation
   * @returns {Promise<boolean|void>}  A return value of false indicates the creation operation should be cancelled.
   * @override
   * @protected
   */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) {
      return false;
    }

    if (data.system?._schemaVersion !== undefined) {
      return;
    }
    const document = this.parent;
    document.updateSource({ "system._schemaVersion": CURRENT_SCHEMA_VERSION });

    // Items embedded in a new actor's creation data get no _preCreate call of their own. Foundry has
    // already filled in their missing _schemaVersion with 0 here, so only 0 is stamped; an explicit
    // older version is kept.
    (data.items ?? []).forEach((itemData, index) => {
      if (itemData.system?._schemaVersion) {
        return;
      }
      const item = document.items?.get(document._source.items[index]?._id);
      item?.updateSource({ "system._schemaVersion": CURRENT_SCHEMA_VERSION });
    });
  }
}

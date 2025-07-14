import itemDescriptionSchema from "../schema/item-description-schema.mjs";

/**
 * Language Item Data Model
 * @see https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html
 * @see https://foundryvtt.wiki/en/development/api/DataModel
 * @see https://foundryvtt.com/article/system-data-models/
 */
export default class LanguageData extends foundry.abstract.TypeDataModel {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @return {ItemDescriptionDataSchema} Language Item data schema
   * @override
   */
  static defineSchema() {
    return {
      ...itemDescriptionSchema(),
    };
  }
}

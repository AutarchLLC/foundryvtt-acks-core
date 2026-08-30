import itemDescriptionSchema from "./templates/item-description-schema.mjs";
import ItemBaseData from "./item-base-data.mjs";

/**
 * Language Item Data Model
 */
export default class LanguageData extends ItemBaseData {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @override
   * @return {ItemDescriptionDataSchema} Language Item data schema
   */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ...itemDescriptionSchema(),
    };
  }
}

import itemDescriptionSchema from "./templates/item-description-schema.mjs";
import BaseDataModel from "../common/base-data-model.mjs";

/**
 * Language Item Data Model
 */
export default class LanguageData extends BaseDataModel {
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

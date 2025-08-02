import itemDescriptionSchema from "../schema/item-description-schema.mjs";
import itemPhysicalSchema from "../schema/item-physical-schema.mjs";

/**
 * Armor Item Data Model
 * @see https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html
 * @see https://foundryvtt.wiki/en/development/api/DataModel
 * @see https://foundryvtt.com/article/system-data-models/
 */
export default class ArmorData extends foundry.abstract.TypeDataModel {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @return {{description: HTMLField, cost: NumberField, weight: NumberField, weight6: NumberField, aac, type, equipped}}
   */
  static defineSchema() {
    const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

    return {
      // common item description
      ...itemDescriptionSchema(),
      // cost and weight
      ...itemPhysicalSchema(),
      // Ascending AC value
      aac: new SchemaField({
        value: new NumberField({ initial: 0 }),
      }),
      // Armor type
      type: new StringField({ choices: CONFIG.ACKS.armor, required: true, initial: "light" }),
      // Is armor equipped
      equipped: new BooleanField({ initial: false }),
    };
  }
}

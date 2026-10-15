/* global foundry */
import itemDescriptionSchema from "./templates/item-description-schema.mjs";
import ItemPhysicalTemplate from "./templates/item-physical-template.mjs";
import { ACKS } from "../../config.mjs";
import { isCurrentSchema } from "../../migration/schema-version.mjs";
import ItemBaseData from "./item-base-data.mjs";

/**
 * Item Item Data Model :D:D:D
 */
export default class ItemData extends ItemBaseData {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @override
   * @return {{description: HTMLField, cost: NumberField, weight: NumberField, weight6: NumberField, subtype, quantity}}
   */
  static defineSchema() {
    const { NumberField, SchemaField, StringField } = foundry.data.fields;

    return {
      ...super.defineSchema(),
      // common item description
      ...itemDescriptionSchema(),
      // cost and weight
      ...ItemPhysicalTemplate.schema,
      // Item subtype. For now, it can be "item" or "clothing"
      subtype: new StringField({ choices: ACKS.item_subtypes, required: true, initial: "item" }),
      // item quantity
      quantity: new SchemaField({
        // current value
        value: new NumberField({ initial: 1, min: 0 }),
      }),
    };
  }

  /**
   * @inheritDoc
   * @override
   */
  static migrateData(source) {
    if (isCurrentSchema(source)) {
      return super.migrateData(source);
    }

    ItemPhysicalTemplate.migrateWeightToWeight6(source);

    return super.migrateData(source);
  }
}

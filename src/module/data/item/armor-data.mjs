/* global foundry */
import itemDescriptionSchema from "./templates/item-description-schema.mjs";
import ItemPhysicalTemplate from "./templates/item-physical-template.mjs";
import { ACKS } from "../../config.mjs";
import { isCurrentSchema } from "../../migration/migration.mjs";
import ItemBaseData from "./item-base-data.mjs";

/**
 * Armor Item Data Model
 */
export default class ArmorData extends ItemBaseData {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @override
   * @return {{description: HTMLField, cost: NumberField, weight: NumberField, weight6: NumberField, aac, type, equipped}}
   */
  static defineSchema() {
    const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

    return {
      ...super.defineSchema(),
      // common item description
      ...itemDescriptionSchema(),
      // cost and weight
      ...ItemPhysicalTemplate.schema,
      // Ascending AC value
      aac: new SchemaField({
        value: new NumberField({ initial: 0 }),
      }),
      // Armor type
      type: new StringField({ choices: ACKS.armor, required: true, initial: "light" }),
      // Is armor equipped
      equipped: new BooleanField({ initial: false }),
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

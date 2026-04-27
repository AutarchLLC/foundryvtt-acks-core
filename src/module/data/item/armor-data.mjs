/* global foundry */
import itemDescriptionSchema from "./templates/item-description-schema.mjs";
import itemPhysicalSchema from "./templates/item-physical-schema.mjs";
import { ACKS } from "../../config.mjs";
import BaseDataModel from "../common/base-data-model.mjs";

/**
 * Armor Item Data Model
 */
export default class ArmorData extends BaseDataModel {
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
      ...itemPhysicalSchema(),
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
}

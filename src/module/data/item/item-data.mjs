/* global foundry */
import itemDescriptionSchema from "./templates/item-description-schema.mjs";
import itemPhysicalSchema from "./templates/item-physical-schema.mjs";
import { ACKS } from "../../config.mjs";
import BaseDataModel from "../common/base-data-model.mjs";

/**
 * Item Item Data Model :D:D:D
 */
export default class ItemData extends BaseDataModel {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @override
   * @return {{description: HTMLField, cost: NumberField, weight: NumberField, weight6: NumberField, subtype, quantity, treasure, iconsource, iconlicense}}
   */
  static defineSchema() {
    const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

    return {
      ...super.defineSchema(),
      // common item description
      ...itemDescriptionSchema(),
      // cost and weight
      ...itemPhysicalSchema(),
      // Item subtype. For now, it can be "item" or "clothing"
      subtype: new StringField({ choices: ACKS.item_subtypes, required: true, initial: "item" }),
      // item quantity
      quantity: new SchemaField({
        // current value
        value: new NumberField({ initial: 1, min: 0 }),
        // max value
        max: new NumberField({ initial: 0, min: 0 }),
      }),
      //TODO: not used? remove?
      treasure: new BooleanField({ initial: false }),
      // TODO: not used anywhere. Remove and add license information to license file?
      iconsource: new StringField({ blank: true, initial: "" }),
      // TODO: not used anywhere. Remove and add license information to license file?
      iconlicense: new StringField({ blank: true, initial: "" }),
    };
  }
}

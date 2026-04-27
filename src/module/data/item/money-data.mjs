/* global foundry */
import itemDescriptionSchema from "./templates/item-description-schema.mjs";
import BaseDataModel from "../common/base-data-model.mjs";

/**
 * Money Item Data Model
 */
export default class MoneyData extends BaseDataModel {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @override
   * @return {{description: HTMLField, coppervalue, quantity, quantitybank, unitweight, totalvalue}}
   */
  static defineSchema() {
    const { NumberField } = foundry.data.fields;

    return {
      ...super.defineSchema(),
      // common item description
      ...itemDescriptionSchema(),
      // how much does it cost in copper pieces
      coppervalue: new NumberField({ required: true, initial: 1, positive: true, min: 1, nullable: false }),
      // how much you have on person
      quantity: new NumberField({ required: true, initial: 0, min: 0, nullable: false }),
      // how much you have in bank
      quantitybank: new NumberField({ required: true, initial: 0, min: 0, nullable: false }),
      // TODO: unused
      unitweight: new NumberField({ required: true, initial: 0, min: 0, nullable: false }),
      // total value (on person and in bank)
      // TODO: move to derived data? no point in storing in DB, we can calculate this on client
      totalvalue: new NumberField({ required: true, initial: 0, min: 0, nullable: false }),
    };
  }
}

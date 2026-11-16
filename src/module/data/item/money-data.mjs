/* global foundry */
import itemDescriptionSchema from "./templates/item-description-schema.mjs";
import ItemBaseData from "./item-base-data.mjs";
import { isCurrentSchema } from "../../migration/schema-version.mjs";

/**
 * Money Item Data Model
 */
export default class MoneyData extends ItemBaseData {
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
      // Carried coins: how much you have on person
      quantity: new NumberField({ required: true, initial: 0, min: 0, integer: true, nullable: false }),
      // Banked coins: how much you have in bank
      quantitybank: new NumberField({ required: true, initial: 0, min: 0, integer: true, nullable: false }),
      // TODO: unused
      unitweight: new NumberField({ required: true, initial: 0, min: 0, nullable: false }),
      // total value (on person and in bank)
      // TODO: move to derived data? no point in storing in DB, we can calculate this on client
      totalvalue: new NumberField({ required: true, initial: 0, min: 0, nullable: false }),
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

    this.migrateFractionalCoins(source);

    return super.migrateData(source);
  }

  /**
   * Round fractional Carried and Banked coins down to whole coins.
   * Safe on partial update data: only touches the fields that are present and fractional.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateFractionalCoins(source) {
    for (const key of ["quantity", "quantitybank"]) {
      if (typeof source[key] === "number" && !Number.isInteger(source[key])) {
        source[key] = Math.floor(source[key]);
      }
    }
  }
}

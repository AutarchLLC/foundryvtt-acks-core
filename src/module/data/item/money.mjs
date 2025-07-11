import itemDescriptionSchema from "../schema/item-description-schema.mjs";

/**
 * Money Item Data Model
 * @see https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html
 * @see https://foundryvtt.wiki/en/development/api/DataModel
 * @see https://foundryvtt.com/article/system-data-models/
 */
export default class MoneyData extends foundry.abstract.TypeDataModel {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @return {{description: HTMLField, coppervalue, quantity, quantitybank, unitweight, totalvalue}}
   */
  static defineSchema() {
    const { NumberField } = foundry.data.fields;

    return {
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

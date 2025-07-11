import itemDescriptionSchema from "../schema/item-description-schema.mjs";

/**
 * Item Item Data Model :D:D:D
 * @see https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html
 * @see https://foundryvtt.wiki/en/development/api/DataModel
 * @see https://foundryvtt.com/article/system-data-models/
 */
export default class ItemData extends foundry.abstract.TypeDataModel {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @return {{description: HTMLField, subtype, quantity, treasure, cost, weight, weight6, iconsource, iconlicense}}
   */
  static defineSchema() {
    const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

    return {
      // common item description
      ...itemDescriptionSchema(),
      // Item subtype. For now it can be "item" or "clothing"
      subtype: new StringField({ choices: CONFIG.ACKS.item_subtypes, required: true, initial: "item" }),
      // item quantity
      quantity: new SchemaField({
        // current value
        value: new NumberField({ initial: 1, min: 0 }),
        // max value
        max: new NumberField({ initial: 0, min: 0 }),
      }),
      //TODO: not used? remove?
      treasure: new BooleanField({ initial: false }),
      // item cost (in GP?)
      cost: new NumberField({ initial: 0, min: 0 }),
      // TODO: old weight handling? seems like it is not used anymore? maybe write migration and delete?
      weight: new NumberField({}),
      // weight in 1/6 stone
      weight6: new NumberField({}),
      // TODO: not used anywhere. Remove and add license information to license file?
      iconsource: new StringField({ blank: true, initial: "" }),
      // TODO: not used anywhere. Remove and add license information to license file?
      iconlicense: new StringField({ blank: true, initial: "" }),
    };
  }
}

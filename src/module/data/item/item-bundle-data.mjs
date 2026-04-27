/* global foundry */
import itemDescriptionSchema from "./templates/item-description-schema.mjs";
import BaseDataModel from "../common/base-data-model.mjs";

export default class ItemBundleData extends BaseDataModel {
  /**
   * @override
   */
  static defineSchema() {
    const { ArrayField, BooleanField, DocumentIdField, DocumentUUIDField, NumberField, SchemaField, StringField } =
      foundry.data.fields;

    return {
      ...super.defineSchema(),
      // common item description
      ...itemDescriptionSchema(),
      itemList: new ArrayField(
        new SchemaField({
          id: new DocumentIdField({ required: true }),
          uuid: new DocumentUUIDField({ required: true }),
          quantity: new NumberField({ integer: true, positive: true, initial: 1, required: true }),
          name: new StringField({ required: true }),
          img: new StringField({ required: true }),
          type: new StringField({ required: true }),
          inCompendium: new BooleanField({ required: true }),
        }),
      ),
    };
  }
}

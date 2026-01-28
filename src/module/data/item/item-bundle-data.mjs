import itemDescriptionSchema from "./templates/item-description-schema.mjs";

export default class ItemBundleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { ArrayField, BooleanField, DocumentIdField, DocumentUUIDField, NumberField, SchemaField, StringField } =
      foundry.data.fields;

    return {
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

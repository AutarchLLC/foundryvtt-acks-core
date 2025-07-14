import itemDescriptionSchema from "../schema/item-description-schema.mjs";
import itemPhysicalSchema from "../schema/item-physical-schema.mjs";

/**
 * Weapon Item Data Model
 * @see https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html
 * @see https://foundryvtt.wiki/en/development/api/DataModel
 * @see https://foundryvtt.com/article/system-data-models/
 */
export default class WeaponData extends foundry.abstract.TypeDataModel {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @return {{description: HTMLField, cost: NumberField, weight: NumberField, weight6: NumberField, range, favorite, save, pattern, damage, bonus, tags, slow, missile, melee, equipped, counter}}
   */
  static defineSchema() {
    const { ArrayField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

    return {
      // common item description
      ...itemDescriptionSchema(),
      // cost and weight
      ...itemPhysicalSchema(),
      // missile weapon ranges
      range: new SchemaField({
        short: new NumberField({ initial: 0, min: 0 }),
        medium: new NumberField({ initial: 0, min: 0 }),
        long: new NumberField({ initial: 0, min: 0 }),
      }),
      // is added to favorites
      favorite: new BooleanField({ initial: false }),
      // saving throw
      save: new StringField({ blank: true, initial: "" }),
      // attack pattern marker (currently used for monsters only)
      pattern: new StringField({ required: true, initial: "transparent" }),
      // damage formula
      damage: new StringField({ initial: "1d6" }),
      // attack throw bonus?
      bonus: new NumberField({ initial: 0 }),
      // weapon tags
      tags: new ArrayField(
        new SchemaField({
          title: new StringField(),
          value: new StringField(),
        }),
      ),
      // TODO: not used? is weapon slow?
      slow: new BooleanField({ initial: false }),
      // Is weapon ranged
      missile: new BooleanField({ initial: false }),
      // Is weapon melee
      melee: new BooleanField({ initial: false }),
      // Is weapon equipped
      equipped: new BooleanField({ initial: false }),
      // counter?
      counter: new SchemaField({
        // current value
        value: new NumberField({ initial: 0, min: 0 }),
        // max value
        max: new NumberField({ initial: 0, min: 0 }),
      }),
    };
  }
}

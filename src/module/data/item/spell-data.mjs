import itemDescriptionSchema from "../schema/item-description-schema.mjs";

/**
 * Spell Item Data Model
 * @see https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html
 * @see https://foundryvtt.wiki/en/development/api/DataModel
 * @see https://foundryvtt.com/article/system-data-models/
 */
export default class SpellData extends foundry.abstract.TypeDataModel {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @return {{description: HTMLField, favorite, lvl, class, duration, range, roll, memorized, cast, save}}
   */
  static defineSchema() {
    const { BooleanField, NumberField, StringField } = foundry.data.fields;

    return {
      // common item description
      ...itemDescriptionSchema(),
      // is added to favorites
      favorite: new BooleanField({ initial: false }),
      // spell level
      lvl: new NumberField({ initial: 1, min: 0, integer: true, required: true }),
      // Class the spell belongs to. Not really sure if we need this. Maybe use it for magic type? (Divine, Arcane, etc.)
      class: new StringField({ initial: "Magic-User", blank: true }),
      // spell duration
      duration: new StringField({ initial: "", blank: true }),
      // spell range
      range: new StringField({ initial: "", blank: true }),
      // spell roll
      roll: new StringField({ initial: "", blank: true }),
      // TODO: investigate, not sure, number of memorized spells? but why is it on spell itself?
      memorized: new NumberField({ initial: 0 }),
      // TODO: investigate, not sure, number of cast spells? but why is it on spell itself?
      cast: new NumberField({ initial: 0 }),
      // saving throw
      save: new StringField({ blank: true, initial: "" }),
    };
  }
}

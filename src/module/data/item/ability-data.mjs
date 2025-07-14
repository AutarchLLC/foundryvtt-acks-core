import itemDescriptionSchema from "../schema/item-description-schema.mjs";

/**
 * Ability / Proficiency Item Data Model
 * @see https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html
 * @see https://foundryvtt.wiki/en/development/api/DataModel
 * @see https://foundryvtt.com/article/system-data-models/
 */
export default class AbilityData extends foundry.abstract.TypeDataModel {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @return {{description: HTMLField, proficiencytype, favorite, pattern, requirements, roll, rollType, rollTarget, blindroll, save}}
   */
  static defineSchema() {
    const { BooleanField, NumberField, StringField } = foundry.data.fields;

    return {
      // common item description
      ...itemDescriptionSchema(),
      // proficiency type (general / class)
      proficiencytype: new StringField({ choices: CONFIG.ACKS.proficiencyType, required: true, initial: "general" }),
      // is added to favorites
      favorite: new BooleanField({ initial: false }),
      // ability pattern marker (currently used for monsters only)
      pattern: new StringField({ required: true, initial: "white" }),
      // Ability / Proficiency requirements
      requirements: new StringField({ blank: true, initial: "" }),
      // Ability roll. Usually 1d20
      roll: new StringField({ blank: true, initial: "1d20" }),
      // Type of roll (=, ≥, ≤), used to check roll against roll target
      rollType: new StringField({ choices: CONFIG.ACKS.roll_type, required: false, initial: "result" }),
      // Target for roll
      rollTarget: new NumberField({ initial: 0 }),
      // is this a blind GM roll?
      blindroll: new BooleanField({ initial: false }),
      // saving throw
      save: new StringField({ blank: true, initial: "" }),
    };
  }
}

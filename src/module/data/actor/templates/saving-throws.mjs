/* global foundry */
const { NumberField, SchemaField } = foundry.data.fields;

export default class SavingThrowsTemplate {
  /**
   * Saving Throws
   * @return {{saves: *}}
   */
  static get saves() {
    return {
      saves: new SchemaField({
        // Paralysis saving throw
        paralysis: new SchemaField({
          value: new NumberField({ required: true, initial: 13 }),
        }),
        // Death saving throw
        death: new SchemaField({
          value: new NumberField({ required: true, initial: 14 }),
        }),
        // Blast saving throw
        blast: new SchemaField({
          value: new NumberField({ required: true, initial: 15 }),
        }),
        // Implements saving throw
        implements: new SchemaField({
          value: new NumberField({ required: true, initial: 16 }),
        }),
        // Spells saving throw
        spell: new SchemaField({
          value: new NumberField({ required: true, initial: 17 }),
        }),
      }),
    };
  }

  /**
   * Saving throw bonus, configured via Actor Tweaks
   * @return {{save: *}}
   */
  static get save() {
    return {
      save: new SchemaField({
        mod: new NumberField({ initial: 0 }),
      }),
    };
  }

  /**
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateWandToImplements(source) {
    if (source.saves?.wand !== undefined && source.saves?.implements === undefined) {
      source.saves.implements = source.saves.wand;
    }
  }

  /**
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateBreathToBlast(source) {
    if (source.saves?.breath !== undefined && source.saves?.blast === undefined) {
      source.saves.blast = source.saves.breath;
    }
  }
}

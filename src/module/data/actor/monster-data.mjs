import actorCommonSchema from "./templates/actor-common-schema.mjs";
import actorSpellcasterSchema from "./templates/actor-spellcaster-schema.mjs";

/**
 * Monster Data Model
 *
 * @see https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html
 * @see https://foundryvtt.wiki/en/development/api/DataModel
 * @see https://foundryvtt.com/article/system-data-models/
 */
export default class MonsterData extends foundry.abstract.TypeDataModel {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @return {{isNew, retainer, hp, aac, damage, thac0, saves, save, movement, initiative, surprise, spells, details, attacks}}
   */
  static defineSchema() {
    const { NumberField, SchemaField, StringField } = foundry.data.fields;

    return {
      // common actor template
      ...actorCommonSchema(),
      // spellcaster actor template
      ...actorSpellcasterSchema(),
      // monster details
      details: new SchemaField({
        // biography rich text - notes tab for monster
        // TODO: maybe use HTMLField? rename?
        biography: new StringField({ blank: true, initial: "" }),
        // monster alignment
        alignment: new StringField({ blank: true, initial: "Neutral" }),
        // monster xp value
        xp: new NumberField({ initial: 0 }),
        treasure: new SchemaField({
          table: new StringField({ blank: true, initial: "" }),
          type: new StringField({ blank: true, initial: "" }), // TODO: remove treasure.type?
        }),
        // monster appearing formula?
        appearing: new SchemaField({
          // in dungeon
          d: new StringField({ blank: true, initial: "" }),
          // in wilderness
          w: new StringField({ blank: true, initial: "" }),
        }),
        // monster morale score, ranges from -6 to +4 (MM 12)
        morale: new NumberField({ integer: true, min: -6, max: 4, initial: 0 }),
      }),
      // TODO: not used, remove?
      attacks: new StringField({ blank: true, initial: "" }),
    };
  }

  static migrateData(source) {
    if (source?.details?.xp && foundry.utils.getType(source.details.xp) === "string") {
      source.details.xp = Number(source.details.xp) || 0;
    }

    if (source?.details?.morale && foundry.utils.getType(source.details.morale) === "string") {
      source.details.morale = Number(source.details.morale) || 0;
    }

    return super.migrateData(source);
  }
}

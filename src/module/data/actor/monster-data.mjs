/* global foundry, CONST */
import actorCommonSchema from "./templates/actor-common-schema.mjs";
import actorSpellcasterSchema from "./templates/actor-spellcaster-schema.mjs";
import BaseDataModel from "../common/base-data-model.mjs";

/**
 * Monster Data Model
 */
export default class MonsterData extends BaseDataModel {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @override
   * @return {{isNew, retainer, hp, aac, damage, thac0, saves, save, movement, initiative, surprise, spells, details, attacks}}
   */
  static defineSchema() {
    const { NumberField, SchemaField, StringField } = foundry.data.fields;

    return {
      ...super.defineSchema(),
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

  /**
   * Pre-process a creation operation for a single Document instance. Pre-operation events only occur for the client
   * which requested the operation.
   *
   * Modifications to the pending Document instance must be performed using <b>updateSource</b>.
   *
   * @param {object} data The initial data object provided to the document creation request
   * @param {object} options Additional options which modify the creation request
   * @param {BaseUser} user The User requesting the document creation
   * @return {Promise<boolean|void>} Return false to exclude this Document from the creation operation
   * @protected
   * @override
   */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) {
      return false;
    }

    // Default token prototype settings
    this.parent.updateSource({
      prototypeToken: {
        actorLink: false,
        disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE,
        sight: { enabled: true },
        displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER,
        displayName: CONST.TOKEN_DISPLAY_MODES.OWNER,
      },
    });
  }
}

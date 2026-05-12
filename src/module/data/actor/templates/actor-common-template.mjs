/* global foundry */
import { ACKS } from "../../../config.mjs";

const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

export default class ActorCommonTemplate {
  /**
   * Used to indicate new actor.
   * TODO: move to derived data, no need to store in DB
   * @return {{isNew: *}}
   */
  static get isNew() {
    return {
      isNew: new BooleanField({ initial: false }),
    };
  }
  /**
   * Retainer Data
   * @return {{retainer: *}}
   */
  static get retainer() {
    return {
      retainer: new SchemaField({
        // is actor a retainer? Configured via Actor Tweaks
        enabled: new BooleanField({ initial: false }),
        // loyalty score, can range from -4 to +4
        loyalty: new NumberField({ integer: true, min: -4, max: 4, initial: 0 }),
        // hireling's wage in GP.
        // TODO: Not sure why it is a String, maybe convert to Number?
        wage: new StringField({ blank: true, initial: "" }),
        // boss actor's id
        // TODO: maybe change to DocumentUUIDField?
        managerid: new StringField({ blank: true, initial: "" }),
        // hireling category (henchman / mercenary / specialist)
        category: new StringField({ choices: ACKS.hireling_categories, required: true, initial: "henchman" }),
        // number of hirelings of this type?
        quantity: new NumberField({ initial: 1 }),
      }),
    };
  }

  /**
   * Hit Points
   */
  static get hp() {
    return {
      hp: new SchemaField({
        // Hit Die formula
        hd: new StringField({ required: true, initial: "1d8", blank: false }),
        // Current HP value
        value: new NumberField({ required: true, initial: 4 }),
        // Max HP value
        max: new NumberField({ required: true, initial: 4 }),
        // Base Healing Rate I guess? RR 301 and JJ 401
        bhr: new StringField({ required: true, initial: "1d3", blank: false }),
      }),
    };
  }

  /**
   * Ascending Armor Class
   * @return {{aac: *}}
   */
  static get aac() {
    return {
      aac: new SchemaField({
        // AC Value
        value: new NumberField({ initial: 0 }),
        // AC bonus modifier, currently only set via Actor Tweaks
        mod: new NumberField({ initial: 0 }),
      }),
    };
  }

  /**
   * Actor's Damage Bonus, currently only set via Actor Tweaks
   * @return {{damage: *}}
   */
  static get damage() {
    return {
      damage: new SchemaField({
        mod: new SchemaField({
          missile: new NumberField({ initial: 0 }),
          melee: new NumberField({ initial: 0 }),
        }),
      }),
    };
  }

  /**
   * Attack values
   */
  static get thac0() {
    return {
      thac0: new SchemaField({
        // To Hit AC 0 value.
        // TODO: It never changes and is always 19. I think this is just a remnant of OSE attack handling
        value: new NumberField({ initial: 19 }),
        // no idea what this means. Base Attack Bonus maybe? (BAB)
        // TODO: no way to change this via UI. It is calculated as 10 - throw so move to derived data?
        bba: new NumberField({ initial: 0 }),
        // attack throw. currently only used to calculate bba
        throw: new NumberField({ required: true, initial: 10 }),
        // attack modifiers, configured via Actor Tweaks
        mod: new SchemaField({
          missile: new NumberField({ initial: 0 }),
          melee: new NumberField({ initial: 0 }),
        }),
      }),
    };
  }

  /**
   * Movement speed
   */
  static get movement() {
    return {
      movement: new SchemaField({
        // base movement speed. same as exploration speed I guess. Seems like remnant from OSE but used in monster sheet and
        // party overview
        base: new NumberField({ initial: 120 }),
        // movement modifier, configured via Actor Tweaks
        mod: new NumberField({ initial: 0 }),
        // used only in monster sheet now
        value: new StringField({}),
      }),
    };
  }

  /**
   * Initiative
   */
  static get initiative() {
    return {
      initiative: new SchemaField({
        // Initiative bonus (1d6 + value)
        value: new NumberField({ initial: 0 }),
        // Initiative bonus modifier, configured via Actor Tweaks
        mod: new NumberField({ initial: 0 }),
      }),
    };
  }

  /**
   * Surprise modifiers.
   * TODO: figure out and document this, it is very confusing
   */
  static get surprise() {
    return {
      surprise: new SchemaField({
        // mod can be set only for monsters.
        mod: new NumberField({ initial: 0 }), // TODO: not used, remove
        surpriseothers: new NumberField({ initial: 0 }),
        avoidsurprise: new NumberField({ initial: 0 }),
      }),
    };
  }
}

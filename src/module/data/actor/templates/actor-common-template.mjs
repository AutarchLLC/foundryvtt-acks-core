/* global foundry */
import { ACKS } from "../../../config.mjs";
import { CREATURE_SIZE, CREATURE_SIZE_CHOICES } from "../../../constants.mjs";
import MovementField from "../fields/movement-field.mjs";

const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

export default class ActorCommonTemplate {
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
   * Size of the creature, Man-Sized unless set otherwise. Independent of Body Weight.
   * @return {{size: StringField}}
   */
  static get size() {
    return {
      size: new StringField({
        required: true,
        blank: false,
        choices: CREATURE_SIZE_CHOICES,
        initial: CREATURE_SIZE.MAN_SIZED,
      }),
    };
  }

  /**
   * Body Weight: what the creature itself weighs, in sixths of a stone like item `weight6`; 15 stone by default.
   * Not carried weight: it adds nothing to encumbrance.
   * @return {{bodyWeight6: NumberField}}
   */
  static get bodyWeight6() {
    return {
      bodyWeight6: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 90 }),
    };
  }

  /**
   * Encumbrance: the creature's Normal Load, in sixths of a stone like item `weight6`; 5 stone by default.
   * The carried weight and Encumbrance Level are derived from it.
   * @param {object} [options]
   * @param {boolean} [options.persisted=true]  Store the Normal Load; a non-persisted one is rebuilt from its initial
   *   value on every data preparation and can still be changed by Active Effects
   * @return {{encumbrance: SchemaField}}
   */
  static encumbrance({ persisted = true } = {}) {
    return {
      encumbrance: new SchemaField({
        normalLoad6: new NumberField({
          required: true,
          nullable: false,
          integer: true,
          min: 0,
          initial: 30,
          persisted,
        }),
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
   * @return {{ac: *}}
   */
  static get ac() {
    return {
      ac: new SchemaField({
        // AC Value
        value: new NumberField({ initial: 0 }),
        // AC bonus modifier, currently only set via Actor Tweaks
        mod: new NumberField({ initial: 0 }),
      }),
    };
  }

  /**
   * Copy the old `aac` (ascending AC) field to `ac`.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateAacToAc(source) {
    if (source.aac !== undefined && source.ac === undefined) {
      source.ac = source.aac;
    }
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
  static get attack() {
    return {
      attack: new SchemaField({
        // attack throw
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
   * Copy the old `thac0` field to `attack`, leaving out its unused `value` and `bba`.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateThac0ToAttack(source) {
    if (source.thac0 !== undefined && source.attack === undefined) {
      const { value: _value, bba: _bba, ...attack } = source.thac0;
      source.attack = attack;
    }
  }

  /**
   * Movement: a Speed in every Movement Mode, see {@link MovementData}
   * @return {{movement: MovementField}}
   */
  static get movement() {
    return { movement: new MovementField({ required: true, nullable: false }) };
  }

  /**
   * Initiative
   */
  static get initiative() {
    return {
      initiative: new SchemaField({
        // Initiative bonus (1d6 + value) TODO: move to derived data, no need to store in DB
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
        surpriseothers: new NumberField({ initial: 0 }),
        avoidsurprise: new NumberField({ initial: 0 }),
      }),
    };
  }
}

/* global foundry, game, CONST */
import ActorCommonTemplate from "./templates/actor-common-template.mjs";
import actorSpellcasterSchema from "./templates/actor-spellcaster-schema.mjs";
import ActorBaseData from "./actor-base-data.mjs";
import SavingThrowsTemplate from "./templates/saving-throws.mjs";
import AttackModifiers from "./templates/attack-modifiers.mjs";
import { creatureTypesField } from "./templates/creature-types.mjs";
import { isCurrentSchema } from "../../migration/schema-version.mjs";
import { MovementData } from "./fields/movement-field.mjs";
import {
  ATTACK_TYPE,
  ATTRIBUTE_MODIFIERS,
  CREATURE_TYPE,
  ENCUMBRANCE_LEVEL,
  ITEM_TYPE,
  PHYSICAL_ITEM_TYPES,
} from "../../constants.mjs";

/**
 * Multiples of its Normal Load at which a character leaves Unencumbered, Low and Medium Encumbrance. Low Encumbrance
 * ends at 1.4 times rather than the Humanoid 1.5 times, to keep the 7-stone breakpoint (docs/adr/0004).
 */
const CHARACTER_LOAD_FACTORS = Object.freeze([1, 1.4, 2]);

/** Maximum Load as a multiple of Normal Load, before the STR modifier. */
const CHARACTER_MAX_LOAD_FACTOR = 4;

/**
 * Base Healing Rate by maximum hit points (RR 301): the entry with the highest threshold not above max HP applies.
 * Above the last threshold, every further 30 HP adds a d10.
 */
const BHR_TABLE = Object.freeze({
  0: "1d2",
  4: "1d3",
  10: "1d4",
  17: "1d6",
  24: "1d8",
  30: "1d10",
  37: "2d6",
  50: "2d8",
  64: "2d10",
  77: "2d12",
  90: "3d10",
  111: "4d10",
  141: "5d10",
  171: "6d10",
});

/**
 * Character Data Model
 *
 * Derived properties (not part of the stored schema, or overwritten in memory):
 * @property {number} ac.value  Armor Class: equipped armor and shields, DEX modifier and `ac.mod`
 * @property {number} ac.naked  Armor Class without armor or shield (the DEX modifier)
 * @property {number} ac.shield  Armor Class from equipped shields
 * @property {TEncumbrance} encumbrance  Carried weight, Maximum Load and Encumbrance Level; the Normal Load is
 *   never stored, but Active Effects can change it
 * @property {string} hp.bhr  Base Healing Rate formula, from max HP
 * @property {string} fight.healingrate  Same as `hp.bhr`, shown on the sheet
 * @property {TCreatureType[]} creatureTypes  Always Humanoid; not stored, but Active Effects can change it
 */
export default class CharacterData extends ActorBaseData {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @override
   * @return {{size, bodyWeight6, encumbrance, retainer, hp, ac, damage, attack, saves, save, movement, initiative, surprise, spells, henchmenList, details, adventuring, fight, scores}}
   */
  static defineSchema() {
    const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;

    return {
      ...super.defineSchema(),
      // common actor template
      // Creature Types: always Humanoid, never stored
      ...creatureTypesField({ persisted: false, initial: [{ type: CREATURE_TYPE.HUMANOID }] }),
      ...ActorCommonTemplate.size,
      ...ActorCommonTemplate.bodyWeight6,
      ...ActorCommonTemplate.retainer,
      ...ActorCommonTemplate.hp,
      ...ActorCommonTemplate.ac,
      ...ActorCommonTemplate.damage,
      ...ActorCommonTemplate.attack,
      ...ActorCommonTemplate.movement,
      ...ActorCommonTemplate.initiative,
      ...ActorCommonTemplate.surprise,
      // Saving Throws
      ...SavingThrowsTemplate.saves,
      ...SavingThrowsTemplate.save,

      // spellcaster actor template
      ...actorSpellcasterSchema(),
      // array of hireling actor ids that belong to this character
      // TODO: change to array of DocumentUUIDField
      henchmenList: new ArrayField(new StringField(), { required: true, initial: [] }),
      // character details
      details: new SchemaField({
        // biography rich text
        // TODO: maybe use HTMLField?
        biography: new StringField({ blank: true, initial: "" }),
        // Morale score. Can range from -4 to +4.
        // TODO: why is it here and not in retainer section?
        morale: new NumberField({ integer: true, min: -4, max: 4, initial: 0 }),
        // notes rich text
        // TODO: maybe use HTMLField?
        notes: new StringField({ blank: true, initial: "" }),
        // class name
        class: new StringField({ blank: true, initial: "" }),
        // title
        title: new StringField({ blank: true, initial: "" }),
        // Alignment.
        // TODO: system expects lawful / chaotic / neutral. maybe convert to choice?
        alignment: new StringField({ blank: true, initial: "Neutral" }),
        // level. should it be required?
        level: new NumberField({ initial: 1 }),
        // TODO: not used. remove?
        casterlevel: new NumberField({ initial: 0 }),
        // Age in years
        age: new NumberField({ initial: 18 }),
        // TODO: not used. remove?
        fatepoints: new NumberField({ initial: 0 }),
        xp: new SchemaField({
          // Experience Share percentage, configured in Actor Tweaks
          share: new NumberField({ required: true, initial: 100 }),
          // XP needed to reach next level
          // TODO: can configure both in Tweaks and Sheet. maybe leave only 1 place?
          next: new NumberField({ required: true, initial: 2000 }),
          // current XP value
          value: new NumberField({ required: true, initial: 0 }),
          // bonus XP received, percentage, configured in Actor Tweaks
          bonus: new NumberField({ required: true, initial: 0 }),
        }),
      }),
      // Adventuring proficiency throws
      adventuring: new SchemaField({
        dungeonbashing: new NumberField({ initial: 18 }),
        climb: new NumberField({ initial: 8 }),
        listening: new NumberField({ initial: 18 }),
        searching: new NumberField({ initial: 18 }),
        trapbreaking: new NumberField({ initial: 18 }),
      }),
      fight: new SchemaField({
        // Base Healing Rate formula
        // TODO: what about common hp.bhr?
        healingrate: new StringField({ initial: "1d3" }),
        // number of mortal wounds?
        mortalwounds: new NumberField({ initial: 0 }),
        // number of cleaves
        cleaves: new NumberField({ initial: 0 }),
      }),
      // CHARACTER ATTRIBUTES
      scores: new SchemaField({
        // Strength (STR)
        str: new SchemaField({
          value: new NumberField({ required: true, initial: 10 }),
        }),
        // Intellect (INT)
        int: new SchemaField({
          value: new NumberField({ required: true, initial: 10 }),
        }),
        // Will (WIL)
        wis: new SchemaField({
          value: new NumberField({ required: true, initial: 10 }),
        }),
        // Dexterity (DEX)
        dex: new SchemaField({
          value: new NumberField({ required: true, initial: 10 }),
        }),
        // Constitution (CON)
        con: new SchemaField({
          value: new NumberField({ required: true, initial: 10 }),
        }),
        // Charisma (CHA)
        cha: new SchemaField({
          value: new NumberField({ required: true, initial: 10 }),
        }),
      }),
      // Normal Load: always 5 stone, never stored; house rules change it with Active Effects
      ...ActorCommonTemplate.encumbrance({ persisted: false }),
    };
  }

  //region ATTACKS

  //region DERIVED DATA

  /**
   * Derive the character's stats, after Active Effects are applied. Order matters: AC and initiative need the
   * score modifiers, movement needs encumbrance.
   * @override
   * @protected
   */
  _prepareTypeData() {
    for (const score of Object.values(this.scores)) {
      score.mod = CharacterData.getAttributeModifier(score.value);
    }
    this.#prepareAC();
    this.#prepareEncumbrance();
    this.#prepareBHR();
  }

  /**
   * The DEX modifier adds to initiative.
   * @override
   * @protected
   */
  get _initiativeBonus() {
    return this.scores.dex.mod;
  }

  /**
   * Armor Class from equipped armor and shields. An armor without an AC value (e.g. a helmet) adds 0.
   */
  #prepareAC() {
    let baseAC = 0;
    let shieldAC = 0;
    this.ac.naked = this.scores.dex.mod;
    for (const item of this.parent.items) {
      if (item.type !== ITEM_TYPE.ARMOR || !item.system.equipped) continue;
      const ac = item.system.ac.value ?? 0;
      if (item.system.type === "shield") shieldAC += ac;
      else baseAC += ac;
    }
    this.ac.value = baseAC + this.scores.dex.mod + shieldAC + this.ac.mod;
    this.ac.shield = shieldAC;
  }

  /**
   * Encumbrance: carried weight of physical items (clothing excluded) and coins, and the Encumbrance Level it
   * reaches. A character reaches each level at a multiple of its Normal Load, see {@link CHARACTER_LOAD_FACTORS};
   * its Maximum Load is four times its Normal Load plus its STR modifier in stone.
   */
  #prepareEncumbrance() {
    let value6 = 0;
    for (const item of this.parent.items) {
      const isClothing = item.type === ITEM_TYPE.ITEM && item.system.subtype === "clothing";
      if (PHYSICAL_ITEM_TYPES.includes(item.type) && !isClothing) {
        value6 += item.system.weight6 * item.system.quantity;
      }
    }
    value6 += this.getTotalMoneyEncumbrance().stone * 6;

    const normalLoad6 = this.encumbrance.normalLoad6;
    const max6 = Math.max(0, CHARACTER_MAX_LOAD_FACTOR * normalLoad6 + this.scores.str.mod * 6);
    const breakpoints6 = CHARACTER_LOAD_FACTORS.map((factor) => factor * normalLoad6);
    const percentOfMax = (weight6) => (max6 > 0 ? Math.clamp((weight6 / max6) * 100, 0, 100) : 100);

    let level;
    if (value6 > max6) {
      level = ENCUMBRANCE_LEVEL.OVERBURDENED;
    } else {
      const index = breakpoints6.findIndex((breakpoint6) => value6 <= breakpoint6);
      level = index === -1 ? ENCUMBRANCE_LEVEL.HIGH : index;
    }

    Object.assign(this.encumbrance, {
      level,
      value6,
      max6,
      value: Math.round(value6 / 6),
      max: max6 / 6,
      pct: percentOfMax(value6),
      encumbered: level === ENCUMBRANCE_LEVEL.OVERBURDENED,
      breakpoints: {
        low: percentOfMax(breakpoints6[0]),
        mid: percentOfMax(breakpoints6[1]),
        high: percentOfMax(breakpoints6[2]),
      },
    });
  }

  /**
   * Base Healing Rate from max HP, see {@link BHR_TABLE}.
   */
  #prepareBHR() {
    const maxHP = Number(this.hp.max);
    let bhr;
    if (maxHP > 171) {
      bhr = Math.floor((maxHP - 171) / 30) + 6 + "d10";
    } else {
      bhr = CharacterData.#valueFromTable(BHR_TABLE, maxHP);
    }
    bhr ||= "1d2";
    this.hp.bhr = bhr;
    this.fight.healingrate = bhr;
  }

  /**
   * Value of the entry with the highest numeric key not above `value`; the first entry when none is.
   * @param {Record<number, string>} table
   * @param {number} value
   * @return {string|undefined}
   */
  static #valueFromTable(table, value) {
    let output;
    for (let i = 0; i <= value; i++) {
      if (table[i] !== undefined) {
        output = table[i];
      }
    }
    if (output === undefined) {
      // Take the first key/value of the table object, whatever it is
      for (const key in table) {
        output = table[key];
        break;
      }
    }
    return output;
  }

  //endregion DERIVED DATA

  /**
   * Modifier granted by an attribute score (STR, INT, WIL, DEX, CON, CHA).
   * @param {number} score  Attribute score value
   * @return {number} Modifier from {@link ATTRIBUTE_MODIFIERS}; -3 below the table, +10 above it
   */
  static getAttributeModifier(score) {
    let modifier = ATTRIBUTE_MODIFIERS[3];
    for (const [threshold, value] of Object.entries(ATTRIBUTE_MODIFIERS)) {
      if (score >= Number(threshold)) {
        modifier = value;
      }
    }
    return modifier;
  }

  /**
   * Attack throw modifiers from this character: STR for melee, DEX for missile and thrown, plus Actor Tweaks and Active Effects.
   * @param {ATTACK_TYPE} attackType
   * @return {TNumValueWithLabel[]}
   */
  getAttackThrowModifiers(attackType) {
    const ability = attackType === ATTACK_TYPE.MELEE ? "str" : "dex";
    return [this.#getAbilityModifier(ability), ...AttackModifiers.getAttackThrowModifiers(this, attackType)];
  }

  /**
   * Damage modifiers from this character: STR for melee and thrown (not missile), plus Actor Tweaks and Active Effects.
   * @param {ATTACK_TYPE} attackType
   * @return {TNumValueWithLabel[]}
   */
  getDamageModifiers(attackType) {
    const modifiers = [];
    if (attackType === ATTACK_TYPE.MELEE || attackType === ATTACK_TYPE.THROWN) {
      modifiers.push(this.#getAbilityModifier("str"));
    }
    modifiers.push(...AttackModifiers.getDamageModifiers(this, attackType));
    return modifiers;
  }

  /**
   * @param {"str"|"dex"} ability
   * @return {TNumValueWithLabel}
   */
  #getAbilityModifier(ability) {
    return {
      label: game.i18n.format("ACKS.throw.modifier.ability", {
        ability: game.i18n.localize(`ACKS.scores.${ability}.short`),
      }),
      value: this.scores[ability].mod,
    };
  }

  //endregion ATTACKS

  /**
   * @override
   * @inheritDoc
   */
  static migrateData(source) {
    if (isCurrentSchema(source)) {
      return super.migrateData(source);
    }

    // Migration 1: saves.wand → saves.implements, saves.breath → saves.blast
    SavingThrowsTemplate.migrateWandToImplements(source);
    SavingThrowsTemplate.migrateBreathToBlast(source);

    // Migration 5: thac0 → attack, aac → ac
    ActorCommonTemplate.migrateThac0ToAttack(source);
    ActorCommonTemplate.migrateAacToAc(source);

    // Migration 11: old movement fields → Speeds by Movement Mode
    MovementData.migrateInMemory(source, MovementData.migrateCharacterMovement);

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
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        sight: { enabled: true },
        displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER,
        displayName: CONST.TOKEN_DISPLAY_MODES.OWNER,
      },
    });
  }
}

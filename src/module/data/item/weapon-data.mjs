/* global foundry, game */
import itemDescriptionSchema from "./templates/item-description-schema.mjs";
import ItemPhysicalTemplate from "./templates/item-physical-template.mjs";
import BaseDataModel from "../common/base-data-model.mjs";
import { isCurrentSchema } from "../../migration/migration.mjs";
import {
  HB_PARTIAL_NAME,
  SAVING_THROW_CHOICES,
  WEAPON_CATEGORY,
  WEAPON_CATEGORY_CHOICES,
  WEAPON_SIZE,
  WEAPON_SIZE_CHOICES,
} from "../../constants.mjs";
import SavingThrowsTemplate from "../actor/templates/saving-throws.mjs";
import WeaponCustomTagsTemplate from "./templates/weapon-custom-tags-template.mjs";
import DamageField from "./fields/damage-field.mjs";

/**
 * Weapon Item Data Model
 * @see https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html
 * @see https://foundryvtt.wiki/en/development/api/DataModel
 * @see https://foundryvtt.com/article/system-data-models/
 */
export default class WeaponData extends BaseDataModel {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @override
   */
  static defineSchema() {
    const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

    return {
      ...super.defineSchema(),
      // common item description
      ...itemDescriptionSchema(),
      // cost and weight
      ...ItemPhysicalTemplate.schema,
      // missile weapon ranges
      range: new SchemaField({
        short: new NumberField({ initial: 0, min: 0 }),
        medium: new NumberField({ initial: 0, min: 0 }),
        long: new NumberField({ initial: 0, min: 0 }),
      }),
      // is added to favorites
      favorite: new BooleanField({ initial: false }),
      // attack pattern marker (currently used for monsters only)
      pattern: new StringField({ required: true, initial: "transparent" }),
      // attack throw bonus?
      bonus: new NumberField({ initial: 0 }),
      // Is weapon equipped
      equipped: new BooleanField({ initial: false }),
      // counter?
      counter: new SchemaField({
        // current value
        value: new NumberField({ initial: 0, min: 0 }),
        // max value
        max: new NumberField({ initial: 0, min: 0 }),
      }),

      // ACKS II
      size: new StringField({
        required: true,
        nullable: false,
        blank: false,
        choices: WEAPON_SIZE_CHOICES,
        initial: WEAPON_SIZE.MEDIUM,
        label: "ACKS.weapon.label.size",
      }),
      category: new StringField({
        required: true,
        nullable: false,
        blank: false,
        choices: WEAPON_CATEGORY_CHOICES,
        initial: WEAPON_CATEGORY.OTHER,
        label: "ACKS.weapon.label.category",
      }),
      // Is weapon melee
      melee: new BooleanField({ initial: true, label: "ACKS.items.Melee" }),
      // Is weapon missile
      missile: new BooleanField({ initial: false, label: "ACKS.items.Missile" }),
      // saving throw
      save: new StringField({ blank: true, choices: SAVING_THROW_CHOICES, initial: "", label: "ACKS.spells.Save" }),
      // special weapon properties (RR 127)
      special: new SchemaField({
        cleave: new BooleanField({ initial: false, label: "ACKS.weapon.label.cleave" }),
        entangling: new BooleanField({ initial: false, label: "ACKS.weapon.label.entangling" }),
        flexible: new BooleanField({ initial: false, label: "ACKS.weapon.label.flexible" }),
        handy: new BooleanField({ initial: false, label: "ACKS.weapon.label.handy" }),
        impact: new BooleanField({ initial: false, label: "ACKS.weapon.label.impact" }),
        incapacitating: new BooleanField({ initial: false, label: "ACKS.weapon.label.incapacitating" }),
        long: new BooleanField({ initial: false, label: "ACKS.weapon.label.long" }),
        mounted: new BooleanField({ initial: false, label: "ACKS.weapon.label.mounted" }),
        silver: new BooleanField({ initial: false, label: "ACKS.weapon.label.silver" }),
        slow: new BooleanField({ initial: false, label: "ACKS.weapon.label.slow" }),
        thrown: new BooleanField({ initial: false, label: "ACKS.weapon.label.thrown" }),
      }),
      // cleave limit
      cleaveLimit: new SchemaField({
        numeric: new NumberField({ initial: 2, integer: true, label: "Cleave Limit" }),
        addStrMod: new BooleanField({ initial: false, label: "Add STR mod to Cleave Limit" }),
      }),
      // weapon damage
      damage: new SchemaField({
        base: new DamageField(),
        twoHanded: new DamageField(),
      }),
      // custom tags
      ...WeaponCustomTagsTemplate.schema,
    };
  }

  //region DERIVED PROPERTIES

  /**
   * Whether this weapon is a ranged weapon, determined by the `missile` property or the `thrown` special property.
   * @return {boolean}
   */
  get isRanged() {
    return this.missile || this.special?.thrown;
  }

  /**
   * Whether this weapon has Two-Handed damage formula.
   * @return {boolean}
   */
  get hasTwoHandedDamage() {
    return (this.size === WEAPON_SIZE.MEDIUM || this.size === WEAPON_SIZE.LARGE) && this.melee;
  }

  /**
   * Returns the partial name for the weapon description template.
   * @return {string}
   */
  get descriptionPartialName() {
    return HB_PARTIAL_NAME.ITEM_WEAPON_DESC;
  }

  /** @override */
  prepareDerivedData() {
    // we don't call prepareDerivedData on `damage.twoHanded` cause we only care about damage formula from it.
    this.damage.base.prepareDerivedData();

    this.tags = {
      properties: this.generatePropertiesTags(),
      special: this.generateSpecialTags(),
      custom: this.generateCustomTags(),
    };

    this.tags.all = [...this.tags.properties, ...this.tags.special, ...this.tags.custom];
  }

  generatePropertiesTags() {
    /** @type {TItemTag[]} */
    const tags = [];
    if (this.melee) {
      tags.push({ label: game.i18n.localize(WEAPON_SIZE_CHOICES[this.size]) });
      tags.push({ label: game.i18n.localize("ACKS.items.Melee") });
    }
    if (this.missile) {
      tags.push({ label: game.i18n.localize("ACKS.items.Missile") });
    }
    if (this.isRanged) {
      tags.push({ label: `${this.range.short}/${this.range.medium}/${this.range.long}` });
    }
    return tags;
  }

  /**
   * Get list of labels and icons for special properties
   * @return {TItemTag[]}
   */
  generateSpecialTags() {
    // TODO: cache localized labels
    /** @type {TItemTag[]} */
    const tags = [];

    for (const [key, value] of Object.entries(this.special ?? {})) {
      if (value) {
        if (key === "cleave") {
          const cleaveLoc = game.i18n.localize(`ACKS.weapon.label.${key}`);
          const strModLoc = this.cleaveLimit.addStrMod ? game.i18n.localize("ACKS.weapon.label.cleaveAddStrMod") : "";

          tags.push({ label: `${cleaveLoc} ${this.cleaveLimit.numeric}${strModLoc}` });
        } else {
          tags.push({ label: game.i18n.localize(`ACKS.weapon.label.${key}`) });
        }
      }
    }

    return tags;
  }

  /**
   * Get list of labels and icons for custom properties
   * @return {TItemTag[]}
   */
  generateCustomTags() {
    /** @type {TItemTag[]} */
    const tags = [];

    for (const tag of this.customTags ?? []) {
      tags.push({ label: tag });
    }

    return tags;
  }

  //endregion DERIVED PROPERTIES
  //region DATA MIGRATION

  /**
   * @inheritDoc
   * @override
   */
  static migrateData(source) {
    if (isCurrentSchema(source)) {
      return super.migrateData(source);
    }

    SavingThrowsTemplate.migrateSaveValue(source);
    ItemPhysicalTemplate.migrateWeightToWeight6(source);
    this.migrateDamageStringToObject(source);
    WeaponCustomTagsTemplate.migrateTags(source);

    return super.migrateData(source);
  }

  /**
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateDamageStringToObject(source) {
    if (foundry.utils.getType(source.damage) === "string") {
      const damageFormula = source.damage;

      source.damage = {
        base: {
          formula: damageFormula,
          types: [],
          extraordinary: false,
        },
        twoHanded: {
          formula: "",
          types: [],
          extraordinary: false,
        },
      };
    }
  }

  //endregion DATA MIGRATION
}

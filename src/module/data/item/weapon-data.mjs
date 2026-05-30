/* global foundry */
import itemDescriptionSchema from "./templates/item-description-schema.mjs";
import ItemPhysicalTemplate from "./templates/item-physical-template.mjs";
import BaseDataModel from "../common/base-data-model.mjs";
import { isCurrentSchema } from "../../migration/migration.mjs";
import { WEAPON_CATEGORY, WEAPON_CATEGORY_CHOICES, WEAPON_SIZE, WEAPON_SIZE_CHOICES } from "../../constants.mjs";

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
   * @return {{description: HTMLField, cost: NumberField, weight: NumberField, weight6: NumberField, range, favorite, save, pattern, damage, bonus, tags, slow, missile, melee, equipped, counter}}
   */
  static defineSchema() {
    const { ArrayField, BooleanField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

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
    };
  }

  /**
   * @inheritDoc
   * @override
   */
  static migrateData(source) {
    if (isCurrentSchema(source)) {
      return super.migrateData(source);
    }

    if (source.save === "wand") {
      source.save = "implements";
    } else if (source.save === "breath") {
      source.save = "blast";
    }

    ItemPhysicalTemplate.migrateWeightToWeight6(source);

    return super.migrateData(source);
  }
}

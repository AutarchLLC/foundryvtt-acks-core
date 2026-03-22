/* global foundry */
import { ACKS } from "../../../config.js";

/**
 * Common data schema for actors
 * @return {{isNew, retainer, hp, aac, damage, thac0, saves, save, movement, initiative, surprise}}
 */
export default function actorCommonSchema() {
  const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

  return {
    // used to indicate new actor
    isNew: new BooleanField({ initial: false }),
    // retainer data
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
    // Hit Points
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
    // Ascending Armor Class
    aac: new SchemaField({
      // AC Value
      value: new NumberField({ initial: 0 }),
      // AC bonus modifier, currently only set via Actor Tweaks
      mod: new NumberField({ initial: 0 }),
    }),
    // Actor's Damage Bonus, currently only set via Actor Tweaks
    damage: new SchemaField({
      mod: new SchemaField({
        missile: new NumberField({ initial: 0 }),
        melee: new NumberField({ initial: 0 }),
      }),
    }),
    // Attack values
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
    // saving throws
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
      breath: new SchemaField({
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
      // TODO: wand is not used, renamed to implements. Write migration and remove from data model
      wand: new SchemaField({
        value: new NumberField({ initial: 16 }),
      }),
    }),
    // Saving throw bonus, configured via Actor Tweaks
    save: new SchemaField({
      mod: new NumberField({ initial: 0 }),
    }),
    // Movement speed
    movement: new SchemaField({
      // base movement speed. same as exploration speed I guess. Seems like remnant from OSE but used in monster sheet and
      // party overview
      base: new NumberField({ initial: 120 }),
      // movement modifier, configured via Actor Tweaks
      mod: new NumberField({ initial: 0 }),
      // used only in monster sheet now
      value: new StringField({}),
    }),
    // Initiative
    initiative: new SchemaField({
      // Initiative bonus (1d6 + value)
      value: new NumberField({ initial: 0 }),
      // Initiative bonus modifier, configured via Actor Tweaks
      mod: new NumberField({ initial: 0 }),
    }),
    // Surprise modifiers.
    // TODO: figure out and document this, it is very confusing
    surprise: new SchemaField({
      // mod can be set only for monsters.
      mod: new NumberField({ initial: 0 }), // TODO: not used, remove
      surpriseothers: new NumberField({ initial: 0 }),
      avoidsurprise: new NumberField({ initial: 0 }),
    }),
  };
}

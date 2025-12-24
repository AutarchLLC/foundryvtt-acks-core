import actorCommonSchema from "./templates/actor-common-schema.mjs";
import actorSpellcasterSchema from "./templates/actor-spellcaster-schema.mjs";

/**
 * Character Data Model
 *
 * @see https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html
 * @see https://foundryvtt.wiki/en/development/api/DataModel
 * @see https://foundryvtt.com/article/system-data-models/
 */
export default class CharacterData extends foundry.abstract.TypeDataModel {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @return {{isNew, retainer, hp, aac, damage, thac0, saves, save, movement, initiative, surprise, spells, config, henchmenList, details, movementacks, adventuring, languages, fight, exploration, scores, encumbrance}}
   */
  static defineSchema() {
    const { ArrayField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

    return {
      // common actor template
      ...actorCommonSchema(),
      // spellcaster actor template
      ...actorSpellcasterSchema(),
      // character config
      config: new SchemaField({
        // Automatically calculate movement speed based on encumbrance, configured via Actor Tweaks
        movementAuto: new BooleanField({ initial: true }),
      }),
      // array of hireling actor ids that belong to this character
      // TODO: change to array of DocumentUUIDField
      henchmenList: new ArrayField(new StringField(), { required: true, initial: [] }),
      // character details
      details: new SchemaField({
        // biography rich text
        // TODO: maybe use HTMLField?
        // TODO: Not used for character. Do we need this?
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
      // ACKS II movement speed (RR 17, RR 263)
      movementacks: new SchemaField({
        // Exploration speed is measured in feet per turn
        exploration: new NumberField({ initial: 0 }),
        // Combat speed is measured in feet per round
        combat: new NumberField({ initial: 0 }),
        // Running speed is measured in feet per round
        chargerun: new NumberField({ initial: 0 }),
        // Expedition speed is measured in miles per day
        expedition: new NumberField({ initial: 0 }),
        // sneaking speed (RR 32)
        stealth: new NumberField({ initial: 0 }),
        // climbing speed (RR 268)
        climb: new NumberField({ initial: 0 }),
      }),
      // Adventuring proficiency throws
      adventuring: new SchemaField({
        dungeonbashing: new NumberField({ initial: 18 }),
        climb: new NumberField({ initial: 8 }),
        listening: new NumberField({ initial: 18 }),
        searching: new NumberField({ initial: 18 }),
        trapbreaking: new NumberField({ initial: 18 }),
      }),
      // languages.
      // TODO: seems like deprecated in favor of language items? write migration and remove?
      languages: new SchemaField({
        literacy: new StringField({ blank: true, initial: "" }),
        spoken: new StringField({ blank: true, initial: "" }),
        value: new ArrayField(new StringField({ blank: true, initial: "" })),
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
      // TODO: OSE exploration skills??? Not used, remove?
      exploration: new SchemaField({
        ld: new NumberField({ initial: 18 }), // listen door?
        od: new NumberField({ initial: 18 }), // open door?
        odMod: new NumberField({ initial: 0 }), // open door mod?
        sd: new NumberField({ initial: 18 }), // find secret door?
        ft: new NumberField({ initial: 18 }), // find trap?
      }),
      // CHARACTER ATTRIBUTES
      scores: new SchemaField({
        // Strength (STR)
        str: new SchemaField({
          value: new NumberField({ required: true, initial: 10 }),
          // TODO: seems not used
          bonus: new NumberField({ initial: 0 }),
          // standard modifier
          mod: new NumberField({ initial: 0 }),
        }),
        // Intellect (INT)
        int: new SchemaField({
          value: new NumberField({ required: true, initial: 10 }),
          // TODO: seems not used
          bonus: new NumberField({ initial: 0 }),
          // standard modifier
          mod: new NumberField({ initial: 0 }),
        }),
        // Will (WIL)
        wis: new SchemaField({
          value: new NumberField({ required: true, initial: 10 }),
          // TODO: seems not used
          bonus: new NumberField({ initial: 0 }),
          // standard modifier
          mod: new NumberField({ initial: 0 }),
        }),
        // Dexterity (DEX)
        dex: new SchemaField({
          value: new NumberField({ required: true, initial: 10 }),
          // TODO: seems not used
          bonus: new NumberField({ initial: 0 }),
          // standard modifier
          mod: new NumberField({ initial: 0 }),
          // TODO: same as mod. remove?
          init: new NumberField({ initial: 0 }),
        }),
        // Constitution (CON)
        con: new SchemaField({
          value: new NumberField({ required: true, initial: 10 }),
          // TODO: seems not used
          bonus: new NumberField({ initial: 0 }),
          // standard modifier
          mod: new NumberField({ initial: 0 }),
        }),
        // Charisma (CHA)
        cha: new SchemaField({
          value: new NumberField({ required: true, initial: 10 }),
          // TODO: seems not used
          bonus: new NumberField({ initial: 0 }),
          // standard modifier
          mod: new NumberField({ initial: 0 }),
          // TODO: same as mod. remove?
          npc: new NumberField({ initial: 0 }),
          // retainer number? mod + 4
          // TODO: not used, remove?
          retain: new NumberField({ initial: 0 }),
          // TODO: same as mod. not used. remove?
          loyalty: new NumberField({ initial: 0 }),
        }),
      }),
      // Encumbrance related
      encumbrance: new SchemaField({
        // maximum encumbrance value
        max: new NumberField({ initial: 20 }),
        // forced maximum encumbrance value via Actor Tweaks
        forcemax: new NumberField({ initial: -1 }),
      }),
    };
  }
}

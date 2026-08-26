/* global foundry, game */
import itemDescriptionSchema from "./templates/item-description-schema.mjs";
import { isCurrentSchema } from "../../migration/migration.mjs";
import SavingThrowsTemplate from "../actor/templates/saving-throws.mjs";
import ItemBaseData from "./item-base-data.mjs";
import { SAVING_THROW_CHOICES } from "../../constants.mjs";

/**
 * Spell Item Data Model
 */
export default class SpellData extends ItemBaseData {
  /**
   * Define the data schema for documents of this type. The schema is populated the first time it is accessed and cached for future reuse.
   * @override
   * @return {{description: HTMLField, favorite, lvl, class, duration, range, roll, memorized, cast, save}}
   */
  static defineSchema() {
    const { BooleanField, NumberField, StringField } = foundry.data.fields;

    return {
      ...super.defineSchema(),
      // common item description
      ...itemDescriptionSchema(),
      // is added to favorites
      favorite: new BooleanField({ initial: false }),
      // spell level
      lvl: new NumberField({ initial: 1, min: 0, integer: true, required: true }),
      // Class the spell belongs to. Not really sure if we need this. Maybe use it for magic type? (Divine, Arcane, etc.)
      class: new StringField({ initial: "Magic-User", blank: true }),
      // spell duration
      duration: new StringField({ initial: "", blank: true }),
      // spell range
      range: new StringField({ initial: "", blank: true }),
      // spell roll
      roll: new StringField({ initial: "", blank: true }),
      // TODO: investigate, not sure, number of memorized spells? but why is it on spell itself?
      memorized: new NumberField({ initial: 0 }),
      // TODO: investigate, not sure, number of cast spells? but why is it on spell itself?
      cast: new NumberField({ initial: 0 }),
      // saving throw
      save: new StringField({ blank: true, initial: "" }),
    };
  }

  /**
   * @override
   * @return {Promise<{description: *, buttons: [], tags: []}>}
   */
  async prepareChatCardContext() {
    const context = await super.prepareChatCardContext();

    if (this.save) {
      context.buttons.push({
        action: "save",
        actionParam: this.save,
        label: `${game.i18n.localize(SAVING_THROW_CHOICES[this.save])} - ${game.i18n.localize("ACKS.spells.Save")}`,
      });
    }
    if (this.roll) {
      context.buttons.push({
        action: "formula",
        actionParam: this.roll,
        label: `${game.i18n.localize("ACKS.Roll")} ${this.roll}`,
      });
    }

    context.tags.push(`${this.class} ${this.lvl}`, this.range, this.duration);

    return context;
  }

  /**
   * @inheritDoc
   * @override
   */
  static migrateData(source) {
    if (isCurrentSchema(source)) {
      return super.migrateData(source);
    }

    SavingThrowsTemplate.migrateSaveValue(source);

    return super.migrateData(source);
  }
}

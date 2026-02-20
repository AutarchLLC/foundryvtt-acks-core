/* global foundry */
import { ATTRIBUTE_MODIFIERS_LUT } from "../constants.mjs";
import { ACKS } from "../config.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class CharacterModifiersInfo extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options) {
    super(options);
  }

  static DEFAULT_OPTIONS = {
    classes: ["acks2", "info-sheet"],
    sheetConfig: false,
    window: {
      contentClasses: ["modifiers-info"],
      icon: "fa-solid fa-book",
      resizable: false,
    },
    position: {
      width: 640,
      height: "auto",
    },
    actorName: "Nameless One",
    attributes: null, // <- actor.system.scores
  };

  static PARTS = {
    info: {
      template: "systems/acks/templates/apps/character-modifiers-info.hbs",
    },
  };

  /** @override */
  get title() {
    return `${this.options.actorName}: Attribute Bonuses Info`;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.attributes = {};
    const attrs = Object.keys(ACKS.scores);
    for (const attr of attrs) {
      context.attributes[attr] = {
        value: this.options.attributes[attr].value,
        modifier: ATTRIBUTE_MODIFIERS_LUT[this.options.attributes[attr].value] ?? "N/A",
      };
    }

    context.dungeonbashing = context.attributes.str.modifier * 4;
    context.intBonus = Math.max(0, context.attributes.int.modifier);
    context.literate = context.attributes.int.modifier >= 0 ? "Yes" : "No";
    context.henchmenMax = 4 + context.attributes.cha.modifier;

    return context;
  }
}

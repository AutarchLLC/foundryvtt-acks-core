/* global foundry, game */
const { DocumentSheetV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class ActorTweaksConfig extends HandlebarsApplicationMixin(DocumentSheetV2) {
  constructor(options, ...args) {
    super(options, ...args);
  }

  static DEFAULT_OPTIONS = {
    classes: ["acks2", "config-sheet"],
    sheetConfig: false,
    form: {
      submitOnChange: true,
    },
    window: {
      contentClasses: ["standard-form"],
      icon: "fa-solid fa-screwdriver-wrench",
    },
    position: {
      width: 470,
      height: "auto",
    },
  };

  static PARTS = {
    config: {
      template: "systems/acks/templates/apps/config/actor-tweaks.hbs",
    },
  };

  /** @override */
  get title() {
    return `${this.document.name}: ${game.i18n.localize("ACKS.dialog.tweaks")}`;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.docFields = this.document.system.schema.fields;
    context.system = this.document.system;
    context.isGM = game.user.isGM;

    context.isCharacter = this.document.type === "character";

    return context;
  }
}

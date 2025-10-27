import { AcksEntityTweaks } from "../dialog/entity-tweaks.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * @see https://foundryvtt.wiki/en/development/api/applicationv2
 * @see https://foundryvtt.com/api/v13/classes/foundry.applications.sheets.ActorSheetV2.html
 */
export default class ACKSActorSheetV2 extends HandlebarsApplicationMixin(ActorSheetV2) {
  constructor(...args) {
    super(...args);
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["acks", "actor-v2"],
    position: {
      // initial size of the window
      width: 800,
      height: 600,
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
      submitOnClose: true,
    },
    window: {
      resizable: true,
      controls: [
        {
          icon: "fas fa-code",
          label: "ACKS.dialog.tweaks",
          action: "showTweaksDialog",
          ownership: "OWNER",
          visible: ACKSActorSheetV2.#canShowTweaksBtn,
        },
      ],
    },
    actions: {
      showTweaksDialog: ACKSActorSheetV2.#showTweaksDialog,
    },
  };

  /**
   * Can current user see Tweaks button?
   * TODO: seems redundant - it is not visible to player if he is not owner even when this returns true. why?
   * @return {boolean}
   */
  static #canShowTweaksBtn() {
    return this.isEditable && (game.user.isGM || this.actor.isOwner);
  }

  static #showTweaksDialog() {
    new AcksEntityTweaks(this.actor, {
      top: this.position.top + 40,
      left: this.position.left + (this.position.width - 400) / 2,
    }).render(true);
  }

  // Prepare application rendering context data for a given render request.
  // @see https://foundryvtt.wiki/en/development/api/applicationv2#_preparecontext
  async _prepareContext(options) {
    const context = {
      ...(await super._prepareContext(options)),
      actor: this.actor,
      actorFields: this.actor.system.schema.fields,
      system: this.actor.system,
      isGM: game.user.isGM,
      managerName: this.actor.getManagerName(),
    };

    return context;
  }
}

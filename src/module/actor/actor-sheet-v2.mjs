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
      height: 650,
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
      rollHitDice: ACKSActorSheetV2.#rollHitDice,
      rollMorale: ACKSActorSheetV2.#rollMorale,
      rollLoyalty: ACKSActorSheetV2.#rollLoyalty,
      rollSave: ACKSActorSheetV2.#rollSave,
      rollAttack: ACKSActorSheetV2.#rollAttack,
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

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #rollHitDice(event, target) {
    this.actor.rollHitDice({ event });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #rollMorale(event, target) {
    this.actor.rollMorale({ event });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #rollLoyalty(event, target) {
    this.actor.rollLoyalty({ event });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #rollSave(event, target) {
    const save = target.dataset.save;
    this.actor.rollSave(save, { event });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #rollAttack(event, target) {
    const attack = target.dataset.attack;

    // TODO: why do we create rollData here?
    const rollData = {
      actor: this.actor,
      roll: {},
    };

    let skip = false;
    const skipKey = game.settings.get("acks", "skip-dialog-key");
    if (event[skipKey]) {
      skip = true;
    }

    this.actor.targetAttack(rollData, attack, {
      type: attack,
      skipDialog: skip,
    });
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

/* global foundry, game, CONFIG */
import { ATTACK_RANGE_PENALTY, ATTACK_TYPE } from "../constants.mjs";
import {
  buildAttackThrow,
  getAttackOptions,
  getDefaultChoices,
  isValidSituationalModifier,
  normalizeChoices,
} from "../throw/attack-throw-builder.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { FormDataExtended } = foundry.applications.ux;

/** @type {Readonly<Record<ATTACK_TYPE, string>>} */
const ATTACK_TYPE_ICON = Object.freeze({
  [ATTACK_TYPE.MELEE]: "fa-solid fa-sword",
  [ATTACK_TYPE.MISSILE]: "fa-solid fa-bow-arrow",
  [ATTACK_TYPE.THROWN]: "fa-solid fa-dagger",
  [ATTACK_TYPE.ATTACK]: "fa-solid fa-hand-fist",
});

/**
 * Attack Throw dialog. The player picks the attack type, damage mode, range and a situational modifier, and the
 * dialog shows the resulting attack throw and damage formulas as they change.
 * Open it with {@link AttackThrowDialog.wait}, which resolves to the result, or null if the dialog was dismissed.
 */
export default class AttackThrowDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @type {AcksActor} */
  #actor;

  /** @type {?AcksItem} */
  #item;

  /** @type {?TokenDocument} */
  #target;

  /** @type {TAttackThrowChoices} */
  #choices;

  /** @type {?TAttackThrowResult} */
  #result = null;

  /** Refresh the preview while the player types a situational modifier. */
  #onSituationalInput = foundry.utils.debounce(this.#refreshFromInput.bind(this), 200);

  /**
   * @param {TAttackThrowDialogConfiguration} options
   */
  constructor({ actor, item = null, target = null, ...options } = {}) {
    super(options);
    this.#actor = actor;
    this.#item = item;
    this.#target = target;
    this.#choices = getDefaultChoices(actor, item);
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["acks2", "attack-throw-dialog"],
    window: {
      icon: "fa-solid fa-swords",
      contentClasses: ["standard-form"],
    },
    position: {
      width: 440,
      height: "auto",
    },
    form: {
      handler: AttackThrowDialog.#onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  static PARTS = {
    header: {
      template: "systems/acks/templates/dialog/attack-throw/header.hbs",
    },
    options: {
      template: "systems/acks/templates/dialog/attack-throw/options.hbs",
    },
    preview: {
      template: "systems/acks/templates/dialog/attack-throw/preview.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  /**
   * Open the dialog and wait for the player to roll or dismiss it.
   * @param {TAttackThrowDialogConfiguration} config
   * @return {Promise<?TAttackThrowResult>} the attack throw, or null if the dialog was dismissed
   */
  static wait(config) {
    return new Promise((resolve) => {
      const dialog = new this(config);
      dialog.addEventListener("close", () => resolve(dialog.#result), { once: true });
      void dialog.render({ force: true });
    });
  }

  /** @override */
  get title() {
    return `${game.i18n.localize("ACKS.throw.attack.title")}: ${this.#actor.name}`;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const choices = this.#choices;
    const { attackTypes, damageModes, ranges } = getAttackOptions(this.#actor, this.#item, choices.attackType);

    context.actor = this.#actor;
    context.item = this.#item;
    context.choices = choices;
    context.result = buildAttackThrow(this.#actor, this.#item, choices, this.#target);
    // damage type icons (derived from base damage types; already include the extraordinary color class).
    // `icons` is a Set; convert it so the template can check `length` (an empty Set is truthy in `{{#if}}`).
    context.damageIcons = context.result.damage ? Array.from(this.#item.system.damage.base.icons ?? []) : [];

    context.attackerLabel = this.#item
      ? game.i18n.format("ACKS.throw.attack.attacksWith", { actorName: this.#actor.name, itemName: this.#item.name })
      : game.i18n.format("ACKS.throw.attack.attacks", { actorName: this.#actor.name });
    // Players don't see the target's AC unless the Judge allows it; the target value then excludes the AC.
    const showTargetAC = !this.#target || AttackThrowDialog.#canSeeTargetAC();
    context.targetLabel = this.#target
      ? game.i18n.format("ACKS.throw.attack.target", {
          name: this.#target.name,
          ac: showTargetAC
            ? (this.#target.actor?.system?.aac?.value ?? 0)
            : game.i18n.localize("ACKS.throw.attack.hiddenAC"),
        })
      : game.i18n.localize("ACKS.throw.attack.noTarget");
    context.targetValueLabel = showTargetAC
      ? game.i18n.format("ACKS.throw.attack.targetValue", { value: context.result.attack.targetValue })
      : game.i18n.format("ACKS.throw.attack.targetValueHiddenAC", { value: this.#actor.system.thac0.throw });

    context.attackTypes = attackTypes.map((value) => ({
      value,
      label: game.i18n.localize(`ACKS.throw.attackType.${value}`),
      icon: ATTACK_TYPE_ICON[value],
      selected: value === choices.attackType,
    }));
    context.damageModes = damageModes.map((value) => ({
      value,
      label: game.i18n.localize(`ACKS.throw.damageMode.${value}`),
      selected: value === choices.damageMode,
    }));
    context.ranges = ranges.map((value) => {
      const penalty = ATTACK_RANGE_PENALTY[value];
      const label = game.i18n.localize(`ACKS.throw.range.${value}`);
      return { value, label: penalty ? `${label} (${penalty})` : label, selected: value === choices.range };
    });

    context.messageModes = Object.fromEntries(
      Object.entries(CONFIG.ChatMessage.modes).map(([mode, { label }]) => [mode, label]),
    );

    context.buttons = [
      { type: "submit", icon: "fa-solid fa-dice-d20", label: "ACKS.Roll", default: true },
      { type: "button", action: "close", icon: "fa-solid fa-xmark", label: "ACKS.Cancel" },
    ];

    return context;
  }

  /** @override */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    if (partId === "options") {
      htmlElement.querySelector('input[name="situational"]')?.addEventListener("input", this.#onSituationalInput);
    }
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#updateValidity();
  }

  /**
   * Re-render the parts affected by the changed input. The attack type changes which options are available.
   * @override
   */
  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);
    const name = event.target?.name;
    this.#readChoices();
    if (name === "messageMode") {
      return;
    }
    void this.render({ parts: name === "attackType" ? ["options", "preview"] : ["preview"] });
  }

  /**
   * Whether the current user may see a target's Armor Class: always for the Judge, for players only if allowed by
   * the "Show Target's AC to Players" setting.
   * @return {boolean}
   */
  static #canSeeTargetAC() {
    return game.user.isGM || game.settings.get("acks", "showTargetACToPlayers");
  }

  /**
   * Store the current form values as the player's choices.
   */
  #readChoices() {
    const formValues = new FormDataExtended(this.element).object;
    this.#choices = normalizeChoices(this.#actor, this.#item, { ...this.#choices, ...formValues });
  }

  /**
   * Update the preview after the player typed in the situational modifier input.
   */
  #refreshFromInput() {
    if (!this.rendered) {
      return;
    }
    this.#readChoices();
    this.#updateValidity();
    void this.render({ parts: ["preview"] });
  }

  /**
   * Mark an invalid situational modifier and block rolling until it is fixed.
   */
  #updateValidity() {
    const isValid = isValidSituationalModifier(this.#choices.situational);
    const input = this.element.querySelector('input[name="situational"]');
    input?.setCustomValidity(isValid ? "" : game.i18n.localize("ACKS.throw.error.invalidSituational"));
    const submitButton = this.element.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = !isValid;
    }
  }

  /**
   * Build the final attack throw. The dialog closes afterwards and {@link AttackThrowDialog.wait} resolves with it.
   * @this {AttackThrowDialog}
   * @param {SubmitEvent} _event
   * @param {HTMLFormElement} _form
   * @param {FormDataExtended} formData
   * @return {Promise<void>}
   */
  static async #onSubmitForm(_event, _form, formData) {
    this.#choices = normalizeChoices(this.#actor, this.#item, { ...this.#choices, ...formData.object });
    if (!isValidSituationalModifier(this.#choices.situational)) {
      throw new Error(game.i18n.localize("ACKS.throw.error.invalidSituational"));
    }
    this.#result = buildAttackThrow(this.#actor, this.#item, this.#choices, this.#target);
  }
}

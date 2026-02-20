/* global foundry, game, ChatMessage */
import { ACKS } from "../config.js";
import { AcksDice } from "../dice.js";
import { ATTRIBUTE_MODIFIERS_LUT } from "../constants.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class CharacterStatGenerator extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options) {
    super(options);
  }

  static DEFAULT_OPTIONS = {
    classes: ["acks2", "stat-gen-app"],
    sheetConfig: false,
    window: {
      //contentClasses: ["modifiers-info"],
      icon: "fa-solid fa-dice",
      resizable: false,
    },
    position: {
      width: 680,
      height: "auto",
    },
    tag: "form",
    form: {
      submitOnChange: false,
      closeOnSubmit: true,
      handler: CharacterStatGenerator.#onSubmitForm,
    },
    actions: {
      rollScore: CharacterStatGenerator.#rollScore,
      rollGold: CharacterStatGenerator.#rollGold,
      rollTemplate: CharacterStatGenerator.#rollTemplate,
    },
    actor: null,
  };

  static PARTS = {
    app: {
      template: "systems/acks/templates/apps/character-stat-generator.hbs",
    },
  };

  /** @override */
  get title() {
    return `${this.options.actor.name}: Scores Generator`;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.scores = ACKS.scores;

    return context;
  }

  /**
   * Handle form submission
   * @this {CharacterStatGenerator}
   * @param {SubmitEvent} event The originating form submission event
   * @param {HTMLFormElement} form The form element that was submitted
   * @param {FormDataExtended} formData Processed data for the submitted form
   * @returns {Promise<void>}
   */
  static async #onSubmitForm(event, form, formData) {
    const scores = foundry.utils.expandObject(formData.object).scores;
    const scoreKeys = Object.keys(ACKS.scores);
    const updateData = {};

    for (const key of scoreKeys) {
      const score = scores[key];
      if (score) {
        updateData[`system.scores.${key}.value`] = score;
      }
    }

    await this.options.actor.update(updateData);

    const gold = scores.gold;
    if (gold) {
      this.options.actor.manageMoney("Gold", gold);
    }
  }

  /**
   * @this {CharacterStatGenerator}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #rollScore(event, target) {
    const scoreKey = target.dataset.score;
    const formula = target.dataset.formula;
    const label = game.i18n.localize(`ACKS.scores.${scoreKey}.long`);
    const result = await this.#roll(label, formula, event);

    this.#renderScore(target, scoreKey, result.total);
    this.#renderScoreModifier(target, scoreKey, ATTRIBUTE_MODIFIERS_LUT[result.total]);
    this.#updateStats();
  }

  /**
   * @this {CharacterStatGenerator}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #rollGold(event, target) {
    const formula = target.dataset.formula;
    const result = await this.#roll("Gold", formula, event);

    this.#renderScore(target, "gold", result.total);
  }

  /**
   * @this {CharacterStatGenerator}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #rollTemplate(event, target) {
    const formula = target.dataset.formula;
    const result = await this.#roll("Template", formula, event);

    this.#renderScore(target, "template", result.total);
  }

  #updateStats() {
    const inputs = this.form.querySelectorAll(`input[data-kind="score"]`);
    const values = Array.from(inputs, (el) => {
      return isNaN(el.valueAsNumber) ? 0 : el.valueAsNumber;
    });

    let n = values.length;
    // the total sum of all values
    let sum = values.reduce((a, b) => a + b);
    // the average value
    let mean = sum / n;
    // the standard deviation, measuring how spread out the values are from the mean
    let std = Math.sqrt(values.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);

    this.#renderStatistic("sum", sum);
    this.#renderStatistic("mean", mean.toFixed(2));
    this.#renderStatistic("std", std.toFixed(2));
  }

  async #roll(label, formula, event) {
    const parts = [formula];
    const data = { roll: { type: "result" } };
    // Roll and return
    return await AcksDice.Roll({
      event,
      parts,
      data,
      skipDialog: true,
      speaker: ChatMessage.getSpeaker({ actor: this.options.actor }),
      flavor: game.i18n.format("ACKS.dialog.generateScore", { score: label }),
      title: game.i18n.format("ACKS.dialog.generateScore", { score: label }),
    });
  }

  #renderScore(target, key, value) {
    const input = target.parentElement.querySelector(`input[name="scores.${key}"]`);
    input.value = value;
  }

  #renderScoreModifier(target, key, value) {
    const input = target.parentElement.querySelector(`input[name="scores.${key}.mod"]`);
    input.value = value;
  }

  #renderStatistic(key, value) {
    const input = this.form.querySelector(`input[name="stats.${key}"]`);
    input.value = value;
  }
}

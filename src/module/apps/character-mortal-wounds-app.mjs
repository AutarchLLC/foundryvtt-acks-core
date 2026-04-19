/* global foundry, game, ChatMessage, CONST */
import ACKSTableManager from "./table-manager.mjs";
import {
  HIT_DICE_MODIFIERS,
  MORTAL_WOUNDS_CLASS_LEVELS,
  MORTAL_WOUNDS_HEALING_PROF,
  MORTAL_WOUNDS_SPELL_LEVELS,
  MORTAL_WOUNDS_TREATMENT_TIMING,
} from "../constants.mjs";
import { AcksUtility } from "../util/acks-utility.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const HEAVY_HELM_MOD = 2;
const HERB_MOD = 2;
const MODE = Object.freeze({
  ACTOR: 0,
  STANDALONE: 1,
});

export default class CharacterMortalWoundsApp extends HandlebarsApplicationMixin(ApplicationV2) {
  #system = null;
  #mode = MODE.STANDALONE;
  #finalModifier = 0;

  constructor(options) {
    super(options);

    this.#mode = this.options.actor ? MODE.ACTOR : MODE.STANDALONE;

    /** @type {boolean} */
    const hasHeavyHelm = this.#mode === MODE.ACTOR ? this.options.actor.hasHeavyHelm() : false;
    /** @type {string} */
    const hitDie = this.#mode === MODE.ACTOR ? this.options.actor.getHitDie() : "d6";
    /** @type {number} */
    const currentHitPoints = this.#mode === MODE.ACTOR ? this.options.actor.getCurrentHitPoints() : 0;
    /** @type {number} */
    const maxHitPoints = this.#mode === MODE.ACTOR ? this.options.actor.getMaxHitPoints() : 10;

    this.#system = {
      mortalTablesChoice: "acid",
      treatmentTiming: 2,
      necromanticSpellLevel: 0,
      hasHeavyHelm,
      heavyHelmModifier: hasHeavyHelm ? HEAVY_HELM_MOD : 0,
      hitDie,
      hitDiceModifier: HIT_DICE_MODIFIERS[hitDie]?.value || 0,
      currentHitPoints,
      maxHitPoints,
      hitPointsModifier: this.#computeHitPointsModifier(currentHitPoints, maxHitPoints),
      conModifier: this.#mode === MODE.ACTOR ? this.options.actor.getConModifier() : 0,
      freeModifier: 0,
      horsetailApplied: false,
      horsetailModifier: 0,
      healingMagicLevel: 0,
      layingOnHands: false,
      healerClassLevel: 0,
      healingProficiency: 0,
    };

    this.#calculateFinalModifier();
  }

  static DEFAULT_OPTIONS = {
    classes: ["acks2", "mortal-wounds-app"],
    sheetConfig: false,
    window: {
      resizable: false,
    },
    position: {
      width: 700,
      height: "auto",
    },
    tag: "form",
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
      handler: CharacterMortalWoundsApp.#onSubmitForm,
    },
    actions: {},
    actor: null,
  };

  static PARTS = {
    app: {
      template: "systems/acks/templates/apps/character-mortal-wounds.hbs",
    },
  };

  /** @override */
  get title() {
    if (this.#mode === MODE.ACTOR) {
      return `${this.options.actor.name}: Mortal Wounds`;
    } else {
      return "Mortal Wounds";
    }
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.system = this.#system;

    context.mortalTablesChoices = this.#buildMortalTablesChoices();
    context.treatmentTimingChoices = MORTAL_WOUNDS_TREATMENT_TIMING;
    context.spellLevelChoices = MORTAL_WOUNDS_SPELL_LEVELS;
    context.hitDiceChoices = HIT_DICE_MODIFIERS;
    context.classLevelChoices = MORTAL_WOUNDS_CLASS_LEVELS;
    context.healingProficiencyChoices = MORTAL_WOUNDS_HEALING_PROF;
    context.isActor = this.#mode === MODE.ACTOR;

    context.finalModifier = this.#finalModifier;

    return context;
  }

  /**
   * Handle form submission
   * @this {CharacterMortalWoundsApp}
   * @param {SubmitEvent} event The originating form submission event
   * @param {HTMLFormElement} form The form element that was submitted
   * @param {FormDataExtended} formData Processed data for the submitted form
   * @returns {Promise<void>}
   */
  static async #onSubmitForm(event, form, formData) {
    const updatedData = { ...formData.object };
    const update = foundry.utils.diffObject(this.#system, updatedData);
    if (foundry.utils.isEmpty(update)) {
      // we submitted - roll and show result
      void this.#rollMortalWounds();
    } else {
      // we changed something - update the app state
      this.#system = foundry.utils.mergeObject(this.#system, update);
      this.#system.heavyHelmModifier = this.#system.hasHeavyHelm ? HEAVY_HELM_MOD : 0;
      this.#system.horsetailModifier = this.#system.horsetailApplied ? HERB_MOD : 0;
      if (this.#system.layingOnHands === false) {
        this.#system.healerClassLevel = 0;
      }
      if (Object.hasOwn(update, "currentHitPoints") || Object.hasOwn(update, "maxHitPoints")) {
        this.#system.hitPointsModifier = this.#computeHitPointsModifier(
          this.#system.currentHitPoints,
          this.#system.maxHitPoints,
        );
      }
      this.#calculateFinalModifier();
      this.render();
    }
  }

  #buildMortalTablesChoices() {
    const tables = ACKSTableManager.getTablesByCategory("mortal_wounds");
    const choices = [];
    // tables is an object with keys as table names and values as table objects
    for (const [key, data] of Object.entries(tables)) {
      choices.push({ key, label: data.name });
    }
    return choices;
  }

  #computeHitPointsModifier(hp, hpMax) {
    if (hp >= 0) {
      return 5;
    }
    if (hp > -(hpMax / 4)) {
      return 0;
    }
    if (hp > -(hpMax / 2)) {
      return -2;
    }
    if (hp > -hpMax) {
      return -5;
    }
    if (hp > -(hpMax * 2)) {
      return -10;
    }
    return -20;
  }

  #calculateFinalModifier() {
    this.#finalModifier =
      this.#system.treatmentTiming +
      this.#system.heavyHelmModifier +
      this.#system.hitDiceModifier +
      this.#system.hitPointsModifier +
      this.#system.conModifier +
      this.#system.freeModifier +
      this.#system.horsetailModifier +
      this.#system.healingMagicLevel +
      AcksUtility.roundToEven(this.#system.healerClassLevel / 2) +
      this.#system.healingProficiency -
      AcksUtility.roundToEven(this.#system.necromanticSpellLevel / 2);
  }

  async #rollMortalWounds() {
    const result = await ACKSTableManager.rollD20Table(
      "mortal_wounds",
      this.#system.mortalTablesChoice,
      this.#finalModifier,
    );
    const chatContent = await foundry.applications.handlebars.renderTemplate(
      "systems/acks/templates/chat/mortal-wounds-result.hbs",
      result,
    );
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.options.actor }),
      content: chatContent,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      flags: {
        acks: {
          mortalWounds: true,
          rollResult: result,
        },
      },
    };
    ChatMessage.create(chatData);
  }
}

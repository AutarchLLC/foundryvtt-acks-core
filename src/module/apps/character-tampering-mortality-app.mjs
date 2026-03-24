/* global foundry, game, CONST, ChatMessage */
import ACKSTableManager from "./table-manager.mjs";
import { MORTAL_WOUNDS_CLASS_LEVELS, TAMPERING_LIFE_SPAN, TAMPERING_LIMBS, TAMPERING_SPINE } from "../constants.mjs";
import { AcksUtility } from "../utility.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODE = Object.freeze({
  ACTOR: 0,
  STANDALONE: 1,
});

const TEMPLE_MOD = 2;
const STILL_ALIVE_MOD = 5;
const INSTANTLY_KILLED_MOD = -10;

export default class CharacterTamperingMortalityApp extends HandlebarsApplicationMixin(ApplicationV2) {
  #system = null;
  #mode = MODE.STANDALONE;
  #finalModifier = 0;

  constructor(options) {
    super(options);

    this.#mode = this.options.actor ? MODE.ACTOR : MODE.STANDALONE;

    /** @type {string} */
    const tamperingChoice = this.#mode === MODE.ACTOR ? this.#chooseAlignment(this.options.actor) : "tampering_neutral";
    /** @type {number} */
    const willModifier = this.#mode === MODE.ACTOR ? this.options.actor.getWillModifier() : 0;

    this.#system = {
      tamperingChoice,
      creatureLife: 2,
      castTemple: false,
      castTempleModifier: 0,
      spellcasterLevel: 7,
      stillAlive: false,
      stillAliveModifier: 0,
      instantKilled: false,
      instantKilledModifier: 0,
      spine: 0,
      limbsDestroyed: 0,
      organsDestroyed: 0,
      freeModifier: 0,
      willModifier,
      daysSinceDeath: 0,
      sideEffects: 0,
    };

    this.#calculateFinalModifier();
  }

  static DEFAULT_OPTIONS = {
    classes: ["acks2", "tampering-mortality-app"],
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
      handler: CharacterTamperingMortalityApp.#onSubmitForm,
    },
    actions: {},
    actor: null,
  };

  static PARTS = {
    app: {
      template: "systems/acks/templates/apps/character-tampering-mortality-app.hbs",
    },
  };

  /** @override */
  get title() {
    if (this.#mode === MODE.ACTOR) {
      return `${this.options.actor.name}: Tampering with Mortality`;
    } else {
      return "Tampering with Mortality";
    }
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.system = this.#system;

    context.tamperingChoices = this.#buildTamperingTablesChoices();
    context.spanChoices = TAMPERING_LIFE_SPAN;
    context.classLevelChoices = MORTAL_WOUNDS_CLASS_LEVELS;
    context.spineChoices = TAMPERING_SPINE;
    context.limbsChoices = TAMPERING_LIMBS;
    context.isActor = this.#mode === MODE.ACTOR;

    context.finalModifier = this.#finalModifier;

    return context;
  }

  /**
   * Handle form submission
   * @this {CharacterTamperingMortalityApp}
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
      void this.#rollTamperingMortality();
    } else {
      // we changed something - update the app state
      this.#system = foundry.utils.mergeObject(this.#system, update);
      this.#system.castTempleModifier = this.#system.castTemple ? TEMPLE_MOD : 0;
      this.#system.stillAliveModifier = this.#system.stillAlive ? STILL_ALIVE_MOD : 0;
      this.#system.instantKilledModifier = this.#system.instantKilled ? INSTANTLY_KILLED_MOD : 0;
      this.#calculateFinalModifier();
      this.render();
    }
  }

  #buildTamperingTablesChoices() {
    const tables = ACKSTableManager.getTablesByCategory("tampering");
    const choices = [];
    // tables is an object with keys as table names and values as table objects
    for (const [key, data] of Object.entries(tables)) {
      choices.push({ key, label: data.name });
    }
    return choices;
  }

  #chooseAlignment(actor) {
    const alignment = actor.system?.details?.alignment?.toLowerCase() ?? "neutral";
    if (alignment === "lawful" || alignment.startsWith("l")) {
      return "tampering_lawful";
    } else if (alignment === "chaotic" || alignment.startsWith("c")) {
      return "tampering_chaotic";
    } else {
      return "tampering_neutral";
    }
  }

  #calculateFinalModifier() {
    const bodyModifier = Math.max(
      this.#system.stillAliveModifier +
        this.#system.instantKilledModifier +
        this.#system.spine +
        this.#system.limbsDestroyed -
        this.#system.organsDestroyed,
      -10,
    );

    this.#finalModifier =
      this.#system.creatureLife +
      this.#system.castTempleModifier +
      AcksUtility.roundToEven(this.#system.spellcasterLevel / 2) +
      bodyModifier +
      this.#system.freeModifier +
      this.#system.willModifier -
      this.#system.daysSinceDeath -
      this.#system.sideEffects;
  }

  async #rollTamperingMortality() {
    const result = await ACKSTableManager.rollD20Table("tampering", this.#system.tamperingChoice, this.#finalModifier);
    const chatContent = await foundry.applications.handlebars.renderTemplate(
      "systems/acks/templates/chat/tampering-result.hbs",
      result,
    );
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.options.actor }),
      content: chatContent,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
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

/* global foundry, game, Roll, ChatMessage */
import { SURPRISE_MATRIX } from "../../constants.mjs";
import { AcksUtility } from "../../utility.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class SurpriseMatrix extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options) {
    super(options);
  }

  static DEFAULT_OPTIONS = {
    classes: ["acks2", "surprise-matrix-app"],
    sheetConfig: false,
    window: {
      resizable: false,
      title: "Surprise Matrix", //TODO: localization
    },
    position: {
      width: 940,
      height: "auto",
    },
    actions: {
      rollSurprise: SurpriseMatrix.#rollSurprise,
      setIndividualModifiers: SurpriseMatrix.#setIndividualModifiers,
    },
    pools: {
      secret: [],
      hostile: [],
      neutral: [],
      friendly: [],
    },
    /** @type {AcksCombatClass | null} */
    combat: null,
  };

  static PARTS = {
    app: {
      template: "systems/acks/templates/apps/surprise/surprise-matrix-app.hbs",
    },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.headerKeys = Object.keys(SURPRISE_MATRIX).map((key) => game.i18n.localize(`ACKS.surprise.title.${key}`));
    context.gridCells = this.#prepareGridCells(SURPRISE_MATRIX);

    return context;
  }

  /**
   *
   * @param {SurpriseMatrixLUT} surpriseMatrix
   * @return {*[]}
   */
  #prepareGridCells(surpriseMatrix) {
    const gridCells = [];

    for (const [adventurerStatusKey, statusRecord] of Object.entries(surpriseMatrix)) {
      gridCells.push({
        isHeader: true,
        desc: game.i18n.localize(`ACKS.surprise.title.${adventurerStatusKey}`),
      });
      for (const [monsterStatusKey, status] of Object.entries(statusRecord)) {
        gridCells.push({
          isHeader: false,
          adventurerStatusKey,
          monsterStatusKey,
          desc: game.i18n.localize(status.description),
        });
      }
    }

    return gridCells;
  }

  /**
   * @this {SurpriseMatrix}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #rollSurprise(event, target) {
    debugger;
    const adventurerStatusKey = target.dataset.adventurerStatus;
    const monsterStatusKey = target.dataset.monsterStatus;
    /** @type {SurpriseMatrixEntry} */
    const surpriseData = SURPRISE_MATRIX[adventurerStatusKey][monsterStatusKey];
    const friendlyModifier = this.element.querySelector("input[name='friendlyGlobalMod']")?.valueAsNumber ?? 0;
    const hostileModifier = this.element.querySelector("input[name='hostileGlobalMod']")?.valueAsNumber ?? 0;

    const monsters = [...this.options.pools.hostile, ...this.options.pools.neutral, ...this.options.pools.secret];
    const adventurers = this.options.pools.friendly;

    // surpriseAdventurers = the modifier added to the Monsters' surprise roll based on the adventuring party.
    // surpriseMonsters    = the modifier added to the Adventurers' surprise roll based on the monster opponents.
    // The modifier should be set to the "most positive" of all "Surprise Others" attributes.
    // For example if one actor has a -2 Surprise Others, but all other actors are just 0 (no modifier),
    // the 0 overrides the -2 and is considered worse modifier.
    // If an actor is "clumsy" and has a positive modifier, while other actors have 0, the positive number is used.
    // In all cases, the most positive (max) number is picked.
    // Both default to a large negative number then increase.
    let surpriseAdventurers = -200;
    let surpriseMonsters = -200;
    for (const c of monsters) {
      surpriseAdventurers = Math.max(surpriseAdventurers, c.actor.system.surprise.surpriseothers);
    }
    for (const c of adventurers) {
      surpriseMonsters = Math.max(surpriseMonsters, c.actor.system.surprise.surpriseothers);
    }

    for (const c of monsters) {
      //const actorModifier = this.modifiers[c.id] || 0;
      const actorModifier = 0; // TODO: get individual modifiers
      const roll = await new Roll(
        "1d6+" +
          c.actor.system.surprise.mod +
          "+" +
          surpriseMonsters +
          "+" +
          c.actor.system.surprise.avoidsurprise +
          "+" +
          surpriseData.monster.modifier +
          "+" +
          hostileModifier +
          "+" +
          actorModifier,
      ).roll();
      const surprised = roll.total <= 2;
      const formula = roll.formula;
      const msgText = surprised ? "ACKS.surprise.surprised" : "ACKS.surprise.notsurprised";
      const message = game.i18n.format(msgText, { name: c.actor.name, result: roll.total, surprised, formula });
      const chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: c.actor }),
        content: message,
      };
      if (c.token.hidden || c.hidden) {
        chatData.whisper = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
      }
      await ChatMessage.create(chatData);
      if (surprised) {
        AcksUtility.addUniqueStatus(c.actor, "surprised");
      }
    }

    for (const c of adventurers) {
      //const actorModifier = this.modifiers[c.id] || 0;
      const actorModifier = 0; // TODO: get individual modifiers
      const roll = await new Roll(
        "1d6+" +
          c.actor.system.surprise.mod +
          "+" +
          surpriseAdventurers +
          "+" +
          c.actor.system.surprise.avoidsurprise +
          "+" +
          surpriseData.adventurer.modifier +
          "+" +
          friendlyModifier +
          "+" +
          actorModifier,
      ).roll();
      const formula = roll.formula;
      const surprised = roll.total <= 2;
      const msgText = surprised ? "ACKS.surprise.surprised" : "ACKS.surprise.notsurprised";
      const message = game.i18n.format(msgText, { name: c.actor.name, result: roll.total, surprised, formula });
      const chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: c.actor }),
        content: message,
      };
      await ChatMessage.create(chatData);
      if (surprised) {
        AcksUtility.addUniqueStatus(c.actor, "surprised");
      }
    }

    //this.close();
    //this.object.combatData.internalStartCombat(); // Restarts the combat !
  }

  /**
   * @this {SurpriseMatrix}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #setIndividualModifiers(event, target) {}
}

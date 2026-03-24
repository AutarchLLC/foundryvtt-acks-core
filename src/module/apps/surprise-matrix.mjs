/* global foundry, game, Roll, ChatMessage */
import { SURPRISE_MATRIX } from "../constants.mjs";
import { AcksUtility } from "../utility.js";
import ACKSDialog from "../dialog/dialog.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class SurpriseMatrix extends HandlebarsApplicationMixin(ApplicationV2) {
  #individualMods = {};

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
    const adventurerStatusKey = target.dataset.adventurerStatus;
    const monsterStatusKey = target.dataset.monsterStatus;
    /** @type {SurpriseMatrixEntry} */
    const surpriseData = SURPRISE_MATRIX[adventurerStatusKey][monsterStatusKey];

    if (!surpriseData.isEncounter) {
      // if no encounter we return early without rolling anything.
      this.close();
      return;
    }

    const friendlyModifier = this.element.querySelector("input[name='friendlyGlobalMod']")?.valueAsNumber ?? 0;
    const hostileModifier = this.element.querySelector("input[name='hostileGlobalMod']")?.valueAsNumber ?? 0;

    const monsters = [...this.options.pools.hostile, ...this.options.pools.neutral, ...this.options.pools.secret];
    const adventurers = [...this.options.pools.friendly];

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

    // roll monster surprise if needed
    if (surpriseData.monster.canBeSurprised) {
      // We find the smallest Surprise Others modifier that adventurers have.
      // Please note that we actually are looking for the highest number.
      // This is because we assume that most actors will have this listed as negative penalty.
      // But some actors might be super clumsy and extra noisy, and they can have this as positive.
      // For example, we have 3 characters - one is very stealthy and has -2 Surprise Others, second is nothing special
      // and has 0; third one is super clumsy for some reason and has +2.
      // In this case we have to pick +2 - this party has less chance to surprise.
      // TODO: check if it is intended to be able to have positive Surprise Others.
      // TODO: make it clear what we expect Surprise Others to be in the UI.
      const surprisePenaltyFromAdventurers = adventurers.reduce(
        (penalty, combatant) => Math.max(penalty, combatant.actor.system.surprise.surpriseothers),
        -Infinity,
      );

      for (const combatant of monsters) {
        const personalMod = this.#individualMods[combatant.actor.uuid] ?? 0;
        const rollData = {
          surprisePenalty: surprisePenaltyFromAdventurers,
          avoidSurprise: combatant.actor.system.surprise.avoidsurprise,
          statusMod: surpriseData.monster.modifier,
          globalMod: hostileModifier,
          personalMod,
        };
        const formula = "1d6 + @surprisePenalty + @avoidSurprise + @statusMod + @globalMod + @personalMod";
        const roll = new Roll(formula, rollData);
        await roll.evaluate();

        const isSurprised = roll.total <= 2;

        // TODO: improve message so it clearly lists all modifiers and die roll
        const msgKey = isSurprised ? "ACKS.surprise.surprised" : "ACKS.surprise.notsurprised";
        const message = game.i18n.format(msgKey, { result: roll.total, formula: roll.formula });
        const chatData = {
          author: game.user.id,
          speaker: ChatMessage.getSpeaker({ actor: combatant.actor }),
          content: message,
        };
        if (combatant.token.hidden || combatant.hidden) {
          chatData.whisper = ChatMessage.getWhisperRecipients("GM");
        }
        await ChatMessage.create(chatData);

        if (isSurprised) {
          AcksUtility.addUniqueStatus(combatant.actor, "surprised");
        }
      }
    }

    // roll adventurer surprise if needed
    if (surpriseData.adventurer.canBeSurprised) {
      const surprisePenaltyFromMonsters = monsters.reduce(
        (penalty, combatant) => Math.max(penalty, combatant.actor.system.surprise.surpriseothers),
        -Infinity,
      );

      for (const combatant of adventurers) {
        const personalMod = this.#individualMods[combatant.actor.uuid] ?? 0;
        const rollData = {
          surprisePenalty: surprisePenaltyFromMonsters,
          avoidSurprise: combatant.actor.system.surprise.avoidsurprise,
          statusMod: surpriseData.adventurer.modifier,
          globalMod: friendlyModifier,
          personalMod,
        };
        const formula = "1d6 + @surprisePenalty + @avoidSurprise + @statusMod + @globalMod + @personalMod";
        const roll = new Roll(formula, rollData);
        await roll.evaluate();

        const isSurprised = roll.total <= 2;

        // TODO: improve message so it clearly lists all modifiers and die roll
        const msgKey = isSurprised ? "ACKS.surprise.surprised" : "ACKS.surprise.notsurprised";
        const message = game.i18n.format(msgKey, { result: roll.total, formula: roll.formula });
        const chatData = {
          author: game.user.id,
          speaker: ChatMessage.getSpeaker({ actor: combatant.actor }),
          content: message,
        };
        await ChatMessage.create(chatData);

        if (isSurprised) {
          AcksUtility.addUniqueStatus(combatant.actor, "surprised");
        }
      }
    }

    this.close();
    this.options.combat.internalStartCombat(); // Starts the combat!
  }

  /**
   * @this {SurpriseMatrix}
   * @param {PointerEvent} _event
   * @param {HTMLElement} _target
   */
  static async #setIndividualModifiers(_event, _target) {
    const combatants = [
      ...this.options.pools.friendly,
      ...this.options.pools.hostile,
      ...this.options.pools.neutral,
      ...this.options.pools.secret,
    ];
    this.#individualMods = await ACKSDialog.inputIndividualSurpriseModifiers(combatants, this.#individualMods);
  }
}

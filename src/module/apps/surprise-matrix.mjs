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
    /** @type {AcksCombat | null} */
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
   * Rolls surprise for a group of combatants against an opposing group.
   *
   * The surprise penalty applied to this group is determined by the highest
   * "Surprise Others" value among the opponents. The most positive value is used
   * because a clumsy or noisy opponent worsens the chance to avoid surprise.
   * TODO: check if it is intended to be able to have positive Surprise Others.
   * TODO: make it clear what we expect Surprise Others to be in the UI.
   *
   * @param {object[]} combatants - The group being checked for surprise.
   * @param {object[]} opponents - The opposing group whose noise/stealth sets the penalty.
   * @param {{ modifier: number }} surpriseInfo - The surprise matrix entry for this group.
   * @param {number} globalModifier - The global modifier for this group (friendly or hostile).
   * @param {boolean} hideHidden - Whether to hide the surprise results for hidden combatants.
   * @returns {Promise<void>}
   */
  async #rollSurpriseForGroup(combatants, opponents, surpriseInfo, globalModifier, hideHidden = false) {
    // We find the highest "Surprise Others" among opponents because:
    // - Most actors list this as a negative penalty (stealthy = -2).
    // - A clumsy/noisy actor can have a positive value (+2), which hurts the group more.
    // - We always take the worst-case (max) value for the defending group.
    const surprisePenalty = opponents.reduce(
      (penalty, combatant) => Math.max(penalty, combatant.actor.system.surprise.surpriseothers),
      -Infinity,
    );

    for (const combatant of combatants) {
      const personalMod = this.#individualMods[combatant.actor.uuid] ?? 0;
      const rollData = {
        surprisePenalty,
        avoidSurprise: combatant.actor.system.surprise.avoidsurprise,
        statusMod: surpriseInfo.modifier,
        globalMod: globalModifier,
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
      if (hideHidden) {
        if (combatant.token?.hidden || combatant.hidden) {
          chatData.whisper = ChatMessage.getWhisperRecipients("GM");
        }
      }
      await ChatMessage.create(chatData);

      if (isSurprised) {
        AcksUtility.addUniqueStatus(combatant.actor, "surprised");
      }
    }
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

    if (surpriseData.monster.canBeSurprised) {
      await this.#rollSurpriseForGroup(monsters, adventurers, surpriseData.monster, hostileModifier, true);
    }

    if (surpriseData.adventurer.canBeSurprised) {
      await this.#rollSurpriseForGroup(adventurers, monsters, surpriseData.adventurer, friendlyModifier);
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

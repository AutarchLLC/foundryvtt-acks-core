/* global Roll, game, ChatMessage, foundry, CONFIG */
import * as ACKSDialog from "./dialog/index.mjs";
import { ROLL_TYPE } from "./constants.mjs";

export default class AcksDice {
  /**
   * Digest the roll result based on the roll type and return a structured result object
   * @param data
   * @param {Roll} roll - Foundry Roll instance
   * @return {TRollResult}
   */
  static #digestResult(data, roll) {
    /** @type {TRollResult} */
    const result = {
      isSuccess: false,
      isFailure: false,
      target: data.roll.target,
      total: roll.total,
    };
    const die = roll.terms[0].total;

    switch (data.roll.type) {
      case ROLL_TYPE.ABOVE:
        if (roll.total >= result.target) {
          result.isSuccess = true;
        } else {
          result.isFailure = true;
        }
        break;

      case ROLL_TYPE.BELOW:
        if (roll.total <= result.target) {
          result.isSuccess = true;
        } else {
          result.isFailure = true;
        }
        break;

      case ROLL_TYPE.CHECK:
        if (die === 1 || (roll.total <= result.target && die < 20)) {
          result.isSuccess = true;
        } else {
          result.isFailure = true;
        }
        break;

      case ROLL_TYPE.HIT_DICE:
        if (roll.total < 1) {
          roll._total = 1;
        }
        break;

      case ROLL_TYPE.TABLE: {
        if (roll.total < 2) {
          roll._total = 2;
        }
        const table = data.roll.table;
        let output = "";
        for (let i = 0; i <= roll.total; i++) {
          if (table[i]) {
            output = table[i];
          }
        }
        result.details = output;
        break;
      }
    }

    return result;
  }

  /**
   *
   * @param {TRollOptions} options
   * @return {Promise<Roll>}
   */
  static async #sendRoll(options) {
    const template = "systems/acks/templates/chat/roll-result.hbs";

    const chatData = {
      user: game.user.id,
      speaker: options.speaker,
    };

    const templateData = {
      title: options.title,
      flavor: options.flavor,
      data: options.data,
    };

    // Optionally include a situational bonus
    if (options.rollDetails?.bonus) {
      options.parts.push(options.rollDetails.bonus);
    }

    const roll = new Roll(options.parts.join("+"), options.data);
    await roll.evaluate();

    // Determine roll mode
    let rollMode = options.rollDetails?.rollMode ?? game.settings.get("core", "rollMode");

    // Force blind roll (ability formulas)
    if (options.data.roll.blindroll) {
      rollMode = game.user.isGM ? "selfroll" : "blindroll";
    }

    if (["gmroll", "blindroll"].includes(rollMode)) {
      chatData.whisper = ChatMessage.getWhisperRecipients("GM");
    }
    if (rollMode === "selfroll") {
      chatData.whisper = [game.user.id];
    } else if (rollMode === "blindroll") {
      chatData.blind = true;
      options.data.roll.blindroll = true;
    }

    templateData.result = AcksDice.#digestResult(options.data, roll);
    templateData.rollACKS = await roll.render();

    chatData.content = await foundry.applications.handlebars.renderTemplate(template, templateData);

    // Dice So Nice
    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true, chatData.whisper, chatData.blind);
    } else {
      chatData.sound = CONFIG.sounds.dice;
    }

    ChatMessage.create(chatData);
    return roll;
  }

  /**
   *
   * @param {TRollOptions}[options={}] - roll options
   * @return {Promise<unknown>}
   */
  static async roll(options = {}) {
    /** @type TRollOptions */
    const DEFAULT_OPTIONS = {
      parts: [],
      data: {},
      skipDialog: false,
      speaker: null,
      flavor: null,
      title: "",
    };
    /** @type TRollOptions */
    const rollOptions = Object.assign(DEFAULT_OPTIONS, options);

    if (rollOptions.skipDialog) {
      return AcksDice.#sendRoll(rollOptions);
    }

    const dialogData = {
      formula: rollOptions.parts.join(" "),
      data: rollOptions.data,
      rollMode: game.settings.get("core", "rollMode"),
      rollModes: CONFIG.Dice.rollModes,
    };

    const rollDetails = await ACKSDialog.getRollDetails({ title: rollOptions.title, dialogData });

    if (rollDetails) {
      rollOptions.rollDetails = rollDetails;
      return AcksDice.#sendRoll(rollOptions);
    }
  }
}

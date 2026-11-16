/* global game, foundry */
import * as ACKSDialog from "../dialog/index.mjs";

export class AcksUtility {
  /**
   * Checks for minimum Foundry version
   * @param {number} minVersion - major Foundry Version, i.e. 13
   * @return {boolean} true if version is minVersion or more
   */
  static isMinVersion(minVersion) {
    return game.release.generation >= minVersion;
  }

  static roundToEven(num) {
    // Get the fractional part
    const fraction = Math.abs(num) - Math.floor(Math.abs(num));

    // If exactly 0.5
    if (fraction === 0.5) {
      // Round to the nearest even integer
      const floorValue = Math.floor(num);
      return floorValue % 2 === 0 ? floorValue : floorValue + 1;
    }

    // Otherwise use normal rounding
    return Math.round(num);
  }

  static setupSocket() {
    game.socket.on("system.acks", async (data) => {
      if (data.type === "rollInitiative" && game.user.isGM) {
        let combat = game.combats.get(data.combatId);
        combat.rollInitiative(data.ids, data.options);
      }
    });
  }

  static displayWelcomeMessage() {
    /** @type {string} */
    const lastWelcomeVersion = game.settings.get("acks", "welcomeMessageVersion") ?? "";

    if (!lastWelcomeVersion || foundry.utils.isNewerVersion(game.system.version, lastWelcomeVersion)) {
      game.settings.set("acks", "welcomeMessageVersion", game.system.version);
      void ACKSDialog.showWelcomeMessage();
    }
  }

  static async getCompendiumDocuments(compendium) {
    const pack = game.packs.get(compendium);
    return (await pack?.getDocuments()) ?? [];
  }

  static async loadCompendium(compendium, filter = (_item) => true) {
    const compendiumData = await AcksUtility.getCompendiumDocuments(compendium);
    return compendiumData.filter(filter);
  }

  /**
   * Apply a status effect registered in CONFIG.statusEffects, unless the actor already has it.
   * @param {Actor} actor
   * @param {string} statusId
   * @returns {Promise<unknown>}
   */
  static addUniqueStatus(actor, statusId) {
    return actor.toggleStatusEffect(statusId, { active: true });
  }

  /**
   * Remove every effect carrying the given status from the actor.
   * @param {Actor} actor
   * @param {string} statusId
   * @returns {Promise<void>}
   */
  static async removeEffect(actor, statusId) {
    const ids = actor.effects.filter((it) => it.statuses.has(statusId)).map((it) => it.id);
    if (ids.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    }
  }

  static async prepareActiveEffectCategories(effects) {
    // Define effect header categories
    const categories = {
      temporary: {
        type: "temporary",
        label: game.i18n.localize("ACKS.Effect.Temporary"),
        effects: [],
      },
      passive: {
        type: "passive",
        label: game.i18n.localize("ACKS.Effect.Passive"),
        effects: [],
      },
      inactive: {
        type: "inactive",
        label: game.i18n.localize("ACKS.Effect.Inactive"),
        effects: [],
      },
    };

    // Iterate over active effects, classifying them into categories
    for (const effect of effects) {
      effect.updateDuration();
      if (effect.disabled) {
        categories.inactive.effects.push(effect);
      } else if (effect.isTemporary) {
        categories.temporary.effects.push(effect);
      } else {
        categories.passive.effects.push(effect);
      }
    }
    return categories;
  }
}

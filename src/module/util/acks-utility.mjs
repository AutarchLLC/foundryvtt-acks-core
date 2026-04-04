/* global game, foundry */
import { ACKS } from "../config.mjs";
import ACKSDialog from "../dialog/dialog.mjs";

export class AcksUtility {
  /**
   * Checks for minimum Foundry version
   * @param {number} minVersion - major Foundry Version, i.e. 13
   * @return {boolean} true if version is minVersion or more
   */
  static isMinVersion(minVersion) {
    return game.release.generation >= minVersion;
  }

  static updateWeightsLanguages() {
    // TODO: write proper migration using data model
    for (const actor of game.actors) {
      actor.updateWeight();
      actor.updateLanguages();
      actor.updateImplements();
    }
    for (const item of game.items) {
      item.updateWeight();
    }
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
      void ACKSDialog.showWelcomeMessage(game.i18n.localize("ACKS.Welcome.Message"));
    }
  }

  static async loadCompendiumData(compendium) {
    const pack = game.packs.get(compendium);
    return (await pack?.getDocuments()) ?? [];
  }

  static async loadCompendium(compendium, filter = (_item) => true) {
    const compendiumData = await AcksUtility.loadCompendiumData(compendium);
    return compendiumData.filter(filter);
  }

  static prepareActiveEffect(effectId) {
    let status = ACKS.statusEffects.find((it) => it.id.includes(effectId));
    if (status) {
      status = foundry.utils.duplicate(status);
      status.statuses = [effectId];
    }
    return status;
  }

  static addUniqueStatus(actor, statusId) {
    const status = actor.effects.find((it) => it.statuses.has(statusId));
    if (!status) {
      const effect = this.prepareActiveEffect(statusId);
      actor.createEmbeddedDocuments("ActiveEffect", [effect]);
    }
  }

  static async removeEffect(actor, statusId) {
    const effect = actor.effects.find((it) => it.statuses.has(statusId));
    if (effect) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", [effect.id]);
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

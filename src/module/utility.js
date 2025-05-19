import { AcksMortalWoundsDialog } from "./dialog/mortal-wounds.js";
import { AcksTamperingDialog } from "./dialog/tampering-mortality.js";

export class AcksUtility {
  /* -------------------------------------------- */
  static updateWeightsLanguages() {
    for (let a of game.actors) {
      a.updateWeight();
      a.updateLanguages();
      a.updateImplements();
    }
    for (let i of game.items) {
      i.updateWeight();
    }
  }

  /* -------------------------------------------- */
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

  /* -------------------------------------------- */
  static addButtons(app, html, data) {
    const button = document.createElement("button");
    button.style.width = "45%";
    button.innerHTML = "Mortal Wounds";
    button.addEventListener("click", () => {
      let cr = new AcksMortalWoundsDialog();
      cr.init();
    });
    const buttonTampering = document.createElement("button");
    buttonTampering.style.width = "45%";
    buttonTampering.innerHTML = "Tampering";
    buttonTampering.addEventListener("click", () => {
      let cr = new AcksTamperingDialog();
      cr.init();
    });
    html.find(".header-actions").after(buttonTampering);
    html.find(".header-actions").after(button);
  }

  /* -------------------------------------------- */
  static setupSocket() {
    game.socket.on("system.acks", async (data) => {
      console.log("ACKS SOCKET", data);
      if (data.type === "rollInitiative" && game.user.isGM) {
        let combat = game.combats.get(data.combatId);
        combat.rollInitiative(data.ids, data.options);
      }
    });
  }

  /* -------------------------------------------- */
  static displayWelcomeMessage() {
    let welcomeMessage = game.settings.get("acks", "welcome-message-13-0");
    console.log("WELCOME", welcomeMessage);
    if (!welcomeMessage) {
      game.settings.set("acks", "welcome-message-13-0", true);
      // New dialog with full message
      let d = new Dialog(
        {
          title: game.i18n.localize("ACKS.Welcome.Title"),
          content: `<p>${game.i18n.localize("ACKS.Welcome.Message-13-0")}</p>`,
          buttons: {
            ok: {
              icon: '<i class="fas fa-check"></i>',
              label: game.i18n.localize("ACKS.Welcome.Button"),
            },
          },
          default: "ok",
        },
        { width: 720 },
      );
      d.render(true);
    }
  }

  /* -------------------------------------------- */
  static async loadCompendiumData(compendium) {
    const pack = game.packs.get(compendium);
    return (await pack?.getDocuments()) ?? [];
  }

  /* -------------------------------------------- */
  static async loadCompendium(compendium, filter = (item) => true) {
    let compendiumData = await AcksUtility.loadCompendiumData(compendium);
    return compendiumData.filter(filter);
  }

  /* -------------------------------------------- */
  static prepareActiveEffect(effectId) {
    let status = CONFIG.ACKS.statusEffects.find((it) => it.id.includes(effectId));
    if (status) {
      status = foundry.utils.duplicate(status);
      status.statuses = [effectId];
    }
    return status;
  }

  /* -------------------------------------------- */
  static addUniqueStatus(actor, statusId) {
    let status = actor.effects.find((it) => it.statuses.has(statusId));
    if (!status) {
      let effect = this.prepareActiveEffect(statusId);
      actor.createEmbeddedDocuments("ActiveEffect", [effect]);
    }
  }

  static async removeEffect(actor, statusId) {
    let effect = actor.effects.find((it) => it.statuses.has(statusId));
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
    for (let e of effects) {
      if (e.disabled) categories.inactive.effects.push(e);
      else if (e.isTemporary) categories.temporary.effects.push(e);
      else categories.passive.effects.push(e);
    }
    return categories;
  }

  static async onManageActiveEffect(event, owner) {
    event.preventDefault();
    const a = event.currentTarget;
    const li = a.closest("li");
    let effect = li.dataset.effectId ? owner.effects.get(li.dataset.effectId) : null;
    switch (a.dataset.action) {
      case "create":
        effect = await ActiveEffect.implementation.create(
          {
            name: game.i18n.format("DOCUMENT.New", { type: game.i18n.localize("DOCUMENT.ActiveEffect") }),
            transfer: true,
            img: "icons/svg/aura.svg",
            origin: owner.uuid,
            "duration.rounds": li.dataset.effectType === "temporary" ? 1 : undefined,
            disabled: li.dataset.effectType === "inactive",
            changes: [{}],
          },
          { parent: owner },
        );
        return effect.sheet.render(true);
      case "edit":
        return effect.sheet.render(true);
      case "delete":
        return effect.delete();
      case "toggle":
        return effect.update({ disabled: !effect.disabled });
    }
  }
}

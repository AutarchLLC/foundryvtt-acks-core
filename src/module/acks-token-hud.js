/* -------------------------------------------- */
import { AcksUtility } from "./utility.js";

/* -------------------------------------------- */
export class AcksTokenHud {
  static init() {
    // Integration du TokenHUD
    Hooks.on("renderTokenHUD", (app, html, data) => {
      AcksTokenHud.addTokenHudExtensions(app, html, data._id);
    });
  }

  /* -------------------------------------------- */
  static async removeExtensionHud(app, html, tokenId) {
    html.find(".control-icon.acks-roll").remove();
    html.find(".control-icon.acks-action").remove();
  }

  /* -------------------------------------------- */
  static async addExtensionHud(app, $html, tokenId) {
    let token = canvas.tokens.get(tokenId);
    let actor = token.actor;
    app.hasExtension = true;

    const hudData = { token: token, actor: actor, mode: "action", actionsList: actor.buildFavoriteActions() };

    const controlIconActions = $html.find(".control-icon[data-action=combat]");
    // initiative
    await AcksTokenHud._configureSubMenu(
      controlIconActions,
      "systems/acks/templates/token/hud-actor-actions.html",
      hudData,
      (event) => {
        let actionIndex = Number(event.currentTarget.attributes["data-action-index"].value);
        let action = hudData.actionsList[actionIndex];
        const actionItem = actor.items.get(action._id);
        if (actionItem.type == "weapon") {
          actionItem.rollWeapon();
        } else if (actionItem.type == "spell") {
          actionItem.spendSpell();
        } else {
          actionItem.rollFormula();
        }
      },
    );

    const hudRolls = { token: token, actor: actor, mode: "roll", rollsList: actor.buildRollList() };
    const controlIconTarget = $html.find(".control-icon[data-action=config]");
    // att+apt+career
    await AcksTokenHud._configureSubMenu(
      controlIconTarget,
      "systems/acks/templates/token/hud-actor-rolls.html",
      hudRolls,
      (event) => {
        let rollIndex = Number(event.currentTarget.attributes["data-roll-index"].value);
        let roll = hudRolls.rollsList[rollIndex];
        actor.rollCheck(roll.key);
      },
    );
  }

  /* -------------------------------------------- */
  static async addTokenHudExtensions(app, html, tokenId) {
    const $html = AcksUtility.isMinVersion(13) ? $(html) : html;
    const controlIconCombat = $html.find(".control-icon[data-action=combat]");
    if (controlIconCombat.length > 0) {
      AcksTokenHud.addExtensionHud(app, $html, tokenId);
    }
  }

  /* -------------------------------------------- */
  static async _configureSubMenu(insertionPoint, template, hudData, onMenuItem) {
    const hud = $(await renderTemplate(template, hudData));
    const list = hud.find("div.acks-hud-list");

    if (hudData.token.document.getFlag("acks", "hud-" + hudData.mode)) {
      hud.addClass("active");
      list.show();
    } else {
      hud.removeClass("active");
      list.hide();
    }
    //AcksTokenHud._toggleHudListActive(hud, list, hudData);

    hud.find("img.acks-hud-togglebutton").click((event) => AcksTokenHud._toggleHudListActive(hud, list, hudData));
    list.find(".acks-hud-menu").click(onMenuItem);

    insertionPoint.after(hud);
  }

  /* -------------------------------------------- */
  static _showControlWhen(control, condition, hudData) {
    if (condition) {
      control.show();
      hudData.token.document.setFlag("acks", "hud-" + hudData.mode, true);
    } else {
      control.hide();
      hudData.token.document.setFlag("acks", "hud-" + hudData.mode, false);
    }
  }

  /* -------------------------------------------- */
  static _toggleHudListActive(hud, list, hudData) {
    hud.toggleClass("active");
    AcksTokenHud._showControlWhen(list, hud.hasClass("active"), hudData);
  }
}

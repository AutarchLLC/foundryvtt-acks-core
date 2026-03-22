/* global foundry, game */
import { ACKS } from "./config.js";

/*******************************************************/
export class AcksSurprise extends FormApplication {
  /*******************************************************/
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Surprise Selector",
      classes: ["acks", "dialog", "party-sheet"],
      template: "systems/acks/templates/apps/dialog-surprise.html",
      width: 820,
      height: 450,
      resizable: false,
    });
  }

  /*******************************************************/
  /**
   * Construct and return the data object used to render the HTML template for this form application.
   * @return {Object}
   */
  getData() {
    this.modifiers = {}; // Reset per actor modifier
    const data = {
      data: this.object,
      user: game.user,
    };
    return data;
  }

  /*******************************************************/
  getHostiles() {
    return this.object.pools.hostile;
  }
  getFriendly() {
    return this.object.pools.friendly;
  }
  setActorModifier(cId, value) {
    this.modifiers[cId] = value;
  }

  /*******************************************************/
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find("#surprise-actor-modifiers").click((ev) => {
      let surpriseActorDialog = new AcksActorSurprise({ surpriseDialog: this });
      surpriseActorDialog.render(true);
    });
  }
}

export class AcksActorSurprise extends FormApplication {
  /*******************************************************/
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Per actor surprise modifiers",
      classes: ["acks", "dialog", "party-sheet"],
      template: "systems/acks/templates/apps/dialog-actor-surprise-modifier.html",
      width: 360,
      height: 280,
      resizable: false,
    });
  }

  /*******************************************************/
  /**
   * Construct and return the data object used to render the HTML template for this form application.
   * @return {Object}
   */
  getData() {
    const data = {
      data: this.object,
      config: foundry.utils.duplicate(ACKS),
      user: game.user,
      hostiles: this.object.surpriseDialog.getHostiles(),
      friendlies: this.object.surpriseDialog.getFriendly(),
    };
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    let myself = this;

    html.find("#close-actor-surprise").click((ev) => {
      this.close();
    });

    html.find(".actor-surprise-modifier").click((ev) => {
      let cId = $(ev.currentTarget).data("cid");
      myself.object.surpriseDialog.setActorModifier(cId, $(ev.currentTarget).val());
    });
  }
}

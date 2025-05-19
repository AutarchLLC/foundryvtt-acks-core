/*******************************************************/
import { AcksUtility } from "./utility.js";
import { AcksCombat } from "./combat.js";

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
      config: foundry.utils.duplicate(CONFIG.ACKS),
      user: game.user,
    };
    for (let key in data.config.surpriseTableAdventurers) {
      let sData = data.config.surpriseTableAdventurers[key];
      for (let key1 in sData) {
        let sData1 = sData[key1];
        sData1.localized = game.i18n.localize(sData1.description);
      }
    }
    return data;
  }

  /*******************************************************/
  async rollSurprise(surpriseDef, friendlyModifier = 0, hostileModifier = 0) {
    console.log(
      "Rolling surprise",
      surpriseDef,
      friendlyModifier,
      hostileModifier,
      this.object.pools.hostile,
      this.object.pools.friendly,
    );
    let monsters = this.object.pools.hostile;
    let adventurers = this.object.pools.friendly;

    // surpriseAdventurers = the modifier added to the Monsters' surprise roll based on the adventuring party.
    // surpriseMonsters    = the modifier added to the Adventurers' surprise roll based on the monster opponents.
    // The modifier should be set to the "most positive" of all "Surprise Others" attributes.
    // For example if one actor has a -2 Surprise Others, but all other actors are just 0 (no modifier),
    // the 0 overrides the -2 and is considered the worse modifier.
    // If an actor is "clumsy" and has a positive modifier, while other actors have 0, the positive number is used.
    // In all cases, the most positive (max) number is picked.
    // Both default to a large negative number then increase.
    let surpriseAdventurers = -200;
    let surpriseMonsters = -200;
    for (let c of monsters) {
      surpriseAdventurers = Math.max(surpriseAdventurers, c.actor.system.surprise.surpriseothers);
    }
    for (let c of adventurers) {
      surpriseMonsters = Math.max(surpriseMonsters, c.actor.system.surprise.surpriseothers);
    }

    for (let c of monsters) {
      console.log("Combatant", c);
      let actorModifier = this.modifiers[c.id] || 0;
      let roll = await new Roll(
        "1d6+" +
          c.actor.system.surprise.mod +
          "+" +
          surpriseMonsters +
          "+" +
          c.actor.system.surprise.avoidsurprise +
          "+" +
          surpriseDef.monsterModifier +
          "+" +
          hostileModifier +
          "+" +
          actorModifier,
      ).roll();
      let surprised = roll.total <= 2;
      let formula = roll.formula;
      let msgText = surprised ? "ACKS.surprise.surprised" : "ACKS.surprise.notsurprised";
      let message = game.i18n.format(msgText, { name: c.actor.name, result: roll.total, surprised, formula });
      let chatData = {
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

    for (let c of adventurers) {
      let actorModifier = this.modifiers[c.id] || 0;
      let roll = await new Roll(
        "1d6+" +
          c.actor.system.surprise.mod +
          "+" +
          surpriseAdventurers +
          "+" +
          c.actor.system.surprise.avoidsurprise +
          "+" +
          surpriseDef.adventurerModifier +
          "+" +
          friendlyModifier +
          "+" +
          actorModifier,
      ).roll();
      let formula = roll.formula;
      let surprised = roll.total <= 2;
      let msgText = surprised ? "ACKS.surprise.surprised" : "ACKS.surprise.notsurprised";
      let message = game.i18n.format(msgText, { name: c.actor.name, result: roll.total, surprised, formula });
      let chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: c.actor }),
        content: message,
      };
      ChatMessage.create(chatData);
      if (surprised) {
        AcksUtility.addUniqueStatus(c.actor, "surprised");
      }
    }

    // Now roll initiative
    //AcksCombat.individualInitiative(this.object.combatData, this.object.diff);
    this.close();
    this.object.combatData.internalStartCombat(); // Restarts the combat !
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
    let myself = this;

    html.find("#surprise-actor-modifiers").click((ev) => {
      let surpriseActorDialog = new AcksActorSurprise({ surpriseDialog: this });
      surpriseActorDialog.render(true);
    });

    html.find(".roll-surprise-button").click(async (ev) => {
      let keyA = $(ev.currentTarget).data("key-adventurer");
      let keyM = $(ev.currentTarget).data("key-monster");
      let surpriseDef = CONFIG.ACKS.surpriseTableAdventurers[keyA][keyM];
      let friendlyModifier = $("#surprise-friendly-modifier").val();
      let hostileModifier = $("#surprise-hostile-modifier").val();
      await myself.rollSurprise(surpriseDef, friendlyModifier, hostileModifier);
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
      config: foundry.utils.duplicate(CONFIG.ACKS),
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

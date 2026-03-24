/* global Item, foundry, TextEditor, ui, ChatMessage, game, CONST, canvas */
import { AcksDice } from "../dice.js";
import { createTagHtmlString } from "../util/html-util.mjs";
import { ACKS } from "../config.js";
import ACKSDialog from "../dialog/dialog.mjs";

/**
 * Override and extend the basic :class:`Item` implementation
 */
export default class AcksItem extends Item {
  constructor(data, context) {
    super(data, context);
  }

  /**
   * Determine default artwork based on the provided item data.
   * @param {ItemData} itemData  The source item data.
   * @returns {{img: string}}    Candidate item image.
   */
  static getDefaultArtwork(itemData) {
    const { type } = itemData;
    switch (type) {
      case "spell":
        return { img: "systems/acks/assets/default/spell.png" };
      case "ability":
        return { img: "systems/acks/assets/default/ability.png" };
      case "armor":
        return { img: "systems/acks/assets/default/armor.png" };
      case "weapon":
        return { img: "systems/acks/assets/default/weapon.png" };
      case "money":
        return { img: "systems/acks/assets/gold.png" };
      case "language":
        return { img: "systems/acks/assets/icons/language.png" };
      default:
        return { img: "systems/acks/assets/default/item.png" };
    }
  }

  static chatListeners(html) {
    html.addEventListener("click", (event) => {
      if (event.target.closest(".card-buttons button")) {
        this.#onChatCardAction(event);
      } else if (event.target.closest(".item-name")) {
        this.#onChatCardToggleContent(event);
      }
    });
  }

  async getChatData(htmlOptions) {
    const data = foundry.utils.duplicate(this);

    // Rich text description
    data.description = await TextEditor.enrichHTML(this.system.description, { ...{ async: true }, ...htmlOptions });
    data.system = this.system;

    // Item properties
    const props = [];

    if (this.type === "weapon") {
      this.system.tags.forEach((t) => props.push(t.value));
    }
    if (this.type === "spell") {
      props.push(`${this.system.class} ${this.system.lvl}`, this.system.range, this.system.duration);
    }
    if (foundry.utils.hasProperty(this.system, "equipped")) {
      props.push(this.system.equipped ? "Equipped" : "Not Equipped");
    }

    // Filter properties and return
    data.properties = props.filter((p) => !!p);
    return data;
  }

  rollWeapon(options = {}) {
    const isNPC = this.actor.type !== "character";
    let type = isNPC ? "attack" : "melee";
    const rollData = {
      item: this.toObject(),
      actor: this.actor.toObject(),
      roll: {
        save: this.system.save,
        target: null,
      },
    };

    if (this.system.missile && this.system.melee && !isNPC) {
      ACKSDialog.showAttackRangeSelector(this.actor, rollData, options);
      return true;
    } else if (this.system.missile && !isNPC) {
      type = "missile";
    }
    this.actor.targetAttack(rollData, type, options);
    return true;
  }

  async rollFormula(options = {}) {
    if (!this.system.roll) {
      ui.notifications.warn("This Item does not have a formula to roll!");
      return null;
    }

    const label = `${this.name}`;
    const rollParts = [this.system.roll];
    const type = this.system.rollType;

    const newData = {
      actor: this.actor.toObject(),
      item: this.toObject(),
      roll: {
        type: type,
        target: this.system.rollTarget,
        blindroll: this.system.blindroll,
      },
    };

    // Roll and return
    return AcksDice.Roll({
      event: options.event,
      parts: rollParts,
      data: newData,
      skipDialog: true, // TODO: why we always are skipping dialog? Can't we have bonuses to proficiency rolls?
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("ACKS.roll.formula", { label: label }),
      title: game.i18n.format("ACKS.roll.formula", { label: label }),
    });
  }

  spendSpell() {
    this.update({ "system.cast": this.system.cast + 1 }).then(() => {
      void this.show();
    });
  }

  getTags() {
    switch (this.type) {
      case "weapon": {
        let tagHtmlString = createTagHtmlString(this.system.damage, "fa-tint");
        this.system.tags.forEach((t) => {
          tagHtmlString += createTagHtmlString(t.value);
        });
        tagHtmlString += createTagHtmlString(ACKS.saves_long[this.system.save], "fa-skull");
        if (this.system.missile) {
          tagHtmlString += createTagHtmlString(
            this.system.range.short + "/" + this.system.range.medium + "/" + this.system.range.long,
            "fa-bullseye",
          );
        }
        return tagHtmlString;
      }
      case "armor":
        return `${createTagHtmlString(ACKS.armor[this.system.type], "fa-tshirt")}`;
      case "item":
        return "";
      case "spell": {
        let tagHtmlString = `${createTagHtmlString(this.system.class)}${createTagHtmlString(
          this.system.range,
        )}${createTagHtmlString(this.system.duration)}${createTagHtmlString(this.system.roll)}`;
        if (this.system.save) {
          tagHtmlString += createTagHtmlString(ACKS.saves_long[this.system.save], "fa-skull");
        }
        return tagHtmlString;
      }
      case "ability": {
        let roll = "";
        roll += this.system.roll ? this.system.roll : "";
        roll += this.system.rollTarget ? ACKS.roll_type[this.system.rollType] : "";
        roll += this.system.rollTarget ? this.system.rollTarget : "";
        return `${createTagHtmlString(this.system.requirements)}${createTagHtmlString(roll)}`;
      }
    }
    return "";
  }

  pushTag(values) {
    let update = [];
    if (this.system.tags) {
      update = foundry.utils.duplicate(this.system.tags);
    }
    const newData = {};
    const regExp = /\(([^)]+)\)/;
    if (update) {
      values.forEach((val) => {
        // Catch infos in brackets
        const matches = regExp.exec(val);
        let title;
        if (matches) {
          title = matches[1];
          val = val.substring(0, matches.index).trim();
        } else {
          val = val.trim();
          title = val;
        }
        // Auto fill checkboxes
        switch (val) {
          case ACKS.tags.melee:
            newData.melee = true;
            break;
          case ACKS.tags.slow:
            newData.slow = true;
            break;
          case ACKS.tags.missile:
            newData.missile = true;
            break;
        }
        update.push({ title: title, value: val });
      });
    } else {
      update = values;
    }
    newData.tags = update;
    return this.update({ system: newData });
  }

  popTag(value) {
    const update = this.system.tags.filter((el) => el.value !== value);
    const newData = {
      tags: update,
    };
    return this.update({ system: newData });
  }

  roll() {
    switch (this.type) {
      case "weapon":
        this.rollWeapon();
        break;
      case "spell":
        this.spendSpell();
        break;
      case "ability":
        if (this.system.roll) {
          void this.rollFormula();
        } else {
          void this.show();
        }
        break;
      case "item":
      case "armor":
      case "language":
      case "money":
        void this.show();
    }
  }

  /**
   * Show the item to Chat, creating a chat card which contains follow-up attack or damage roll options
   * @return {Promise}
   */
  async show() {
    // Basic template rendering data
    const token = this.actor.token;
    const templateData = {
      actor: this.actor.toObject(),
      tokenId: token ? `${token.parent.id}.${token.id}` : null,
      item: this.toObject(),
      data: await this.getChatData(),
      labels: this.labels,
      isHealing: this.isHealing,
      hasDamage: this.hasDamage,
      isSpell: this.type === "spell",
      hasSave: this.hasSave,
      config: ACKS,
    };
    // Render the chat card template
    const template = `systems/acks/templates/chat/item-card.hbs`;
    const html = await foundry.applications.handlebars.renderTemplate(template, templateData);

    // Basic chat message data
    const chatData = {
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      speaker: {
        actor: this.actor.id,
        token: this.actor.token,
        alias: this.actor.name,
      },
    };

    // Toggle default roll mode
    const rollMode = game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode)) {
      chatData.whisper = ChatMessage.getWhisperRecipients("GM");
    }
    if (rollMode === "selfroll") {
      chatData.whisper = [game.user.id];
    }
    if (rollMode === "blindroll") {
      chatData.blind = true;
    }

    // Create the chat message
    return ChatMessage.create(chatData);
  }

  /**
   * Handle toggling the visibility of chat card content when the name is clicked
   * @param {Event} event   The originating click event
   * @private
   */
  static #onChatCardToggleContent(event) {
    event.preventDefault();
    const header = event.target;
    const card = header.closest(".chat-card");
    const content = card.querySelector(".card-content");

    if (content.classList.contains("expanded")) {
      content.classList.remove("expanded");
    } else {
      content.classList.add("expanded");
    }
  }

  updateWeight() {
    if (this.system?.weight !== undefined && this.system?.weight6 === -1) {
      let nbStones6 = Math.ceil(this.system.weight / 166.66);
      this.update({ "system.weight6": nbStones6, "system.weight": -1 });
    }
  }

  static async #onChatCardAction(event) {
    event.preventDefault();

    // Extract card data
    const button = event.target;
    button.disabled = true;
    const card = button.closest(".chat-card");
    const messageId = card.closest(".message").dataset.messageId;
    const message = game.messages.get(messageId);
    const action = button.dataset.action;

    // Validate permission to proceed with the roll
    const isTargeted = action === "save";
    if (!(isTargeted || game.user.isGM || message.isAuthor)) {
      ui.notifications.warn(`You do not have permission to use this feature for the selected chat card.`);
      return;
    }
    // Get the Actor from a synthetic Token
    const actor = this._getChatCardActor(card);
    if (!actor) {
      ui.notifications.warn("Unable to get the actor");
      return;
    }
    // Get the Item
    const item = actor.items.get(card.dataset.itemId);
    if (!item) {
      return ui.notifications.error(
        `The requested item ${card.dataset.itemId} no longer exists on Actor ${actor.name}`,
      );
    }

    // Get card targets
    let targets = [];
    if (isTargeted) {
      targets = this._getChatCardTargets(card);
    }

    // Attack and Damage Rolls
    if (action === "damage") {
      await item.rollDamage({ event });
    } else if (action === "formula") {
      await item.rollFormula({ event });
    }
    // Saving Throws for card targets
    else if (action === "save") {
      if (!targets.length) {
        ui.notifications.warn(`You must have one or more controlled Tokens in order to use this option.`);
        return (button.disabled = false);
      }
      for (const t of targets) {
        await t.rollSave(button.dataset.save, { event });
      }
    }

    // Re-enable the button
    button.disabled = false;
  }

  static _getChatCardActor(card) {
    // Case 1 - a synthetic actor from a Token
    const tokenKey = card.dataset.tokenId;
    if (tokenKey) {
      const [sceneId, tokenId] = tokenKey.split(".");
      const scene = game.scenes.get(sceneId);
      if (!scene) {
        return null;
      }
      const tokenData = scene.tokens.get(tokenId);
      if (!tokenData) {
        return null;
      }
      const token = new foundry.canvas.placeables.Token(tokenData);
      return token.actor;
    }

    // Case 2 - use Actor ID directory
    const actorId = card.dataset.actorId;
    return game.actors.get(actorId) || null;
  }

  static _getChatCardTargets(_card) {
    const character = game.user.character;
    const controlled = canvas.tokens.controlled;
    const targets = controlled.reduce((arr, t) => (t.actor ? arr.concat([t.actor]) : arr), []);
    if (character && controlled.length === 0) {
      targets.push(character);
    }
    return targets;
  }
}

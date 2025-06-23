import { AcksDice } from "../dice.js";
import { AcksUtility } from "../utility.js";

/**
 * Override and extend the basic :class:`Item` implementation
 */
export class AcksItem extends Item {
  constructor(data, context) {
    if (!data.img) {
      let img = "systems/acks/assets/default/item.png";
      switch (data.type) {
        case "spell":
          img = "systems/acks/assets/default/spell.png";
          break;
        case "ability":
          img = "systems/acks/assets/default/ability.png";
          break;
        case "armor":
          img = "systems/acks/assets/default/armor.png";
          break;
        case "weapon":
          img = "systems/acks/assets/default/weapon.png";
          break;
        case "money":
          img = "systems/acks/assets/gold.png";
          break;
        case "language":
          img = "systems/acks/assets/icons/language.png";
          break;
      }
      data.img = img;
    }
    super(data, context);
  }

  static chatListeners(html) {
    const $html = AcksUtility.isMinVersion(13) ? $(html) : html;
    $html.on("click", ".card-buttons button", this._onChatCardAction.bind(this));
    $html.on("click", ".item-name", this._onChatCardToggleContent.bind(this));
  }

  async getChatData(htmlOptions) {
    const data = foundry.utils.duplicate(this);

    // Rich text description
    data.description = await TextEditor.enrichHTML(this.system.description, { ...{ async: true }, ...htmlOptions });
    data.system = this.system;

    // Item properties
    const props = [];

    if (this.type == "weapon") {
      this.system.tags.forEach((t) => props.push(t.value));
    }
    if (this.type == "spell") {
      props.push(`${this.system.class} ${this.system.lvl}`, this.system.range, this.system.duration);
    }
    if (this.system.hasOwnProperty("equipped")) {
      props.push(this.system.equipped ? "Equipped" : "Not Equipped");
    }

    // Filter properties and return
    data.properties = props.filter((p) => !!p);
    return data;
  }

  rollWeapon(options = {}) {
    let isNPC = this.actor.type != "character";
    const targets = 5;
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
      // Dialog
      new Dialog({
        title: "Choose Attack Range",
        content: "",
        buttons: {
          melee: {
            icon: '<i class="fas fa-fist-raised"></i>',
            label: "Melee",
            callback: () => {
              this.actor.targetAttack(rollData, "melee", options);
            },
          },
          missile: {
            icon: '<i class="fas fa-bullseye"></i>',
            label: "Missile",
            callback: () => {
              this.actor.targetAttack(rollData, "missile", options);
            },
          },
        },
        default: "melee",
      }).render(true);
      return true;
    } else if (this.system.missile && !isNPC) {
      type = "missile";
    }
    this.actor.targetAttack(rollData, type, options);
    return true;
  }

  async rollFormula(options = {}) {
    if (!this.system.roll) {
      throw new Error("This Item does not have a formula to roll!");
    }

    const label = `${this.name}`;
    const rollParts = [this.system.roll];

    let type = this.system.rollType;

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
      skipDialog: true,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("ACKS.roll.formula", { label: label }),
      title: game.i18n.format("ACKS.roll.formula", { label: label }),
    });
  }

  spendSpell() {
    this.update({ "system.cast": this.system.cast + 1 }).then(() => {
      this.show({ skipDialog: true });
    });
  }

  getTags() {
    let formatTag = (tag, icon) => {
      if (!tag) return "";
      let fa = "";
      if (icon) {
        fa = `<i class="fas ${icon}"></i> `;
      }
      return `<li class='tag'>${fa}${tag}</li>`;
    };

    let wTags, sTags, roll;
    switch (this.type) {
      case "weapon":
        wTags = formatTag(this.system.damage, "fa-tint");
        this.system.tags.forEach((t) => {
          wTags += formatTag(t.value);
        });
        wTags += formatTag(CONFIG.ACKS.saves_long[this.system.save], "fa-skull");
        if (this.system.missile) {
          wTags += formatTag(
            this.system.range.short + "/" + this.system.range.medium + "/" + this.system.range.long,
            "fa-bullseye",
          );
        }
        return wTags;
      case "armor":
        return `${formatTag(CONFIG.ACKS.armor[this.system.type], "fa-tshirt")}`;
      case "item":
        return "";
      case "spell":
        sTags = `${formatTag(this.system.class)}${formatTag(
          this.system.range,
        )}${formatTag(this.system.duration)}${formatTag(this.system.roll)}`;
        if (this.system.save) {
          sTags += formatTag(CONFIG.ACKS.saves_long[this.system.save], "fa-skull");
        }
        return sTags;
      case "ability":
        roll = "";
        roll += this.system.roll ? this.system.roll : "";
        roll += this.system.rollTarget ? CONFIG.ACKS.roll_type[this.system.rollType] : "";
        roll += this.system.rollTarget ? this.system.rollTarget : "";
        return `${formatTag(this.system.requirements)}${formatTag(roll)}`;
    }
    return "";
  }

  pushTag(values) {
    let update = [];
    if (this.system.tags) {
      update = foundry.utils.duplicate(this.system.tags);
    }
    let newData = {};
    let regExp = /\(([^)]+)\)/;
    if (update) {
      values.forEach((val) => {
        // Catch infos in brackets
        let matches = regExp.exec(val);
        let title = "";
        if (matches) {
          title = matches[1];
          val = val.substring(0, matches.index).trim();
        } else {
          val = val.trim();
          title = val;
        }
        // Auto fill checkboxes
        switch (val) {
          case CONFIG.ACKS.tags.melee:
            newData.melee = true;
            break;
          case CONFIG.ACKS.tags.slow:
            newData.slow = true;
            break;
          case CONFIG.ACKS.tags.missile:
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
    let update = this.system.tags.filter((el) => el.value != value);
    let newData = {
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
          this.rollFormula();
        } else {
          this.show();
        }
        break;
      case "item":
      case "armor":
      case "language":
      case "money":
        this.show();
    }
  }

  /**
   * Show the item to Chat, creating a chat card which contains follow up attack or damage roll options
   * @return {Promise}
   */
  async show() {
    console.log("Showing item", this);
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
      config: CONFIG.ACKS,
    };
    //console.log("Template data", templateData);
    // Render the chat card template
    const template = `systems/acks/templates/chat/item-card.html`;
    const html = await renderTemplate(template, templateData);

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
    let rollMode = game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if (rollMode === "selfroll") chatData["whisper"] = [game.user.id];
    if (rollMode === "blindroll") chatData["blind"] = true;

    // Create the chat message
    return ChatMessage.create(chatData);
  }

  /**
   * Handle toggling the visibility of chat card content when the name is clicked
   * @param {Event} event   The originating click event
   * @private
   */
  static _onChatCardToggleContent(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const card = header.closest(".chat-card");
    const content = card.querySelector(".card-content");
    if (content.style.display == "none") {
      $(content).slideDown(200);
    } else {
      $(content).slideUp(200);
    }
  }

  updateWeight() {
    if (this.system?.weight != undefined && this.system?.weight6 == -1) {
      let nbStones6 = Math.ceil(this.system.weight / 166.66);
      this.update({ "system.weight6": nbStones6, "system.weight": -1 });
    }
  }

  static async _onChatCardAction(event) {
    event.preventDefault();

    // Extract card data
    const button = event.currentTarget;
    button.disabled = true;
    const card = button.closest(".chat-card");
    const messageId = card.closest(".message").dataset.messageId;
    const message = game.messages.get(messageId);
    const action = button.dataset.action;

    console.log("Chat card action", action, event, message);
    // Validate permission to proceed with the roll
    const isTargetted = action === "save";
    if (!(isTargetted || game.user.isGM || message.isAuthor)) {
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
    if (isTargetted) {
      targets = this._getChatCardTargets(card);
    }

    // Attack and Damage Rolls
    if (action === "damage") {
      await item.rollDamage({ event });
    } else if (action === "formula") {
      await item.rollFormula({ event });
    }
    // Saving Throws for card targets
    else if (action == "save") {
      if (!targets.length) {
        ui.notifications.warn(`You must have one or more controlled Tokens in order to use this option.`);
        return (button.disabled = false);
      }
      for (let t of targets) {
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
      if (!scene) return null;
      const tokenData = scene.tokens.get(tokenId);
      if (!tokenData) return null;
      const token = new Token(tokenData);
      return token.actor;
    }

    // Case 2 - use Actor ID directory
    const actorId = card.dataset.actorId;
    return game.actors.get(actorId) || null;
  }

  static _getChatCardTargets(card) {
    const character = game.user.character;
    const controlled = canvas.tokens.controlled;
    const targets = controlled.reduce((arr, t) => (t.actor ? arr.concat([t.actor]) : arr), []);
    if (character && controlled.length === 0) targets.push(character);
    return targets;
  }
}

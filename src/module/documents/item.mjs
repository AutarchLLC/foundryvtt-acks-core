/* global Item, foundry, ui, ChatMessage, game, CONST */
import AcksDice from "../dice.mjs";
import { ACKS } from "../config.mjs";
import ACKSDialog from "../dialog/dialog.mjs";
import { ACTOR_TYPE, ATTACK_TYPE, ITEM_TYPE } from "../constants.mjs";
import { AcksHtmlUtil } from "../util/html-util.mjs";

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
   * @override
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

  async getChatData() {
    const data = foundry.utils.duplicate(this);

    // Rich text description
    data.description = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.system.description);
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

  /**
   *
   * @param {TItemRollOptions} options
   * @return {boolean}
   */
  rollWeapon(options = {}) {
    const isNPC = this.actor.type !== ACTOR_TYPE.PC;
    /** @type ATTACK_TYPE */
    let type = isNPC ? ATTACK_TYPE.ATTACK : ATTACK_TYPE.MELEE;
    /** @type TItemRollData */
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
      type = ATTACK_TYPE.MISSILE;
    }
    this.actor.targetAttack(rollData, type, options);
    return true;
  }

  /**
   *
   * @param {TItemRollOptions} options
   * @return {Promise<*>}
   */
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
    return AcksDice.roll({
      event: options.event,
      parts: rollParts,
      data: newData,
      skipDialog: true, // TODO: why we always are skipping dialog? Can't we have bonuses to proficiency rolls?
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("ACKS.roll.formula", { label: label }),
      title: game.i18n.format("ACKS.roll.formula", { label: label }),
    });
  }

  /**
   *
   * @param {TItemRollOptions} _options
   */
  async spendSpell(_options = {}) {
    await this.update({ "system.cast": this.system.cast + 1 });
    void this.showChatCard();
  }

  getTags() {
    switch (this.type) {
      case ITEM_TYPE.WEAPON: {
        let tagHtmlString = AcksHtmlUtil.createTagHtmlString(this.system.damage.base.formula, "fa-tint");
        this.system.customTags.forEach((tag) => {
          tagHtmlString += AcksHtmlUtil.createTagHtmlString(tag);
        });
        tagHtmlString += AcksHtmlUtil.createTagHtmlString(ACKS.saves_long[this.system.save], "fa-skull");
        if (this.system.isRanged) {
          tagHtmlString += AcksHtmlUtil.createTagHtmlString(
            this.system.range.short + "/" + this.system.range.medium + "/" + this.system.range.long,
            "fa-bullseye",
          );
        }
        return tagHtmlString;
      }
      case ITEM_TYPE.ARMOR:
        return `${AcksHtmlUtil.createTagHtmlString(ACKS.armor[this.system.type], "fa-tshirt")}`;
      case ITEM_TYPE.SPELL: {
        let tagHtmlString = `${AcksHtmlUtil.createTagHtmlString(this.system.class)}${AcksHtmlUtil.createTagHtmlString(
          this.system.range,
        )}${AcksHtmlUtil.createTagHtmlString(this.system.duration)}${AcksHtmlUtil.createTagHtmlString(this.system.roll)}`;
        if (this.system.save) {
          tagHtmlString += AcksHtmlUtil.createTagHtmlString(ACKS.saves_long[this.system.save], "fa-skull");
        }
        return tagHtmlString;
      }
      case ITEM_TYPE.PROFICIENCY: {
        let roll = "";
        roll += this.system.roll ? this.system.roll : "";
        roll += this.system.rollTarget ? ACKS.roll_type[this.system.rollType] : "";
        roll += this.system.rollTarget ? this.system.rollTarget : "";
        return `${AcksHtmlUtil.createTagHtmlString(this.system.requirements)}${AcksHtmlUtil.createTagHtmlString(roll)}`;
      }
      default:
        return "";
    }
  }

  use() {
    switch (this.type) {
      case ITEM_TYPE.WEAPON:
        this.rollWeapon();
        break;
      case ITEM_TYPE.SPELL:
        void this.spendSpell();
        break;
      case ITEM_TYPE.PROFICIENCY:
        if (this.system.roll) {
          void this.rollFormula();
        } else {
          void this.showChatCard();
        }
        break;
      case ITEM_TYPE.ITEM:
      case ITEM_TYPE.ARMOR:
      case ITEM_TYPE.LANGUAGE:
      case ITEM_TYPE.MONEY:
        void this.showChatCard();
        break;
      case ITEM_TYPE.BUNDLE:
      default:
        // do nothing
        break;
    }
  }

  /**
   * Show the item to Chat
   * @return {Promise}
   */
  async showChatCard() {
    // Basic template rendering data
    const token = this.actor.token;
    const templateContext = {
      actor: this.actor.toObject(),
      tokenId: token ? `${token.parent.id}.${token.id}` : null,
      item: this.toObject(),
      data: await this.getChatData(),
      config: ACKS,
    };
    // Render the chat card template
    const template = `systems/acks/templates/chat/item-card.hbs`;
    const html = await foundry.applications.handlebars.renderTemplate(template, templateContext);

    // Basic chat message data
    const chatData = {
      user: game.user.id,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
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
}

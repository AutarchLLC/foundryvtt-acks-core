/* global Actor, game, ChatMessage, foundry, ui, Roll */
import AcksDice from "../dice.mjs";
import { AcksUtility } from "../util/acks-utility.mjs";
import { ACTOR_TYPE, ITEM_TYPE, ROLL_TYPE } from "../constants.mjs";
import * as ACKSDialog from "../dialog/index.mjs";
import { buildAttackThrow, normalizeChoices } from "../throw/attack-throw-builder.mjs";
import { getDamageTotal, resolveAttackThrow, rollDamage } from "../throw/attack-throw-resolution.mjs";
import { getTargetLabels } from "../throw/target-visibility.mjs";
import { createAttackThrowMessage } from "../throw/attack-throw-message.mjs";

export default class AcksActor extends Actor {
  static async create(data, options) {
    // Case of compendium global import
    if (data instanceof Array) {
      return super.create(data, options);
    }
    AcksActor.#moveDeprecatedIsNew(data);
    // If the created actor has items (only applicable to foundry.utils.duplicated actors) bypass the new actor creation logic
    if (data.items) {
      return super.create(data, options);
    }

    // Flag the actor as new, unless the caller says otherwise
    AcksActor.#defaultIsNewFlag(data, true);
    if (data.type === ACTOR_TYPE.PC) {
      const skills = await AcksUtility.loadCompendium("acks.acks-all-equipment");
      data.items = skills.map((i) => i.toObject()).filter((i) => i.type === ITEM_TYPE.MONEY);
    }

    return super.create(data, options);
  }

  /**
   * Move a `system.isNew` passed in creation data to the `flags.acks.isNew` flag, which replaced it.
   * A flag passed alongside it wins.
   * TODO: remove in 15.0.0, together with the compatibility warning.
   * @param {object} data  Actor creation data. Mutated in place.
   */
  static #moveDeprecatedIsNew(data) {
    if (data.system?.isNew === undefined) {
      return;
    }
    foundry.utils.logCompatibilityWarning(
      "ACKS | Actor creation data system.isNew is deprecated. Pass flags.acks.isNew instead.",
      { since: "14.3.0", until: "15.0.0" },
    );
    const { isNew, ...system } = data.system;
    data.system = system;
    AcksActor.#defaultIsNewFlag(data, isNew);
  }

  /**
   * Set the `flags.acks.isNew` flag in creation data, unless the data already gives it.
   * @param {object} data  Actor creation data. Mutated in place.
   * @param {boolean} isNew
   */
  static #defaultIsNewFlag(data, isNew) {
    data.flags = foundry.utils.mergeObject({ acks: { isNew } }, data.flags ?? {}, { inplace: false });
  }

  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate(changes, options, user);
    if (allowed === false) return false;

    // Rolling or editing scores (characters) or saves (monsters) ends the "new actor" state.
    // Sheets submit every field, so compare against the source to catch real changes only.
    const key = { character: "scores", monster: "saves" }[this.type];
    const incoming = key && changes.system?.[key];
    if (
      this.isNew() &&
      incoming &&
      !foundry.utils.isEmpty(foundry.utils.diffObject(this._source.system[key], incoming))
    ) {
      foundry.utils.setProperty(changes, "flags.acks.isNew", false);
    }
    return allowed;
  }

  async _onUpdate(changed, options, userId) {
    if (this.type === ACTOR_TYPE.PC && this.system.retainer?.enabled && this.system.retainer?.managerid !== "") {
      let manager = game.actors.get(this.system.retainer.managerid);
      if (manager && manager.sheet.rendered) {
        manager.sheet.render();
      }
    }
    if (changed.system?.retainer?.enabled === false && this.system.retainer.managerid !== "") {
      this.#releaseFromManager(userId);
    }
    await super._onUpdate(changed, options, userId);
  }

  /**
   * Remove this actor from its manager's henchmen list. Document events fire on every client, so only one
   * client acts: the user who made the change if they own the manager, otherwise the active GM.
   * @param {string} userId  The user who triggered the change
   */
  #releaseFromManager(userId) {
    const manager = game.actors.get(this.system.retainer.managerid);
    if (!manager) return;
    const requester = game.users.get(userId);
    const handler = manager.testUserPermission(requester, "OWNER") ? requester : game.users.activeGM;
    if (handler?.isSelf) manager.delHenchman(this.id);
  }

  /**
   * Post-process a deletion operation for a single Document instance. Post-operation events occur for all connected
   * clients.
   *
   * @param {object} options            Additional options which modify the deletion request
   * @param {string} userId             The id of the User requesting the document update
   * @protected
   */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    if (this.system.retainer?.enabled && this.system.retainer?.managerid) {
      this.#releaseFromManager(userId);
    }
  }

  async getExperience(value) {
    if (this.type !== ACTOR_TYPE.PC) {
      return;
    }

    const modified = Math.floor(value + (this.system.details.xp.bonus * value) / 100);

    await this.update({
      "system.details.xp.value": modified + this.system.details.xp.value,
    });

    const speaker = ChatMessage.getSpeaker({ actor: this });
    await ChatMessage.create({
      content: game.i18n.format("ACKS.messages.GetExperience", {
        name: this.name,
        value: modified,
      }),
      speaker,
    });
  }

  manageMoney(name, quantity) {
    let money = this.items.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (!money) {
      return;
    }
    let newValue = Number(money.system.quantity) + Number(quantity);
    if (newValue < 0) {
      newValue = 0;
    }
    money.update({ "system.quantity": newValue });
  }

  /**
   * Return true if the character has a "heavy helmet" equipped, false otherwise
   * @return {boolean}
   */
  hasHeavyHelm() {
    if (this.type !== ACTOR_TYPE.PC) {
      return false;
    }
    let hasHeavyHelm = false;
    this.items.forEach((item) => {
      if (
        item.type === ITEM_TYPE.ARMOR &&
        item.system.equipped &&
        item.name.toLowerCase().includes("heavy") &&
        item.name.toLowerCase().includes("helmet")
      ) {
        hasHeavyHelm = true;
      }
    });
    return hasHeavyHelm;
  }

  getHitDie() {
    const hdParts = this.system.hp.hd.toLowerCase().trim().split("d");
    const hdValue = hdParts.length > 1 ? parseInt(hdParts[1]) : parseInt(hdParts[0]);
    return `d${hdValue}`;
  }

  getMaxHitPoints() {
    return this.system.hp.max;
  }

  getCurrentHitPoints() {
    return this.system.hp.value;
  }

  getConModifier() {
    if (this.type !== ACTOR_TYPE.PC) {
      return 0;
    }
    return this.system.scores.con.mod;
  }

  getWillModifier() {
    if (this.type !== ACTOR_TYPE.PC) {
      return 0;
    }
    return this.system.scores.wis.mod;
  }

  getHenchmen() {
    //TODO: remake so we are working with DocumentUUIDField
    if (this.type !== ACTOR_TYPE.PC) {
      return [];
    }

    const subActors = [];
    for (const id of this.system.henchmenList) {
      const hireling = game.actors.get(id);
      if (hireling) {
        const hirelingCopy = foundry.utils.duplicate(hireling);
        subActors.push(hirelingCopy);
      }
    }
    return subActors;
  }

  /**
   *
   * @return {{henchman: string[], mercenary: string[], specialist: string[]}}
   */
  getHirelings() {
    const hirelings = this.getHenchmen() ?? [];

    const henchman = [];
    const mercenary = [];
    const specialist = [];

    for (const hireling of hirelings) {
      switch (hireling.system.retainer.category) {
        case "mercenary":
          mercenary.push(hireling);
          break;
        case "specialist":
          specialist.push(hireling);
          break;
        default:
          henchman.push(hireling);
          break;
      }
    }

    return { henchman, mercenary, specialist };
  }

  async requestHenchman(subActorId) {
    const henchman = game.actors.get(subActorId);
    if (!henchman) {
      return;
    }
    const title = `Assign ${henchman.name} as a Hireling of ${this.name} ?`; // TODO: localize
    const message = "It will enable the Hireling flag in the actor, as well as a linked token actor."; // TODO: localize

    const result = await ACKSDialog.confirm(title, message);

    if (result) {
      await henchman.update({ "system.retainer.enabled": true, "prototypeToken.actorLink": true });
      await this.addHenchman(subActorId);
    }
  }

  async addHenchman(subActorId) {
    if (this.type !== ACTOR_TYPE.PC) {
      ui.notifications.error(game.i18n.localize("ACKS.error.HenchmanCharacter"));
      return;
    }
    const npc = game.actors.get(subActorId);
    if (npc?.type !== ACTOR_TYPE.PC) {
      ui.notifications.error(game.i18n.localize("ACKS.error.HenchmanMonster"));
      return;
    }
    if (!npc?.system.retainer?.enabled) {
      await this.requestHenchman(subActorId);
      return;
    }
    // Check if it is a linked character
    if (!npc.prototypeToken.actorLink) {
      await this.requestHenchman(subActorId);
      return;
    }
    // Check if the owner is a  linked character
    if (!this.prototypeToken.actorLink) {
      ui.notifications.error(game.i18n.localize("ACKS.error.ActorLinked"));
      return;
    }
    // Check if the henchman is already in another actor
    const henchmen = game.actors.filter((a) => a.type === ACTOR_TYPE.PC && a.system.henchmenList.includes(subActorId));
    if (henchmen.length > 0) {
      ui.notifications.error(game.i18n.localize("ACKS.error.HenchmanAlready"));
      return;
    }
    const subActors = foundry.utils.duplicate(this.system.henchmenList);
    subActors.push(subActorId);
    await this.update({ "system.henchmenList": subActors });

    // Set the name of the manager in the henchman data
    await npc.update({ "system.retainer.managerid": this.id });
  }

  async delHenchman(subActorId) {
    const newArray = [];
    for (const id of this.system.henchmenList) {
      if (id !== subActorId) {
        newArray.push(id);
      }
    }
    await this.update({ "system.henchmenList": newArray });
    // Cleanup the manager id
    const npc = game.actors.get(subActorId);
    if (npc) {
      await npc.update({ "system.retainer.managerid": "" });
    }
  }

  showHenchman(henchmanId) {
    const henchman = game.actors.get(henchmanId);
    if (henchman) {
      henchman.sheet.render(true);
    }
  }

  /**
   *
   * @return {string}
   */
  getManagerName() {
    if (this.type !== ACTOR_TYPE.PC || this.system.retainer?.managerid === "") {
      return "";
    }
    let manager = game.actors.get(this.system.retainer.managerid);
    return manager?.name ?? "";
  }

  getTotalWages() {
    let total = 0;
    if (this.type !== ACTOR_TYPE.PC) {
      return 0;
    }
    this.system.henchmenList.forEach((id) => {
      const henchman = game.actors.get(id);
      if (henchman) {
        const q = henchman.system.retainer?.quantity || 1;
        total += Number(henchman.system.retainer.wage) * Number(q);
      }
    });
    return total;
  }

  payWages() {
    if (this.type !== ACTOR_TYPE.PC) {
      return;
    }

    let totalWages = this.getTotalWages() * 100;
    const totalMoney = this.getTotalMoneyGC() * 100;
    if (totalWages > totalMoney) {
      ui.notifications.error(game.i18n.localize("ACKS.error.NotEnoughMoney"));
      return;
    }
    // Get GC item
    const moneyItems = this.items.filter((i) => i.type === ITEM_TYPE.MONEY);
    // Sort money items per coppervalue, descending order
    moneyItems.sort((a, b) => a.system.coppervalue - b.system.coppervalue);
    // Loop through money items and decrement the totalWages value (expressed in copper)
    for (const item of moneyItems) {
      let quantity = Math.floor(totalWages / item.system.coppervalue);
      if (quantity > item.system.quantity) {
        quantity = item.system.quantity;
      }
      totalWages -= quantity * item.system.coppervalue;
      item.update({ "system.quantity": item.system.quantity - quantity });
      if (totalWages === 0) {
        break;
      }
    }
    // Send result chat message
    const speaker = ChatMessage.getSpeaker({ actor: this });
    ChatMessage.create({
      content: game.i18n.format("ACKS.messages.PayWages", {
        name: this.name,
        value: this.getTotalWages(),
      }),
      speaker,
    });
  }

  getTotalMoneyGC() {
    let total = 0;
    this.items.forEach((item) => {
      if (item.type === ITEM_TYPE.MONEY) {
        total += item.system.quantity * item.system.coppervalue;
      }
    });
    return total / 100;
  }

  /**
   * Whether the actor is new: freshly created, with scores (character) or saves (monster) not yet set.
   * The sheet prompts to roll them while this is true.
   * @returns {boolean}
   */
  isNew() {
    return this.getFlag("acks", "isNew") ?? false;
  }

  async updateSavingThrows(savingThrows) {
    await this.update({
      "system.saves": {
        paralysis: { value: savingThrows.p },
        death: { value: savingThrows.d },
        blast: { value: savingThrows.b },
        implements: { value: savingThrows.i },
        spell: { value: savingThrows.s },
      },
    });
  }

  /**
   *
   * @param autoUpdate
   * @return {Promise<Roll>}
   */
  async rollHP(autoUpdate = true) {
    const roll = new Roll(this.system.hp.hd);
    await roll.evaluate();

    if (autoUpdate) {
      await this.update({
        system: {
          hp: {
            max: roll.total,
            value: roll.total,
          },
        },
      });
    }
    return roll;
  }

  rollAdventuring(advKey, options = {}) {
    const label = game.i18n.localize(`ACKS.adventuring.${advKey}`);
    const rollParts = ["1d20"];

    const data = {
      actor: this,
      roll: {
        type: ROLL_TYPE.ABOVE,
        target: this.system.adventuring[advKey],
      },
      details: game.i18n.format("ACKS.roll.details.adventuring", {
        adventuring: label,
      }),
    };

    let skip = false;
    const skipKey = game.settings.get("acks", "skip-dialog-key");
    if (options.event && options.event[skipKey]) {
      skip = true;
    }

    // Roll and return
    return AcksDice.roll({
      event: options.event,
      parts: rollParts,
      data,
      skipDialog: skip,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("ACKS.roll.adventuring", { adventuring: label }),
      title: game.i18n.format("ACKS.roll.adventuring", { adventuring: label }),
    });
  }

  rollSave(save, options = {}) {
    const label = game.i18n.localize(`ACKS.saves.${save}.long`);
    const rollParts = ["1d20"];
    if (this.type === ACTOR_TYPE.PC) {
      rollParts.push(this.system.save.mod);
      rollParts.push(this.system.scores.wis.mod);
    }

    const data = {
      actor: this,
      roll: {
        type: ROLL_TYPE.ABOVE,
        target: this.system.saves[save].value,
      },
      details: game.i18n.format("ACKS.roll.details.save", { save: label }),
    };

    let skip = false;
    const skipKey = game.settings.get("acks", "skip-dialog-key");
    if (options.event && options.event[skipKey]) {
      skip = true;
    }

    // Roll and return
    return AcksDice.roll({
      event: options.event,
      parts: rollParts,
      data,
      skipDialog: skip,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("ACKS.roll.save", { save: label }),
      title: game.i18n.format("ACKS.roll.save", { save: label }),
    });
  }

  rollMorale(options = {}) {
    const rollParts = ["2d6"];
    rollParts.push(this.system.details.morale);

    const data = {
      actor: this,
      roll: {},
    };

    let skip = false;
    const skipKey = game.settings.get("acks", "skip-dialog-key");
    if (options.event && options.event[skipKey]) {
      skip = true;
    }

    // Roll and return
    return AcksDice.roll({
      event: options.event,
      parts: rollParts,
      data,
      skipDialog: skip,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.localize("ACKS.roll.morale"),
      title: game.i18n.localize("ACKS.roll.morale"),
    });
  }

  rollLoyalty(options = {}) {
    const rollParts = ["2d6"];
    rollParts.push(this.system.retainer.loyalty);

    const data = {
      actor: this,
      roll: {
        type: ROLL_TYPE.TABLE,
        table: {
          1: game.i18n.format("ACKS.loyalty.hostility", { name: this.name }),
          3: game.i18n.format("ACKS.loyalty.resignation", { name: this.name }),
          6: game.i18n.format("ACKS.loyalty.grudging", { name: this.name }),
          9: game.i18n.format("ACKS.loyalty.loyal", { name: this.name }),
          12: game.i18n.format("ACKS.loyalty.fanatic", { name: this.name }),
        },
      },
    };

    let skip = false;
    const skipKey = game.settings.get("acks", "skip-dialog-key");
    if (options.event && options.event[skipKey]) {
      skip = true;
    }

    // Roll and return
    return AcksDice.roll({
      event: options.event,
      parts: rollParts,
      data,
      skipDialog: skip,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.localize("ACKS.loyalty.check"),
      title: game.i18n.localize("ACKS.loyalty.check"),
    });
  }

  rollReaction(options = {}) {
    const rollParts = ["2d6"];

    const data = {
      actor: this,
      roll: {
        type: ROLL_TYPE.TABLE,
        table: {
          2: game.i18n.format("ACKS.reaction.Hostile", { name: this.name }),
          3: game.i18n.format("ACKS.reaction.Unfriendly", { name: this.name }),
          6: game.i18n.format("ACKS.reaction.Neutral", { name: this.name }),
          9: game.i18n.format("ACKS.reaction.Indifferent", { name: this.name }),
          12: game.i18n.format("ACKS.reaction.Friendly", { name: this.name }),
        },
      },
    };

    let skip = false;
    const skipKey = game.settings.get("acks", "skip-dialog-key");
    if (options.event && options.event[skipKey]) {
      skip = true;
    }

    // Roll and return
    return AcksDice.roll({
      event: options.event,
      parts: rollParts,
      data,
      skipDialog: skip,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.localize("ACKS.reaction.check"),
      title: game.i18n.localize("ACKS.reaction.check"),
    });
  }

  hasEffect(effectId) {
    return this.effects.find((e) => e.statuses.has(effectId));
  }

  rollCheck(score, options = {}) {
    const label = game.i18n.localize(`ACKS.scores.${score}.long`);
    const rollParts = ["1d20"];

    const data = {
      actor: this,
      roll: {
        type: ROLL_TYPE.CHECK,
        target: this.system.scores[score].value,
      },

      details: game.i18n.format("ACKS.roll.details.attribute", {
        score: label,
      }),
    };

    let skip = false;
    const skipKey = game.settings.get("acks", "skip-dialog-key");
    if (options.event && options.event[skipKey]) {
      skip = true;
    }

    // Roll and return
    return AcksDice.roll({
      event: options.event,
      parts: rollParts,
      data,
      skipDialog: skip,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("ACKS.roll.attribute", { attribute: label }),
      title: game.i18n.format("ACKS.roll.attribute", { attribute: label }),
    });
  }

  rollHitDice(options = {}) {
    const label = game.i18n.localize(`ACKS.roll.hd`);
    const rollParts = [this.system.hp.hd];
    if (this.type === ACTOR_TYPE.PC) {
      rollParts.push(this.system.scores.con.mod * this.system.details.level);
    }

    const data = {
      actor: this,
      roll: {
        type: ROLL_TYPE.HIT_DICE,
      },
    };

    // Roll and return
    return AcksDice.roll({
      event: options.event,
      parts: rollParts,
      data,
      skipDialog: false,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: label,
      title: label,
    });
  }

  rollBHR(options = {}) {
    const label = game.i18n.localize(`ACKS.roll.bhr`);
    const rollParts = [this.system.hp.bhr];
    if (this.type === ACTOR_TYPE.PC) {
      rollParts.push();
    }

    const data = {
      actor: this,
      roll: {
        type: "Healing",
      },
    };

    // Roll and return
    return AcksDice.roll({
      event: options.event,
      parts: rollParts,
      data,
      skipDialog: true,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: label,
      title: label,
    });
  }

  rollAppearing(options = {}) {
    const rollParts = [];
    let label;
    if (options.check === "wilderness") {
      rollParts.push(this.system.details.appearing.w);
      label = "Wilderness";
    } else {
      rollParts.push(this.system.details.appearing.d);
      label = "Dungeon";
    }
    const data = {
      actor: this,
      roll: {
        type: {
          type: "appearing",
        },
      },
    };

    // Roll and return
    return AcksDice.roll({
      event: options.event,
      parts: rollParts,
      data,
      skipDialog: true,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("ACKS.roll.appearing", { type: label }),
      title: game.i18n.format("ACKS.roll.appearing", { type: label }),
    });
  }

  rollDamage(attData, options = {}) {
    const data = this.system;

    const rollData = {
      actor: this,
      item: attData.item,
      roll: {
        type: "damage",
      },
    };

    const dmgParts = [];
    if (!attData.roll.dmg) {
      dmgParts.push("1d6");
    } else {
      dmgParts.push(attData.roll.dmg);
    }

    // Add Str to damage
    if (attData.roll.type === "melee") {
      dmgParts.push(data.scores.str.mod);
    }

    // Add Melee mod to damage
    if (attData.roll.type === "melee") {
      dmgParts.push(data.damage.mod.melee);
    }

    // Add Missile mod to damage
    if (attData.roll.type === "missile") {
      dmgParts.push(data.damage.mod.missile);
    }

    // Damage roll
    return AcksDice.roll({
      event: options.event,
      parts: dmgParts,
      data: rollData,
      skipDialog: true,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${attData.label} - ${game.i18n.localize("ACKS.Damage")}`,
      title: `${attData.label} - ${game.i18n.localize("ACKS.Damage")}`,
    });
  }

  /**
   * Make an attack throw against the user's first targeted token. Shows the Attack Throw dialog unless
   * `skipDialog` is set, in which case the default choices are used. Rolls the attack throw, resolves hit, miss or
   * critical hit, rolls damage on a hit, and posts the result to chat.
   * Without an item this is a generic attack throw: any attack type can be chosen and no damage is rolled.
   * @param {TAttackThrowData} [data={}]
   * @return {Promise<?TAttackThrowOutcome>} the attack throw details, rolls and resolution, or null if the dialog was
   * dismissed
   */
  async makeAttackThrow({ item = null, attackType = null, skipDialog = false } = {}) {
    const targets = Array.from(game.user.targets);
    if (targets.length > 1) {
      ui.notifications.warn(game.i18n.localize("ACKS.Error.NotImplemented.Cleave"));
    }
    const target = targets[0]?.document ?? null;

    const choices = normalizeChoices(item, { attackType });
    const result = skipDialog
      ? buildAttackThrow(this, item, choices, target)
      : await ACKSDialog.getAttackThrowDetails(this, item, target, choices);
    if (!result) {
      return null;
    }

    const attackRoll = await new Roll(result.attack.formula, result.attack.data).evaluate();
    const resolution = resolveAttackThrow(attackRoll, result.attack.targetValue);
    const damageRoll =
      resolution.isHit && result.damage ? await rollDamage(result.damage, { isCritical: resolution.isCritical }) : null;

    /** @type {TAttackThrowOutcome} */
    const outcome = {
      result,
      attackRoll,
      resolution,
      damageRoll,
      damageTotal: damageRoll ? getDamageTotal(damageRoll) : null,
      targetLabels: getTargetLabels(this, target, result.attack.targetValue),
    };
    await createAttackThrowMessage(this, item, outcome);
    return outcome;
  }

  async applyDamage(amount = 0, multiplier = 1) {
    amount = Math.ceil(parseInt(amount) * multiplier);
    const hp = this.system.hp;

    // Remaining goes to health
    const dh = Math.clamp(hp.value - amount, -99, hp.max);

    // Update the Actor
    await this.update({
      "system.hp.value": dh,
    });
  }

  getFavorites() {
    return this.items.filter((i) => i.system.favorite);
  }

  buildFavoriteActions() {
    return this.getFavorites();
  }
}

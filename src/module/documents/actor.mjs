/* global Actor, game, ChatMessage, foundry, ui, Roll */
import AcksDice from "../dice.mjs";
import { AcksUtility } from "../util/acks-utility.mjs";
import { ACKS } from "../config.mjs";
import { ROLL_TYPE } from "../constants.mjs";
import ACKSDialog from "../dialog/dialog.mjs";

export default class AcksActor extends Actor {
  static async create(data, options) {
    // Case of compendium global import
    if (data instanceof Array) {
      return super.create(data, options);
    }
    // If the created actor has items (only applicable to foundry.utils.duplicated actors) bypass the new actor creation logic
    if (data.items) {
      return super.create(data, options);
    }

    data.system = { isNew: true }; // Flag the actor as new
    if (data.type === "character") {
      const skills = await AcksUtility.loadCompendium("acks.acks-all-equipment");
      data.items = skills.map((i) => i.toObject()).filter((i) => i.type === "money");
    }

    return super.create(data, options);
  }

  async _onUpdate(changed, options, userId) {
    if (this.type === "character" && this.system.retainer?.enabled && this.system.retainer?.managerid !== "") {
      let manager = game.actors.get(this.system.retainer.managerid);
      if (manager && manager.sheet.rendered) {
        manager.sheet.render();
      }
    }
    if (changed.system?.retainer?.enabled === false && this.system.retainer.managerid !== "") {
      let manager = game.actors.get(this.system.retainer.managerid);
      setTimeout(() => {
        manager.delHenchman(this.id);
      }, 200);
    }
    if ((this.type === "character" && changed.system?.scores) || (this.type === "monster" && changed.system?.saves)) {
      setTimeout(() => {
        this.update({ "system.isNew": false });
      }, 200);
    }
    await super._onUpdate(changed, options, userId);
  }

  /**
   * Extends data from base Actor class
   */
  computeAdditionnalData() {
    const data = this.system;

    // Compute modifiers from actor scores
    this.computeModifiers();
    this._isSlow();
    this.computeAC();
    this.computeAAB();

    // Compute modifiers from actor scores
    if (this.isOwner || game.user.isGM) {
      this.computeEncumbrance();
      this.computeBHR();
    }

    // Determine Initiative
    data.initiative.value = data.initiative.mod || 0;
    if (this.type === "character") {
      data.initiative.value += data.scores.dex.mod;
      if (data.isSlow) {
        data.initiative.value -= 1;
      }
    }

    data.movement.encounter = Math.floor((data.movement.base / 3) * 10) / 10;
    if (this.type === "character" && this.system.config.movementAuto) {
      data.movementacks.stealth = Math.floor((data.movementacks.combat / 2) * 10) / 10;
      data.movementacks.climb = Math.floor((data.movementacks.combat / 3) * 10) / 10;
    }
  }

  prepareData() {
    super.prepareData();
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    this.computeAdditionnalData();
  }

  async getExperience(value) {
    if (this.type !== "character") {
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
    if (this.type !== "character") {
      return false;
    }
    let hasHeavyHelm = false;
    this.items.forEach((item) => {
      if (
        item.type === "armor" &&
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
    if (this.type !== "character") {
      return 0;
    }
    return this.system.scores.con.mod;
  }

  getWillModifier() {
    if (this.type !== "character") {
      return 0;
    }
    return this.system.scores.wis.mod;
  }

  getHenchmen() {
    //TODO: remake so we are working with DocumentUUIDField
    if (this.type !== "character") {
      return;
    }

    let subActors = [];
    for (const id of this.system.henchmenList) {
      subActors.push(foundry.utils.duplicate(game.actors.get(id)));
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
    const title = `Assign ${henchman.name} as a Hireling of ${this.name} ?`; // TODO: localize
    const message = "It will enable the Hireling flag in the actor, as well as a linked token actor."; // TODO: localize

    const result = await ACKSDialog.confirm(title, message);

    if (result) {
      await henchman.update({ "system.retainer.enabled": true, "prototypeToken.actorLink": true });
      await this.addHenchman(subActorId);
    }
  }

  async addHenchman(subActorId) {
    if (this.type !== "character") {
      ui.notifications.error(game.i18n.localize("ACKS.error.HenchmanCharacter"));
      return;
    }
    const npc = game.actors.get(subActorId);
    if (npc?.type !== "character") {
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
    const henchmen = game.actors.filter((a) => a.type === "character" && a.system.henchmenList.includes(subActorId));
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
    await npc.update({ "system.retainer.managerid": "" });
  }

  showHenchman(henchmanId) {
    const henchman = game.actors.get(henchmanId);
    henchman.sheet.render(true);
  }

  /**
   *
   * @return {string}
   */
  getManagerName() {
    if (this.type !== "character" || this.system.retainer?.managerid === "") {
      return "";
    }
    let manager = game.actors.get(this.system.retainer.managerid);
    return manager.name;
  }

  getTotalWages() {
    let total = 0;
    if (this.type !== "character") {
      return 0;
    }
    this.system.henchmenList.forEach((id) => {
      const henchman = game.actors.get(id);
      const q = henchman.system.retainer?.quantity || 1;
      total += Number(henchman.system.retainer.wage) * Number(q);
    });
    return total;
  }

  payWages() {
    if (this.type !== "character") {
      return;
    }

    let totalWages = this.getTotalWages() * 100;
    const totalMoney = this.getTotalMoneyGC() * 100;
    if (totalWages > totalMoney) {
      ui.notifications.error(game.i18n.localize("ACKS.error.NotEnoughMoney"));
      return;
    }
    // Get GC item
    const moneyItems = this.items.filter((i) => i.type === "money");
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
      if (item.type === "money") {
        total += item.system.quantity * item.system.coppervalue;
      }
    });
    return total / 100;
  }

  getTotalMoneyEncumbrance() {
    let total = 0;
    this.items.forEach((item) => {
      if (item.type === "money") {
        total += item.system.quantity;
      }
    });
    let nbStone = Math.floor(total / 1000);
    let nbItems = Math.ceil((total - nbStone * 1000) / 166);
    return { stone: nbStone, item: nbItems };
  }

  updateWeight() {
    const toUpdate = [];
    for (const i of this.items) {
      if (i.system?.weight !== undefined && i.system?.weight6 === -1) {
        const nbStones6 = Math.floor(i.system.weight / 166.66);
        toUpdate.push({ _id: i.id, "system.weight6": nbStones6, "system.weight": -1 });
      }
    }
    if (toUpdate.length > 0) {
      this.updateEmbeddedDocuments("Item", toUpdate);
    }
  }

  async updateImplements() {
    if (this.system.saves.implements?.value === -1) {
      this.update({ "system.saves.implements.value": this.system.saves.wand.value });
    }
  }

  async updateLanguages() {
    if (this.type !== "character") {
      return;
    }
    // Load compendium languages
    const languages = await AcksUtility.loadCompendium("acks.acks-languages");
    const langList = languages.map((i) => i.toObject());

    const toPush = [];
    if (this.system?.languages?.value) {
      for (const langName of this.system.languages.value) {
        // Do we have existing language?
        if (this.items.find((i) => i.name.toLowerCase() === langName.toLowerCase() && i.type === "language")) {
          continue;
        }
        const lang = langList.find((i) => i.name.toLowerCase() === langName.toLowerCase());
        if (lang) {
          toPush.push(lang);
        } else {
          // Create a new dynamic language item
          toPush.push({
            name: langName,
            type: "language",
            system: {
              description: "",
            },
          });
        }
      }
      if (toPush.length > 0) {
        this.createEmbeddedDocuments("Item", toPush);
      }
    }
  }

  isNew() {
    return this.system.isNew;
  }

  async updateSavingThrows(savingThrows) {
    await this.update({
      "system.saves": {
        paralysis: { value: savingThrows.p },
        death: { value: savingThrows.d },
        breath: { value: savingThrows.b },
        implements: { value: savingThrows.i },
        spell: { value: savingThrows.s },

        wand: { value: savingThrows.i },
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
    if (this.type === "character") {
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
    if (this.type === "character") {
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
    if (this.type === "character") {
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

  async targetAttack(data, type, options) {
    if (game.user.targets.size > 0) {
      for (const t of game.user.targets.values()) {
        data.roll.target = t;
        await this.rollAttack(data, {
          type: type,
          skipDialog: options.skipDialog,
        });
      }
    } else {
      await this.rollAttack(data, { type: type, skipDialog: options.skipDialog });
    }
  }

  rollAttack(attData, options = {}) {
    const data = this.system;
    let rollParts = ["1d20"];

    if (game.settings.get("acks", "exploding20s")) {
      rollParts = ["1d20x"];
    }

    const dmgParts = [];
    let label = game.i18n.format("ACKS.roll.attacks", { name: this.name });
    if (!attData.item) {
      dmgParts.push("1d6");
    } else {
      label = game.i18n.format("ACKS.roll.attacksWith", { name: attData.item.name });
      dmgParts.push(attData.item.system.damage);
    }

    rollParts.push(data.thac0.bba.toString());
    if (options.type === "missile") {
      rollParts.push(data.scores.dex.mod.toString(), data.thac0.mod.missile.toString());
    } else if (options.type === "melee") {
      rollParts.push(data.scores.str.mod.toString(), data.thac0.mod.melee.toString());
    }
    if (attData?.item?.system.bonus) {
      rollParts.push(attData.item.system.bonus);
    }
    let thac0 = data.thac0.value;
    if (options.type === "melee") {
      dmgParts.push(data.scores.str.mod);
    }
    // Add Melee mod to damage
    if (options.type === "melee") {
      dmgParts.push(data.damage.mod.melee);
    }
    // Add Missile mod to damage
    if (options.type === "missile") {
      dmgParts.push(data.damage.mod.missile);
    }
    const rollData = {
      actor: this,
      item: attData.item,
      roll: {
        type: options.type,
        thac0: thac0,
        dmg: dmgParts,
        save: attData.roll.save,
        target: attData.roll.target,
      },
    };

    const skipKey = game.settings.get("acks", "skip-dialog-key");
    if (options.event && options.event[skipKey]) {
      options.skipDialog = true;
    }

    // Roll and return
    return AcksDice.roll({
      event: options.event,
      parts: rollParts,
      data: rollData,
      skipDialog: options.skipDialog,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: label,
      title: label,
    });
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

  static _valueFromTable(table, val) {
    let output;
    for (let i = 0; i <= val; i++) {
      if (table[i] !== undefined) {
        output = table[i];
      }
    }
    if (output === undefined) {
      // Take the first key/value of the table object, whatever it is
      for (const key in table) {
        output = table[key];
        break;
      }
    }
    return output;
  }

  _isSlow() {
    // TODO: remove slow
    this.system.isSlow = false;
    if (this.type !== "character") {
      return;
    }
    this.items.forEach((item) => {
      if (item.type === "weapon" && item.system.slow && item.system.equipped) {
        this.system.isSlow = true;
      }
    });
  }

  computeEncumbrance() {
    if (this.type !== "character") {
      return;
    }

    let totalEncumbrance6 = 0;

    this.items.forEach((item) => {
      if (item.type === "item" && item.system.subtype !== "clothing") {
        totalEncumbrance6 += item.system.weight6 * item.system.quantity.value;
      } else if (["weapon", "armor"].includes(item.type)) {
        totalEncumbrance6 += item.system.weight6;
      }
    });

    const moneyEncumbrance = this.getTotalMoneyEncumbrance();
    // encumbrance in 1/6 stones
    const value6 = totalEncumbrance6 + moneyEncumbrance.stone * 6;

    totalEncumbrance6 /= 6; // Get the weight in stones
    totalEncumbrance6 += moneyEncumbrance.stone;

    // Select the max encumbrance value
    const maxEncumbrance =
      this.system.encumbrance.forcemax > 0 ? this.system.encumbrance.forcemax : 20 + this.system.scores.str.mod;
    if (this.system.encumbrance.max !== maxEncumbrance && this._id) {
      this.update({ "system.encumbrance.max": maxEncumbrance });
    }

    // max encumbrance in 1/6 stones
    const max6 = maxEncumbrance * 6;

    this.system.encumbrance = {
      pct: Math.clamp((totalEncumbrance6 / maxEncumbrance) * 100, 0, 100),
      max: maxEncumbrance,
      encumbered: totalEncumbrance6 > maxEncumbrance,
      value: Math.round(totalEncumbrance6),
      max6,
      value6,
      breakpoints: {
        low: Math.clamp((5 / maxEncumbrance) * 100, 0, 100),
        mid: Math.clamp((7 / maxEncumbrance) * 100, 0, 100),
        high: Math.clamp((10 / maxEncumbrance) * 100, 0, 100),
      },
    };

    if (this.system.config.movementAuto) {
      this._calculateMovement();
    }
  }

  _calculateMovement() {
    let baseSpeed;
    if (this.system.encumbrance.value > this.system.encumbrance.max) {
      baseSpeed = ACKS.base_speed.overburdened; // 0
    } else if (this.system.encumbrance.value > 10) {
      baseSpeed = ACKS.base_speed.high_encumbrance; // 30
    } else if (this.system.encumbrance.value > 7) {
      baseSpeed = ACKS.base_speed.mid_encumbrance; // 60
    } else if (this.system.encumbrance.value > 5) {
      baseSpeed = ACKS.base_speed.low_encumbrance; // 90
    } else {
      baseSpeed = ACKS.base_speed.unencumbered; // 120
    }

    // apply movement mod but make sure speed can't be less than 0
    baseSpeed = Math.max(baseSpeed + this.system.movement.mod, 0);

    // Formulas from ACKS Revised Rulebook page 17
    this.system.movementacks.exploration = baseSpeed;
    this.system.movementacks.combat = Math.floor((baseSpeed / 3) * 10) / 10;
    this.system.movementacks.chargerun = baseSpeed;
    this.system.movementacks.expedition = Math.floor((baseSpeed / 5) * 10) / 10;
    this.system.movement.base = baseSpeed;
  }

  getFavorites() {
    return this.items.filter((i) => i.system.favorite);
  }

  buildFavoriteActions() {
    return this.getFavorites();
  }

  buildRollList() {
    const rolls = [];
    for (const key in this.system.scores) {
      const attr = this.system.scores[key];
      rolls.push({
        key: key,
        value: attr.value,
        name: game.i18n.localize("ACKS.scores." + key + ".short"),
        type: "score",
      });
    }
    return rolls;
  }

  computeAC() {
    if (this.type !== "character") {
      return;
    }
    // Compute AC
    let baseAC = 0;
    let shieldAC = 0;
    const data = this.system;
    data.aac.naked = baseAC + data.scores.dex.mod;
    const armors = this.items.filter((i) => i.type === "armor");
    armors.forEach((a) => {
      if (a.system.equipped && a.system.type !== "shield") {
        baseAC = a.system.aac.value;
      } else if (a.system.equipped && a.system.type === "shield") {
        shieldAC = a.system.aac.value;
      }
    });
    data.aac.value = baseAC + data.scores.dex.mod + shieldAC + data.aac.mod;
    data.aac.shield = shieldAC;
  }

  computeModifiers() {
    if (this.type !== "character") {
      return;
    }
    const data = this.system;

    const standard = {
      0: -3,
      3: -3,
      4: -2,
      6: -1,
      9: 0,
      13: 1,
      16: 2,
      18: 3,
      19: 4,
      20: 5,
      21: 6,
      22: 7,
      23: 8,
      24: 9,
      25: 10,
    };
    data.scores.str.mod = AcksActor._valueFromTable(standard, data.scores.str.value);
    data.scores.int.mod = AcksActor._valueFromTable(standard, data.scores.int.value);
    data.scores.dex.mod = AcksActor._valueFromTable(standard, data.scores.dex.value);
    data.scores.cha.mod = AcksActor._valueFromTable(standard, data.scores.cha.value);
    data.scores.wis.mod = AcksActor._valueFromTable(standard, data.scores.wis.value);
    data.scores.con.mod = AcksActor._valueFromTable(standard, data.scores.con.value);

    data.scores.dex.init = AcksActor._valueFromTable(standard, data.scores.dex.value);
    data.scores.cha.npc = AcksActor._valueFromTable(standard, data.scores.cha.value);
    data.scores.cha.retain = data.scores.cha.mod + 4;
    data.scores.cha.loyalty = data.scores.cha.mod;

    const od = {
      0: 0,
      3: 30,
      4: 26,
      6: 22,
      9: 18,
      13: 14,
      16: 10,
      18: 6,
      19: 2,
    };
    data.exploration.odMod = AcksActor._valueFromTable(od, data.scores.str.value);
  }

  computeBHR() {
    if (this.type !== "character") {
      return;
    }
    const data = this.system;

    const bhrcalc = {
      0: "1d2",
      4: "1d3",
      10: "1d4",
      17: "1d6",
      24: "1d8",
      30: "1d10",
      37: "2d6",
      50: "2d8",
      64: "2d10",
      77: "2d12",
      90: "3d10",
      111: "4d10",
      141: "5d10",
      171: "6d10",
    };

    let newBHR;
    const value = data.hp.max;
    if (value > 171) {
      const diceNumber = Math.floor((value - 171) / 30) + 6;
      newBHR = diceNumber + "d10";
    } else {
      newBHR = AcksActor._valueFromTable(bhrcalc, Number(data.hp.max));
    }
    if (!newBHR) {
      newBHR = "1d2";
    }
    if (newBHR !== data.hp.bhr) {
      data.hp.bhr = newBHR;
      this.update({ "system.hp.bhr": newBHR });
      this.update({ "system.fight.healingrate": newBHR });
    }
  }

  computeAAB() {
    const data = this.system;

    data.thac0.bba = 10 - data.thac0.throw;
  }
}

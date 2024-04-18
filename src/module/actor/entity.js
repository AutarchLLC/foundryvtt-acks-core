import { AcksDice } from "../dice.js";

export class AcksActor extends Actor {
  /**
   * Extends data from base Actor class
   */
  computeAdditionnalData() {

    const data = this.system;

    // Compute modifiers from actor scores
    this.computeModifiers();
    this._isSlow();
    this.computeAC();
    this.computeEncumbrance();
    this.computeTreasure();
    this.computeBHR();
    this.computeAAB();

    // Determine Initiative
    if (game.settings.get("acks", "initiative") != "group") {
      data.initiative.value = data.initiative.mod;
      if (this.type == "character") {
        data.initiative.value += data.scores.dex.mod;
        if (data.isSlow) {
          data.initiative.value -= 1;
        }
      }
    } else {
      data.initiative.value = 0;
    }
    data.movement.encounter = data.movement.base / 3;

    console.log("MODCOMPUTE2", data);
  }

  /* -------------------------------------------- */
  prepareData() {
    super.prepareData();
  }

  /* -------------------------------------------- */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.computeAdditionnalData()
  }

  /* -------------------------------------------- */
  /*  Socket Listeners and Handlers
    /* -------------------------------------------- */
  async getExperience(value, options = {}) {
    if (this.type != "character") {
      return;
    }

    let modified = Math.floor(
      value + (this.system.details.xp.bonus * value) / 100
    );

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

  /* -------------------------------------------- */
  isNew() {
    const data = this.system;
    if (this.type == "character") {
      let ct = 0;
      Object.values(data.scores).forEach((el) => {
        ct += el.value;
      });
      return (ct == 0);
    } else if (this.type == "monster") {
      let ct = 0;
      Object.values(data.saves).forEach((el) => {
        ct += el.value;
      });
      return (ct == 0);
    }
  }

  /* -------------------------------------------- */
  async generateSave(hd) {
    let saves = {};
    for (let i = 0; i <= hd; i++) {
      let tmp = CONFIG.ACKS.monster_saves[i];
      if (tmp) {
        saves = tmp;
      }
    }

    await this.update({
      "system.saves": {
        death: {
          value: saves.d,
        },
        wand: {
          value: saves.w,
        },
        paralysis: {
          value: saves.p,
        },
        breath: {
          value: saves.b,
        },
        spell: {
          value: saves.s,
        },
      },
    });
  }

  /* -------------------------------------------- */
  /*  Rolls                                       */
  /* -------------------------------------------- */

  async rollHP(options = {}) {
    let roll = new Roll(this.system.hp.hd);
    await roll.evaluate({
      async: true,
    });

    await this.update({
      data: {
        hp: {
          max: roll.total,
          value: roll.total,
        },
      },
    });
  }

  /* -------------------------------------------- */
  rollSave(save, options = {}) {
    const label = game.i18n.localize(`ACKS.saves.${save}.long`);
    const rollParts = ["1d20"];
    if (this.type == "character") {
      rollParts.push(this.system.save.mod);
    }

    let data = {
      actor: this,
      roll: {
        type: "above",
        target: this.system.saves[save].value,
        magic: (this.type == "character") ? this.system.scores.wis.mod : undefined
      },
      details: game.i18n.format("ACKS.roll.details.save", { save: label }),
    };

    let skip = options?.event?.ctrlKey;

    const rollMethod = this.type == "character" ? AcksDice.RollSave : AcksDice.Roll;

    // Roll and return
    return rollMethod({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: skip,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("ACKS.roll.save", { save: label }),
      title: game.i18n.format("ACKS.roll.save", { save: label }),
    });
  }

  /* -------------------------------------------- */
  rollMorale(options = {}) {
    const rollParts = ["2d6"];
    rollParts.push(this.system.details.morale);

    const data = {
      actor: this,
      roll: {
        type: "table",
        table: {
          1: game.i18n.format("ACKS.morale.retreat", {
            name: this.name,
          }),
          3: game.i18n.format("ACKS.morale.fightingWithdrawal", {
            name: this.name,
          }),
          6: game.i18n.format("ACKS.morale.fight", {
            name: this.name,
          }),
          9: game.i18n.format("ACKS.morale.advanceAndPursue", {
            name: this.name,
          }),
          12: game.i18n.format("ACKS.morale.fightToTheDeath", {
            name: this.name,
          }),
        },
      },
    };

    let skip = options?.event?.ctrlKey;

    // Roll and return
    return AcksDice.Roll({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: skip,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.localize("ACKS.roll.morale"),
      title: game.i18n.localize("ACKS.roll.morale"),
    });
  }

  /* -------------------------------------------- */
  rollLoyalty(options = {}) {
    const rollParts = ["2d6"];
    rollParts.push(this.system.details.morale);

    const data = {
      actor: this,
      roll: {
        type: "table",
        table: {
          1: game.i18n.format("ACKS.loyalty.hostility", {
            name: this.name,
          }),
          3: game.i18n.format("ACKS.loyalty.resignation", {
            name: this.name,
          }),
          6: game.i18n.format("ACKS.loyalty.grudging", {
            name: this.name,
          }),
          9: game.i18n.format("ACKS.loyalty.loyal", {
            name: this.name,
          }),
          12: game.i18n.format("ACKS.loyalty.fanatic", {
            name: this.name,
          }),
        },
      },
    };

    let skip = options?.event?.ctrlKey;

    // Roll and return
    return AcksDice.Roll({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: skip,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.localize("ACKS.loyalty.check"),
      title: game.i18n.localize("ACKS.loyalty.check"),
    });
  }

  /* -------------------------------------------- */
  rollReaction(options = {}) {
    const rollParts = ["2d6"];

    const data = {
      actor: this,
      roll: {
        type: "table",
        table: {
          2: game.i18n.format("ACKS.reaction.Hostile", {
            name: this.name,
          }),
          3: game.i18n.format("ACKS.reaction.Unfriendly", {
            name: this.name,
          }),
          6: game.i18n.format("ACKS.reaction.Neutral", {
            name: this.name,
          }),
          9: game.i18n.format("ACKS.reaction.Indifferent", {
            name: this.name,
          }),
          12: game.i18n.format("ACKS.reaction.Friendly", {
            name: this.name,
          }),
        },
      },
    };

    let skip = options?.event?.ctrlKey;

    // Roll and return
    return AcksDice.Roll({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: skip,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.localize("ACKS.reaction.check"),
      title: game.i18n.localize("ACKS.reaction.check"),
    });
  }

  /* -------------------------------------------- */
  rollCheck(score, options = {}) {
    const label = game.i18n.localize(`ACKS.scores.${score}.long`);
    const rollParts = ["1d20"];

    const data = {
      actor: this,
      roll: {
        type: "check",
        target: this.system.scores[score].value,
      },

      details: game.i18n.format("ACKS.roll.details.attribute", {
        score: label,
      }),
    };

    let skip = options?.event?.ctrlKey;

    // Roll and return
    return AcksDice.Roll({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: skip,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("ACKS.roll.attribute", { attribute: label }),
      title: game.i18n.format("ACKS.roll.attribute", { attribute: label }),
    });
  }

  /* -------------------------------------------- */
  rollHitDice(options = {}) {
    const label = game.i18n.localize(`ACKS.roll.hd`);
    const rollParts = [this.system.hp.hd];
    if (this.type == "character") {
      rollParts.push(this.system.scores.con.mod);
    }

    const data = {
      actor: this,
      roll: {
        type: "hitdice",
      },
    };

    // Roll and return
    return AcksDice.Roll({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: true,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: label,
      title: label,
    });
  }

  /* -------------------------------------------- */
  rollBHR(options = {}) {
    const label = game.i18n.localize(`ACKS.roll.bhr`);
    const rollParts = [this.system.hp.bhr];
    if (this.type == "character") {
      rollParts.push();
    }

    const data = {
      actor: this,
      roll: {
        type: "Healing",
      },
    };

    // Roll and return
    return AcksDice.Roll({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: true,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: label,
      title: label,
    });
  }

  /* -------------------------------------------- */
  rollAppearing(options = {}) {
    const rollParts = [];
    let label = "";
    if (options.check == "wilderness") {
      rollParts.push(this.system.details.appearing.w);
      label = "(2)";
    } else {
      rollParts.push(this.system.details.appearing.d);
      label = "(1)";
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
    return AcksDice.Roll({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: true,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("ACKS.roll.appearing", { type: label }),
      title: game.i18n.format("ACKS.roll.appearing", { type: label }),
    });
  }

  /* -------------------------------------------- */
  rollExploration(expl, options = {}) {
    const label = game.i18n.localize(`ACKS.exploration.${expl}.long`);
    const rollParts = ["1d20"];

    const data = {
      actor: this,
      roll: {
        type: "above",
        target: this.system.exploration[expl],
      },
      details: game.i18n.format("ACKS.roll.details.exploration", {
        expl: label,
      }),
    };

    let skip = options.event && options.event.ctrlKey;

    // Roll and return
    return AcksDice.Roll({
      event: options.event,
      parts: rollParts,
      data: data,
      skipDialog: skip,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("ACKS.roll.exploration", { exploration: label }),
      title: game.i18n.format("ACKS.roll.exploration", { exploration: label }),
    });
  }

  /* -------------------------------------------- */
  rollDamage(attData, options = {}) {
    const data = this.system;

    const rollData = {
      actor: this,
      item: attData.item,
      roll: {
        type: "damage",
      },
    };

    let dmgParts = [];
    if (!attData.roll.dmg) {
      dmgParts.push("1d6");
    } else {
      dmgParts.push(attData.roll.dmg);
    }

    // Add Str to damage
    if (attData.roll.type == "melee") {
      dmgParts.push(data.scores.str.mod);
    }

    // Add Melee mod to damage
    if (attData.roll.type == "melee") {
      dmgParts.push(data.damage.mod.melee);
    }

    // Add Missile mod to damage
    if (attData.roll.type == "missile") {
      dmgParts.push(data.damage.mod.missile);
    }

    // Damage roll
    AcksDice.Roll({
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
      for (let t of game.user.targets.values()) {
        data.roll.target = t;
        await this.rollAttack(data, {
          type: type,
          skipDialog: options.skipDialog,
        });
      }
    } else {
      this.rollAttack(data, { type: type, skipDialog: options.skipDialog });
    }
  }

  /* -------------------------------------------- */
  rollAttack(attData, options = {}) {
    const data = this.system;
    let rollParts = ["1d20"];

    if (game.settings.get("acks", "exploding20s")) {
      rollParts = ["1d20x="];
    }

    const dmgParts = [];
    let label = game.i18n.format("ACKS.roll.attacks", {
      name: this.name,
    });
    if (!attData.item) {
      dmgParts.push("1d6");
    } else {
      label = game.i18n.format("ACKS.roll.attacksWith", {
        name: attData.item.name,
      });
      dmgParts.push(attData.item.system.damage);
    }

    let ascending = game.settings.get("acks", "ascendingAC");
    if (ascending) {
      rollParts.push(data.thac0.bba.toString());
    }
    if (options.type == "missile") {
      rollParts.push(
        data.scores.dex.mod.toString(),
        data.thac0.mod.missile.toString()
      );
    } else if (options.type == "melee") {
      rollParts.push(
        data.scores.str.mod.toString(),
        data.thac0.mod.melee.toString()
      );
    }
    if (attData?.item?.system.bonus) {
      rollParts.push(attData.item.system.bonus);
    }
    let thac0 = data.thac0.value;
    if (options.type == "melee") {
      dmgParts.push(data.scores.str.mod);
    }
    // Add Melee mod to damage
    if (options.type == "melee") {
      dmgParts.push(data.damage.mod.melee);
    }
    // Add Missile mod to damage
    if (options.type == "missile") {
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

    // Roll and return
    return AcksDice.Roll({
      event: options.event,
      parts: rollParts,
      data: rollData,
      skipDialog: options.skipDialog,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: label,
      title: label,
    });
  }

  /* -------------------------------------------- */
  async applyDamage(amount = 0, multiplier = 1) {
    amount = Math.ceil(parseInt(amount) * multiplier);
    const hp = this.system.hp;

    // Remaining goes to health
    const dh = Math.clamped(hp.value - amount, -99, hp.max);

    // Update the Actor
    await this.update({
      "system.hp.value": dh,
    });
  }

  /* -------------------------------------------- */
  static _valueFromTable(table, val) {
    let output;
    for (let i = 0; i <= val; i++) {
      if (table[i] != undefined) {
        output = table[i];
      }
    }
    return output;
  }

  /* -------------------------------------------- */
  _isSlow() {
    this.system.isSlow = false;
    if (this.type != "character") {
      return;
    }
    this.items.forEach((item) => {
      if (item.type == "weapon" && item.system.slow && item.system.equipped) {
        this.system.isSlow = true;
      }
    });
  }

  /* -------------------------------------------- */
  computeEncumbrance() {
    if (this.type !== "character") {
      return;
    }

    const option = game.settings.get("acks", "encumbranceOption");

    let totalEncumbrance = 0;

    this.items.forEach((item) => {
      if (item.type === "item") {
        if (option === "detailed") {
          if (item.system.treasure) {
            totalEncumbrance += item.system.weight * item.system.quantity.value;
          } else {
            totalEncumbrance += 1;
          }
        } else if (item.system.treasure) {
          totalEncumbrance += 6 * item.system.quantity.value;
        } else {
          totalEncumbrance += 6;
        }
      } else if (["weapon", "armor"].includes(item.type)) {
        if (option === "detailed") {
          totalEncumbrance += item.system.weight;
        } else {
          totalEncumbrance += 6;
        }
      }
    });

    const maxEncumbrance = this.system.encumbrance.max;

    this.system.encumbrance = {
      pct: Math.clamped(
        (totalEncumbrance / maxEncumbrance) * 100,
        0,
        100
      ),
      max: maxEncumbrance,
      encumbered: totalEncumbrance > maxEncumbrance,
      value: Math.round(totalEncumbrance),
    };

    if (this.system.config.movementAuto) {
      this._calculateMovement();
    }
  }

  /* -------------------------------------------- */
  _calculateMovement() {
    if (this.system.encumbrance.value > this.system.encumbrance.max) {
      this.system.movement.base = 0;
    } else if (this.system.encumbrance.value > 60) {
      this.system.movement.base = 30;
    } else if (this.system.encumbrance.value > 42) {
      this.system.movement.base = 60;
    } else if (this.system.encumbrance.value > 30) {
      this.system.movement.base = 90;
    } else {
      this.system.movement.base = 120;
    }
  }

  /* -------------------------------------------- */
  computeTreasure() {
    if (this.type != "character") {
      return;
    }
    const data = this.system;
    // Compute treasure
    let total = 0;
    let treasure = this.items.filter(
      (i) => i.type == "item" && i.system.treasure
    );
    treasure.forEach((item) => {
      total += item.system.quantity.value * item.system.cost
    });
    data.treasure = total;
  }

  computeAC() {
    if (this.type != "character") {
      return;
    }
    // Compute AC
    let baseAc = 9;
    let baseAac = 0;
    let AcShield = 0;
    let AacShield = 0;
    const data = this.system;
    data.aac.naked = baseAac + data.scores.dex.mod;
    data.ac.naked = baseAc - data.scores.dex.mod;
    const armors = this.items.filter((i) => i.type == "armor");
    armors.forEach((a) => {
      if (a.system.equipped && a.system.type != "shield") {
        baseAc = a.system.ac;
        baseAac = a.system.aac.value;
      } else if (a.system.equipped && a.system.type == "shield") {
        AcShield = a.system.ac;
        AacShield = a.system.aac.value;
      }
    });
    data.aac.value = baseAac + data.scores.dex.mod + AacShield + data.aac.mod;
    data.ac.value = baseAc - data.scores.dex.mod - AcShield - data.ac.mod;
    data.ac.shield = AcShield;
    data.aac.shield = AacShield;
  }

  /* -------------------------------------------- */
  computeModifiers() {
    if (this.type != "character") {
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
      25: 10
    };
    data.scores.str.mod = AcksActor._valueFromTable(
      standard,
      data.scores.str.value
    );
    data.scores.int.mod = AcksActor._valueFromTable(
      standard,
      data.scores.int.value
    );
    data.scores.dex.mod = AcksActor._valueFromTable(
      standard,
      data.scores.dex.value
    );
    data.scores.cha.mod = AcksActor._valueFromTable(
      standard,
      data.scores.cha.value
    );
    data.scores.wis.mod = AcksActor._valueFromTable(
      standard,
      data.scores.wis.value
    );
    data.scores.con.mod = AcksActor._valueFromTable(
      standard,
      data.scores.con.value
    );

    const capped = {
      0: -2,
      3: -2,
      4: -1,
      6: -1,
      9: 0,
      13: 1,
      16: 1,
      18: 2,
    };
    data.scores.dex.init = AcksActor._valueFromTable(
      standard,
      data.scores.dex.value
    );
    data.scores.cha.npc = AcksActor._valueFromTable(
      standard,
      data.scores.cha.value
    );
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
    data.exploration.odMod = AcksActor._valueFromTable(
      od,
      data.scores.str.value
    );

    const literacy = {
      3: "ACKS.Illiterate",
      9: "ACKS.Literate",
    };
    data.languages.literacy = AcksActor._valueFromTable(
      literacy,
      data.scores.int.value
    );

    const spoken = {
      0: "ACKS.NativeBroken",
      3: "ACKS.Native",
      13: "ACKS.NativePlus1",
      16: "ACKS.NativePlus2",
      18: "ACKS.NativePlus3",
      19: "ACKS.NativePlus4",
      20: "ACKS.NativePlus5",
      21: "ACKS.NativePlus6",
      22: "ACKS.NativePlus7",
      23: "ACKS.NativePlus8",
      24: "ACKS.NativePlus9",
      25: "ACKS.NativePlus10",
    };
    data.languages.spoken = AcksActor._valueFromTable(
      spoken,
      data.scores.int.value
    );

  }

  /* -------------------------------------------- */
  computeBHR() {
    if (this.type != "character") {
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
      200: "7d10",
    };
    data.hp.bhr = AcksActor._valueFromTable(
      bhrcalc,
      data.hp.max
    );
  };

  /* -------------------------------------------- */
  computeAAB() {
    const data = this.system;

    data.thac0.bba = 10 - data.thac0.throw;
  }
}

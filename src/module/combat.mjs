/* global Combat, game, Roll, foundry, canvas, CONFIG, ui, Hooks, CONST */
import { AcksUtility } from "./util/acks-utility.mjs";
import SurpriseMatrix from "./apps/surprise-matrix.mjs";
import AcksCombatHelper from "./combat-helper.mjs";

export default class AcksCombat extends Combat {
  /*******************************************************/
  /**
   * Return the Array of combatants sorted into initiative order, breaking ties alphabetically by name.
   * @returns {Combatant[]}
   */
  setupTurns() {
    let locked = this.getFlag("acks", "lock-turns");
    if (locked) {
      return;
    }

    this.turns ||= [];

    // Determine the turn order and the current turn
    const turns = this.combatants.contents.sort(this.sortCombatantsACKS);
    if (this.turn !== null) this.turn = Math.clamp(this.turn, 0, turns.length - 1);

    // Update state tracking
    let c = turns[this.turn];
    this.current = this._getCurrentState(c);
    // One-time initialization of the previous state
    if (!this.previous) this.previous = this.current;

    // Return the array of prepared turns
    return (this.turns = turns);
  }

  /*******************************************************/
  async rollInitiative(ids, options) {
    if (!game.user.isGM) {
      game.socket.emit("system.acks", { type: "rollInitiative", combatId: this.id, ids: ids, options: options });
      return;
    }
    await this.setFlag("acks", "lock-turns", true);

    ids = typeof ids === "string" ? [ids] : ids;
    let messages = [];
    let rollMode = game.settings.get("core", "rollMode");

    // Get current groups
    let groups = this.getFlag("acks", "groups") || [];
    let maxInit = { value: -1, cId: "" };
    let updates = [];
    for (let cId of ids) {
      const c = this.combatants.get(cId);
      let id = c._id || c.id;
      // get the associated token
      let tokenId = c.token.id;
      // Check if the current token ID is in a group
      let groupData = groups.find((groupData) => groupData.tokens.includes(tokenId));
      let initValue = -1;
      let showMessage = true;
      let roll;
      if (groupData) {
        if (groupData.initiative > 0) {
          initValue = groupData.initiative;
          showMessage = false;
        } else {
          roll = new Roll(`1d6+${groupData.initiativeBonus}`);
          await roll.evaluate();
          initValue = roll.total;
          groupData.initiative = initValue;
        }
      } else {
        roll = c.getInitiativeRoll();
        await roll.evaluate();
        initValue = roll.total;
      }
      updates.push({ _id: id, initiative: initValue });
      if (initValue > maxInit.value) {
        maxInit.value = initValue;
        maxInit.cId = id;
      }

      if (showMessage) {
        // Determine the roll mode
        if ((c.token.hidden || c.hidden) && rollMode === "roll") {
          rollMode = "gmroll";
        }

        // Construct chat message data
        const messageData = foundry.utils.mergeObject(
          {
            speaker: {
              scene: canvas.scene._id,
              actor: c.actor?.id || null,
              token: c.token.id,
              alias: c.token.name,
            },
            flavor: game.i18n.format("ACKS.roll.individualInit", {
              name: c.token.name,
            }),
          },
          {},
        );

        const chatData = await roll.toMessage(messageData, {
          rollMode,
          create: false,
        });
        if (messages.length > 0) {
          chatData.sound = null;
        }
        messages.push(chatData);
      }
    }

    await CONFIG.ChatMessage.documentClass.create(messages);
    this.pools = this.#getCombatantPools();
    await this.processOutNumbering();

    await this.setFlag("acks", "lock-turns", false);
    await this.updateEmbeddedDocuments("Combatant", updates);

    setTimeout(function () {
      const updateData = { turn: 0 };
      game.combat.update(updateData);
    }, 200);

    return this;
  }
  /*******************************************************/
  async rollAll(options) {
    if (!this.getFlag("acks", "initDone")) {
      ui.notifications.warn(game.i18n.localize("COMBAT.CombatNotStarted"));
      return;
    }
    return super.rollAll(options);
  }

  /*******************************************************/
  async rollNPC(options) {
    if (!this.getFlag("acks", "initDone")) {
      ui.notifications.warn(game.i18n.localize("COMBAT.CombatNotStarted"));
      return;
    }
    return super.rollNPC(options);
  }

  /*******************************************************/
  async internalStartCombat() {
    await this.setFlag("acks", "initDone", true);
    this._playCombatSound("startEncounter");
    let updateData = { round: 1, turn: 0, initDone: true };

    let d = new Dialog({
      title: "Actions declaration",
      content:
        "<p>Start of Round 1. About to roll Initiative.</p><p>Ask players to declare any actions for this round.</p>",
      buttons: {
        init: {
          icon: '<i class="fas fa-check"></i>',
          label: "Action declared, start rolling Initiative",
          callback: async () => {
            await this.rollAll();
            Hooks.callAll("combatStart", this, updateData);
            return this.update(updateData);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => {},
        },
      },
      default: "init",
    });
    d.render(true);
  }

  /*******************************************************/
  async cleanupStatus(status) {
    for (let cbt of this.combatants) {
      if (status == "outnumbering" || status == "prepareSpell") {
        await cbt?.setFlag("acks", status, false); // Flags management
      } else {
        if (cbt?.actor?.hasEffect(status)) {
          AcksUtility.removeEffect(cbt.actor, status);
        }
      }
    }
  }

  /**
   * @override
   * @return {Promise<void>}
   */
  async startCombat() {
    await this.cleanupStatus("outnumbering");
    const pools = this.#getCombatantPools();
    this.pools = pools;

    const surpriseMatrixOptions = {
      pools,
      combat: this,
    };

    // TODO: maybe somehow limit matrix app instance per combat? so we can't open 2 apps for same combat.
    new SurpriseMatrix(surpriseMatrixOptions).render(true);
  }

  #getCombatantPools() {
    const pools = { secret: [], hostile: [], neutral: [], friendly: [] };

    for (const cbt of this.combatants) {
      if (cbt.isDefeated) {
        continue;
      }
      switch (cbt.token.disposition) {
        case CONST.TOKEN_DISPOSITIONS.FRIENDLY:
          pools.friendly.push(cbt);
          break;
        case CONST.TOKEN_DISPOSITIONS.NEUTRAL:
          pools.neutral.push(cbt);
          break;
        case CONST.TOKEN_DISPOSITIONS.HOSTILE:
          pools.hostile.push(cbt);
          break;
        case CONST.TOKEN_DISPOSITIONS.SECRET:
        default:
          pools.secret.push(cbt);
      }
    }
    return pools;
  }

  /*******************************************************/
  async nextTurn() {
    let turn = this.turn ?? -1;
    let skipDefeated = this.settings.skipDefeated;

    // Determine the next turn number
    let next = null;
    for (let [i, t] of this.turns.entries()) {
      if (i <= turn) continue;
      if (skipDefeated && t.isDefeated) continue;
      if (t.actor?.hasEffect("surprised")) {
        if (this.round == 1) {
          ui.notifications.info(`${t.actor.name} is surprised, so skipped in initiative countdown.`);
          continue;
        } else {
          await AcksUtility.removeEffect(t.actor, "surprised");
        }
      }
      next = i;
      break;
    }

    // Maybe advance to the next round
    let round = this.round;
    if (this.round === 0 || next === null || next >= this.turns.length) {
      return this.nextRound();
    }

    // Update the document, passing data through a hook first
    const updateData = { round, turn: next };
    const updateOptions = { advanceTime: CONFIG.time.turnTime, direction: 1 };
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    return this.update(updateData, updateOptions);
  }

  /*******************************************************/
  async nextRound() {
    this.turnsDone = false;

    let turn = this.turn === null ? null : 0; // Preserve the fact that it's no-one's turn currently.
    // Remove surprised effects
    if (this.round == 1) {
      this.turns.forEach((t) =>
        t.actor.hasEffect("surprised") ? AcksUtility.removeEffect(t.actor, "surprised") : null,
      );
    }
    this.turns.forEach((t) => (t.actor.hasEffect("delayed") ? AcksUtility.removeEffect(t.actor, "delayed") : null));
    this.turns.forEach((t) => (t.actor.hasEffect("done") ? AcksUtility.removeEffect(t.actor, "done") : null));

    AcksCombatHelper.resetInitiative(this);

    if (this.settings.skipDefeated && turn !== null) {
      turn = this.turns.findIndex((t) => !t.isDefeated && this.round == 1 && !t.actor.hasEffect("surprised"));
      if (turn === -1) {
        ui.notifications.warn("COMBAT.NoneRemaining", { localize: true });
        turn = 0;
      }
    }
    let advanceTime = Math.max(this.turns.length - this.turn, 0) * CONFIG.time.turnTime;
    advanceTime += CONFIG.time.roundTime;
    let nextRound = this.round + 1;
    // Display a chat message to remind declaring actions
    let chatData = {
      content: `Round ${nextRound} has started, you can declare your actions before rolling initiative.`,
    };
    ChatMessage.create(chatData);

    // Update the document, passing data through a hook first
    const updateData = { round: nextRound, turn };
    const updateOptions = { advanceTime, direction: 1 };
    Hooks.callAll("combatRound", this, updateData, updateOptions);
    return this.update(updateData, updateOptions);
  }

  /*******************************************************/
  async processOutNumbering() {
    let pools = this.pools;
    let hostileMore = pools.hostile.length > pools.friendly.length;
    let friendlyMore = pools.friendly.length > pools.hostile.length;
    for (let cbt of this.combatants) {
      await cbt.setFlag("acks", "outnumbering", false);
      if (cbt.token.disposition == -1 && hostileMore) {
        await cbt.setFlag("acks", "outnumbering", true);
      }
      if (cbt.token.disposition == 1 && friendlyMore) {
        await cbt.setFlag("acks", "outnumbering", true);
      }
    }
  }

  /*******************************************************/
  sortCombatantsACKS(a, b) {
    if (a.initiative === b.initiative) {
      // No outnumbering at all
      if (!a.getFlag("acks", "outnumbering") && !b.getFlag("acks", "outnumbering")) {
        if (a.token.disposition == -1) {
          return -1;
        } else {
          return 1;
        }
      }
      if (a.getFlag("acks", "outnumbering")) {
        return 1;
      }
      if (b.getFlag("acks", "outnumbering")) {
        return -1;
      }
      return a.name.localeCompare(b.name);
    }
    return b.initiative - a.initiative;
  }

  /*******************************************************/
  async endCombat() {
    return Dialog.confirm({
      title: game.i18n.localize("COMBAT.EndTitle"),
      content: `<p>${game.i18n.localize("COMBAT.EndConfirmation")}</p>`,
      yes: async () => {
        await this.cleanupStatus("surprised");
        await this.cleanupStatus("outnumbering");
        await this.cleanupStatus("overnumbering");
        await this.cleanupStatus("prepareSpell");
        await this.cleanupStatus("done");
        await this.cleanupStatus("readied");
        await this.cleanupStatus("delayed");
        await this.delete();
      },
    });
  }

  /*******************************************************/
  manageGroup(groupTokens) {
    // Check if the tokens are in the current combatant list
    let combatants = this.combatants;
    let combatantTokens = combatants.map((c) => c.token.id);
    let missingTokens = groupTokens.filter((t) => !combatantTokens.includes(t.id));
    if (missingTokens.length > 0) {
      ui.notifications.warn("Tokens are not in the combatant list");
      return;
    }

    let groups = foundry.utils.duplicate(this.getFlag("acks", "groups") || []);
    // Group index is the group size
    let groupId = groups.length;
    groups[groupId] = { initiative: -1, initiativeBonus: 1000, tokens: groupTokens.map((t) => t.id) };

    // Remove tokens already present in another group
    groups.forEach(function (groupData, id) {
      if (id != groupId) {
        groupTokens.forEach((t) => {
          if (groupData.tokens.includes(t.id)) {
            groupData.tokens.splice(groupData.tokens.indexOf(t.id), 1);
          }
        });
      }
    });
    // Then parse the group array and remove empty or single groups
    groups = groups.filter((groupData) => {
      return groupData.tokens.length > 1;
    });

    // Then get the worst initiative value
    groups.forEach(function (groupData, id) {
      groupData.initiativeBonus = 10000;
      groupTokens.forEach((t) => {
        let combatant = combatants.find((cb) => cb.token.id == t.id);
        if (combatant.actor.system.initiative.value < groupData.initiativeBonus) {
          groupData.initiativeBonus = combatant.actor.system.initiative.value;
        }
      });
    });

    // Save the groups
    this.setFlag("acks", "groups", groups);
    ui.notifications.info("Groups created/updated");
  }
}

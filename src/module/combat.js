import { AcksSurprise } from "./surprise-manager.js";
import { AcksUtility } from "./utility.js";

export class AcksCombatClass extends Combat {
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

    console?.log("Setup Turns....");
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
      console.log("Emit Roll Initiative", ids, options);
      game.socket.emit("system.acks", { type: "rollInitiative", combatId: this.id, ids: ids, options: options });
      return;
    }
    console.log("%%%%%%%%% Roll Initiative", ids, options);
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
      //console.log("Init for combattant", cId, c, ids)
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
    this.pools = AcksCombat.getCombatantsPool();
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
            console.log(">>>>>>>>>> Start Combat", this, updateData);
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

  /*******************************************************/
  async startCombat() {
    console.log("Start Combat 1 !");
    await this.cleanupStatus("outnumbering");
    let pools = AcksCombat.getCombatantsPool();
    this.pools = pools;

    console.log("Start Combat 2 !", pools);
    let surpriseDialog = new AcksSurprise({ pools, combatData: this });
    await surpriseDialog.render(true);
  }

  /*******************************************************/
  async nextTurn() {
    console.log("NEXT TURN");

    let turn = this.turn ?? -1;
    let skipDefeated = this.settings.skipDefeated;

    // Determine the next turn number
    let next = null;
    for (let [i, t] of this.turns.entries()) {
      console.log("Turn", t);
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
    console.log("NEXT ROUND");
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
    console.log("ROUND", this.round, this.turns);

    AcksCombat.resetInitiative(this);

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
    // DEBUG : console.log("Pools", pools, hostileMore, friendlyMore);
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
    // Log the current group state
    console.log("Groups", groups);
  }
}
export class AcksCombat {
  /*******************************************************/
  static async rollInitiative(combat, data) {
    console.log(">>>>Roll Initiative", combat, data);
    // Initialize groups.
    data.combatants = [];
    let groups = {};
    combat.combatants.forEach((cbt) => {
      groups[cbt.flags.acks.group] = { present: true };
      data.combatants.push(cbt);
    });

    // Roll initiative for each group.
    for (const group in groups) {
      const roll = new Roll("1d6");
      await roll.evaluate();
      await roll.toMessage({
        flavor: game.i18n.format("ACKS.roll.initiative", {
          group: CONFIG["ACKS"].colors[group],
        }),
      });

      groups[group].initiative = roll.total;
    }

    // Set the inititative for each group combatant.
    for (const combatant of data.combatants) {
      if (!combatant.actor) {
        return;
      }

      let initiative = groups[combatant.flags.acks.group].initiative;
      if (combatant.actor.system.isSlow) {
        initiative -= 1;
      }

      await combatant.update({
        initiative: initiative,
      });
    }
    //combat.setupTurns();
  }

  /*******************************************************/
  static async resetInitiative(combat, data) {
    const reroll = game.settings.get("acks", "initiativePersistence");
    if (!["reset", "reroll"].includes(reroll)) {
      return;
    }

    combat.resetAll();
  }

  /*******************************************************/
  static async rollCombatantInitiative(combat, combatant, updates, messages, id, index) {
    const roll = combatant.getInitiativeRoll();
    await roll.evaluate();
    let value = roll.total;

    if (combat.settings.skipDefeated && combatant.defeated) {
      value = -790;
    }

    updates.push({
      combatantId: id,
      _id: id,
      initiative: value,
      turn: 1,
    });

    // Determine the roll mode
    let rollMode = game.settings.get("core", "rollMode");
    if ((combatant.token.hidden || combatant.hidden) && rollMode === "roll") {
      rollMode = "gmroll";
    }

    // Construct chat message data
    const messageData = foundry.utils.mergeObject(
      {
        speaker: {
          scene: canvas.scene._id,
          actor: combatant.actor?.id || null,
          token: combatant.token.id,
          alias: combatant.token.name,
        },
        flavor: game.i18n.format("ACKS.roll.individualInit", {
          name: combatant.token.name,
        }),
      },
      {},
    );

    const chatData = await roll.toMessage(messageData, {
      rollMode,
      create: false,
    });

    // Only play one sound for the whole set.
    if (index > 0) {
      chatData.sound = null;
    }

    messages.push(chatData);
  }
  /*******************************************************/
  static async individualInitiative(combat, data) {
    const updates = [];
    const messages = [];

    let nbHostile = combat.pools.hostile.length;
    let nbFriendly = combat.pools.friendly.length;

    let index = 0;

    for (const [id, combatant] of combat.combatants.entries()) {
      this.rollCombatantInitiative(combat, combatant, updates, messages, id, index);
      ++index;
    }

    setTimeout(function () {
      combat.updateEmbeddedDocuments("Combatant", updates);
    }, 400);
    await CONFIG.ChatMessage.documentClass.create(messages);

    // Now setup the first turn of the first round (ie surprised management)
    let turn = 0;
    if (data) {
      if (data.round == 1) {
        for (let i = 0; i < combat.turns.length; i++) {
          if (!combat.turns[i].actor.hasEffect("surprised")) {
            turn = i;
            break;
          }
        }
      }
      data.turn = turn;
    }
  }

  /*******************************************************/
  static format(object, html) {
    let colorEnabled = game.settings.get("acks", "enable-combatant-color");
    let colorFriendlies = "#00FF00";
    let colorHostiles = "#FF0000";
    try {
      colorFriendlies = game.settings.get("acks", "color-friendlies");
      colorHostiles = game.settings.get("acks", "color-hostiles");
    } catch (e) {
      console.log("Color settings not found", e);
    }

    const V13 = AcksUtility.isMinVersion(13);
    // in Application v2 html is NOT jQuery by default
    const $html = V13 ? $(html) : html;
    $html.find(".initiative").each((_, span) => {
      span.innerHTML = span.innerHTML == "-789.00" ? '<i class="fas fa-weight-hanging"></i>' : span.innerHTML;
      span.innerHTML = span.innerHTML == "-790.00" ? '<i class="fas fa-dizzy"></i>' : span.innerHTML;
    });

    if (object.viewed) {
      let rollNPC = V13 ? $html.find(`[data-action='rollNPC']`) : $html.find(`[data-control='rollNPC']`);
      rollNPC.after(` <a class="combat-button combat-control create-group" aria-label="{{localize 'COMBAT.createGroup'}}" role="button"
        data-tooltip="COMBAT.createGroup" data-control="create-group">
        <i class="fa-duotone fa-solid fa-people-group"></i>
      </a>`);
    }
    //console.log("Roll NPC", rollNPC);

    $html.find(".combatant").each((_, ct) => {
      // Append spellcast and retreat
      const controls = $(ct).find(".combatant-controls .combatant-control");
      //console.log("Combat controls", ct.dataset);
      if (ct?.dataset?.combatantId) {
        const cmbtant = game.combat.combatants.get(ct.dataset.combatantId);
        if (cmbtant?.actor) {
          const actionDone = cmbtant.actor.hasEffect("done") ? "active" : "";
          const actionDoneHtml = V13
            ? `<button type="button" class="inline-control combatant-control action-done ${actionDone} icon fa-solid fa-check" data-tooltip aria-label="Done"></button>`
            : `<a class='combatant-control action-done ${actionDone}' data-tooltip="Done"><i class='fas fa-check'></i></a>`;
          controls.eq(1).after(actionDoneHtml);

          const readied = cmbtant.actor.hasEffect("readied") ? "active" : "";
          const readiedHtml = V13
            ? `<button type="button" class="inline-control combatant-control click-readied ${readied} icon fa-solid fa-thumbs-up" data-tooltip aria-label="Readied"></button>`
            : `<a class='combatant-control click-readied ${readied}' data-tooltip="Readied"><i class='fas fa-thumbs-up'></i></a>`;
          controls.eq(1).after(readiedHtml);

          const delayed = cmbtant.actor.hasEffect("delayed") ? "active" : "";
          const delayedHtml = V13
            ? `<button type="button" class="inline-control combatant-control click-delayed ${delayed} icon fa-solid fa-clock" data-tooltip aria-label="Delayed"></button>`
            : `<a class='combatant-control click-delayed ${delayed}' data-tooltip="Delayed"><i class='fas fa-clock'></i></a>`;
          controls.eq(1).after(delayedHtml);

          const slumbering = cmbtant.actor.hasEffect("slumbering") ? "active" : "";
          const slumberingHtml = V13
            ? `<button type="button" class="inline-control combatant-control click-slumbering ${slumbering} icon fa-solid fa-person-falling-burst" data-tooltip aria-label="Slumbering"></button>`
            : `<a class='combatant-control click-slumbering ${slumbering}' data-tooltip="Slumbering"><i class='fas fa-person-falling-burst'></i></a>`;
          controls.eq(1).after(slumberingHtml);

          const spellActive = cmbtant.flags.acks?.prepareSpell ? "active" : "";
          const spellActiveHtml = V13
            ? `<button type="button" class="inline-control combatant-control prepare-spell ${spellActive} icon fa-solid fa-magic" data-tooltip aria-label="Casting"></button>`
            : `<a class='combatant-control prepare-spell ${spellActive}' data-tooltip="Casting"><i class='fas fa-magic'></i></a>`;
          controls.eq(1).after(spellActiveHtml);

          const outNumbering = cmbtant.flags.acks?.outnumbering ? "active" : "";
          const outNumberingHtml = V13
            ? `<button type="button" class="inline-control combatant-control outnumbering ${outNumbering} icon fa-solid fa-people-group" data-tooltip aria-label="Outnumbering"></button>`
            : `<span class='combatant-control outnumbering ${outNumbering}' data-tooltip="Outnumbering"><i class='fas fa-people-group'></i></span>`;
          controls.eq(1).after(outNumberingHtml);
        }
      }
    });

    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!! Round 0");
    AcksCombat.announceListener($html);

    $html.find(".combatant").each((_, ct) => {
      // Get the groups
      const groups = game.combat.getFlag("acks", "groups") || [];

      if (colorEnabled) {
        const combatant = object.viewed.combatants.get(ct.dataset.combatantId);
        // Search if the combatant token is inside a group
        let tokenH4 = V13 ? $(ct).find("strong.name") : $(ct).find("h4");
        groups.forEach((groupData, index) => {
          if (groupData.tokens?.includes(combatant.token.id)) {
            // Add the group ID to the H4 content text
            tokenH4.text(tokenH4.text() + ` [G${index}]`);
          }
        });
        // Append colored flag
        let color = combatant?.token?.disposition === 1 ? colorFriendlies : colorHostiles;
        //console.log("Token H4", tokenH4, color);
        tokenH4.css("color", color);
      }
    });
    //AcksCombat.addListeners($html);
  }

  /*******************************************************/
  static updateCombatant(combat, combatant, data) {
    let init = "individual"; //UNUSED game.settings.get("acks", "initiative");
    // Why do you reroll ?
    // Legacy Slowness code from OSE
    //    if (combatant.actor.data.data.isSlow) {
    //      data.initiative = -789;
    //      return;
    //    }
    if (data.initiative && init == "group") {
      let groupInit = data.initiative;
      // Check if there are any members of the group with init
      combat.combatants.forEach((ct) => {
        if (
          ct.initiative &&
          ct.initiative != "-789.00" &&
          ct._id != data._id &&
          ct.flags.acks.group == combatant.flags.acks.group
        ) {
          groupInit = ct.initiative;
          // Set init
          data.initiative = parseInt(groupInit);
        }
      });
    }
  }

  /*******************************************************/
  static announceListener(html) {
    html.find(".combatant-control.hold-turn").click(async (event) => {
      event.preventDefault();

      // Toggle hold announcement
      const id = $(event.currentTarget).closest(".combatant")[0].dataset.combatantId;
      const isActive = event.currentTarget.classList.contains("active");
      const combatant = game.combat.combatants.get(id);
      await combatant.update({
        _id: id,
        flags: {
          acks: {
            holdTurn: !isActive,
          },
        },
      });
    });

    html.find(".combatant-control.prepare-spell").click(async (event) => {
      event.preventDefault();

      // Toggle spell announcement
      const id = $(event.currentTarget).closest(".combatant")[0].dataset.combatantId;
      const isActive = event.currentTarget.classList.contains("active");
      const combatant = game.combat.combatants.get(id);
      if (isActive) {
        await combatant.setFlag("acks", "prepareSpell", false);
      } else {
        await combatant.setFlag("acks", "prepareSpell", true);
      }
    });

    html.find(".combatant-control.action-done").click(async (event) => {
      event.preventDefault();

      // Toggle retreat announcement
      const id = $(event.currentTarget).closest(".combatant")[0].dataset.combatantId;
      const isActive = event.currentTarget.classList.contains("active");
      const combatant = game.combat.combatants.get(id);
      if (isActive) {
        AcksUtility.removeEffect(combatant.actor, "done");
      } else {
        AcksUtility.removeEffect(combatant.actor, "delayed");
        AcksUtility.removeEffect(combatant.actor, "readied");
        AcksUtility.addUniqueStatus(combatant.actor, "done");
      }
    });

    html.find(".combatant-control.click-readied").click(async (event) => {
      event.preventDefault();

      // Toggle retreat announcement
      const id = $(event.currentTarget).closest(".combatant")[0].dataset.combatantId;
      const isActive = event.currentTarget.classList.contains("active");
      const combatant = game.combat.combatants.get(id);
      if (combatant.actor.hasEffect("done")) {
        ui.notifications.warn("You can't mark a delayed or done combatant as ready");
        return;
      }
      if (isActive) {
        AcksUtility.removeEffect(combatant.actor, "readied");
      } else {
        AcksUtility.removeEffect(combatant.actor, "delayed");
        AcksUtility.addUniqueStatus(combatant.actor, "readied");
      }
    });

    html.find(".combatant-control.click-delayed").click(async (event) => {
      event.preventDefault();

      // Toggle retreat announcement
      const id = $(event.currentTarget).closest(".combatant")[0].dataset.combatantId;
      const isActive = event.currentTarget.classList.contains("active");
      const combatant = game.combat.combatants.get(id);
      if (combatant.actor.hasEffect("done")) {
        ui.notifications.warn("You can't mark a readied or done combatant as delayed");
        return;
      }
      if (isActive) {
        AcksUtility.removeEffect(combatant.actor, "delayed");
      } else {
        AcksUtility.removeEffect(combatant.actor, "readied");
        AcksUtility.addUniqueStatus(combatant.actor, "delayed");
      }
    });

    html.find(".combatant-control.click-slumbering").click(async (event) => {
      event.preventDefault();

      // Toggle retreat announcement
      const id = $(event.currentTarget).closest(".combatant")[0].dataset.combatantId;
      const isActive = event.currentTarget.classList.contains("active");
      const combatant = game.combat.combatants.get(id);
      if (isActive) {
        AcksUtility.removeEffect(combatant.actor, "slumbering");
      } else {
        AcksUtility.addUniqueStatus(combatant.actor, "slumbering");
      }
    });

    html.find(".combat-control.create-group").click(async (event) => {
      event.preventDefault();
      let groupTokens = canvas.tokens.controlled;
      // Check if all tokens are NPCs
      for (let token of groupTokens) {
        if (token.actor.hasPlayerOwner) {
          //ui.notifications.warn("You can't group player tokens");
          //return;
        }
      }
      // Check if number of tokens is greater than 1
      if (groupTokens.length < 2) {
        ui.notifications.warn("You can't group a single token");
        return;
      }
      game.combat.manageGroup(groupTokens);
    });
  }

  /*******************************************************/
  static addListeners(html) {
    // Cycle through colors
    html.find(".combatant-control.flag").click(async (event) => {
      event.preventDefault();

      if (!game.user.isGM) {
        return;
      }

      const currentColor = event.currentTarget.style.color;
      const colors = Object.keys(CONFIG.ACKS.colors);
      let index = colors.indexOf(currentColor);
      if (index + 1 == colors.length) {
        index = 0;
      } else {
        index++;
      }

      const id = $(event.currentTarget).closest(".combatant")[0].dataset.combatantId;
      const combatant = game.combat.combatants.get(id);
      await combatant.update({
        combatantId: id,
        _id: id,
        flags: {
          acks: {
            group: colors[index],
          },
        },
      });
    });

    html.find('.combat-control[data-control="reroll"]').click(async (event) => {
      event.preventDefault();

      if (!game.combat) {
        return;
      }

      const data = {};
      AcksCombat.rollInitiative(game.combat, data);

      await game.combat.update({
        data: data,
      });

      game.combat.setupTurns();
    });
  }

  /*******************************************************/
  static activateCombatant(li) {
    const turn = game.combat.turns.findIndex((turn) => turn._id === li.data("combatant-id"));
    game.combat.update({ turn: turn });
  }

  /*******************************************************/
  static addContextEntry(html, options) {
    options.unshift({
      name: "Set Active",
      icon: '<i class="fas fa-star-of-life"></i>',
      callback: AcksCombat.activateCombatant,
    });
  }

  /*******************************************************/
  /* Sort current combatants in pools */
  static getCombatantsPool() {
    let pools = { friendly: [], neutral: [], hostile: [] };
    game.combat.combatants.forEach((cbt) => {
      //console.log("Combatant", cbt);
      if (!cbt.isDefeated) {
        if (cbt.token.disposition == 1) {
          pools.friendly.push(cbt);
        }
        if (cbt.token.disposition == -1) {
          pools.hostile.push(cbt);
        }
        if (cbt.token.disposition == 0) {
          pools.neutral.push(cbt);
        }
      }
    });
    return pools;
  }

  /*******************************************************/
  static combatTurn(combat, data, options) {}

  /*******************************************************/
  static combatRound(combat, data, options) {
    // Cleanup surprised effects
  }

  /*******************************************************/
  static async preUpdateCombat(combat, data, diff, id) {}
}

/* global Roll, game, foundry, canvas, CONFIG, ui */
import { ACKS } from "./config.mjs";
import { AcksUtility } from "./util/acks-utility.mjs";

export default class AcksCombatHelper {
  /*******************************************************/
  static async rollInitiative(combat, data) {
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
          group: ACKS.colors[group],
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
  static async resetInitiative(combat, _data) {
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
      console.error("Color settings not found", e);
    }

    // in Application v2 HTML is NOT jQuery by default
    const $html = $(html);
    $html.find(".initiative").each((_, span) => {
      span.innerHTML = span.innerHTML == "-789.00" ? '<i class="fas fa-weight-hanging"></i>' : span.innerHTML;
      span.innerHTML = span.innerHTML == "-790.00" ? '<i class="fas fa-dizzy"></i>' : span.innerHTML;
    });

    if (object.viewed) {
      let rollNPC = $html.find(`[data-action='rollNPC']`);
      rollNPC.after(` <a class="combat-button combat-control create-group" aria-label="{{localize 'COMBAT.createGroup'}}" role="button"
        data-tooltip="COMBAT.createGroup" data-control="create-group">
        <i class="fa-duotone fa-solid fa-people-group"></i>
      </a>`);
    }

    $html.find(".combatant").each((_, ct) => {
      // Append spellcast and retreat
      const controls = $(ct).find(".combatant-controls .combatant-control");

      if (ct?.dataset?.combatantId) {
        const cmbtant = game.combat.combatants.get(ct.dataset.combatantId);

        if (cmbtant?.actor) {
          const actionDone = cmbtant.actor.hasEffect("done") ? "active" : "";
          const actionDoneHtml = `<button type="button" class="inline-control combatant-control action-done ${actionDone} icon fa-solid fa-check" data-tooltip aria-label="Done"></button>`;
          controls.eq(1).after(actionDoneHtml);

          const readied = cmbtant.actor.hasEffect("readied") ? "active" : "";
          const readiedHtml = `<button type="button" class="inline-control combatant-control click-readied ${readied} icon fa-solid fa-thumbs-up" data-tooltip aria-label="Readied"></button>`;
          controls.eq(1).after(readiedHtml);

          const delayed = cmbtant.actor.hasEffect("delayed") ? "active" : "";
          const delayedHtml = `<button type="button" class="inline-control combatant-control click-delayed ${delayed} icon fa-solid fa-clock" data-tooltip aria-label="Delayed"></button>`;
          controls.eq(1).after(delayedHtml);

          const slumbering = cmbtant.actor.hasEffect("slumbering") ? "active" : "";
          const slumberingHtml = `<button type="button" class="inline-control combatant-control click-slumbering ${slumbering} icon fa-solid fa-person-falling-burst" data-tooltip aria-label="Slumbering"></button>`;
          controls.eq(1).after(slumberingHtml);

          const spellActive = cmbtant.flags.acks?.prepareSpell ? "active" : "";
          const spellActiveHtml = `<button type="button" class="inline-control combatant-control prepare-spell ${spellActive} icon fa-solid fa-magic" data-tooltip aria-label="Casting"></button>`;
          controls.eq(1).after(spellActiveHtml);

          const outNumbering = cmbtant.flags.acks?.outnumbering ? "active" : "";
          const outNumberingHtml = `<button type="button" class="inline-control combatant-control outnumbering ${outNumbering} icon fa-solid fa-people-group" data-tooltip aria-label="Outnumbering"></button>`;
          controls.eq(1).after(outNumberingHtml);
        }
      }
    });

    AcksCombatHelper.announceListener($html);

    $html.find(".combatant").each((_, ct) => {
      // Get the groups
      const groups = game.combat.getFlag("acks", "groups") || [];

      if (colorEnabled) {
        const combatant = object.viewed.combatants.get(ct.dataset.combatantId);
        // Search if the combatant token is inside a group
        let tokenH4 = $(ct).find("strong.name");
        groups.forEach((groupData, index) => {
          if (groupData.tokens?.includes(combatant.token.id)) {
            // Add the group ID to the H4 content text
            tokenH4.text(tokenH4.text() + ` [G${index}]`);
          }
        });
        // Append colored flag
        let color = combatant?.token?.disposition === 1 ? colorFriendlies : colorHostiles;
        tokenH4.css("color", color);
      }
    });
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
      const colors = Object.keys(ACKS.colors);
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
      AcksCombatHelper.rollInitiative(game.combat, data);

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
      callback: AcksCombatHelper.activateCombatant,
    });
  }

  /*******************************************************/
  static combatTurn(_combat, _data, _options) {}

  /*******************************************************/
  static combatRound(_combat, _data, _options) {
    // Cleanup surprised effects
  }

  /*******************************************************/
  static async preUpdateCombat(_combat, _data, _diff, _id) {}
}

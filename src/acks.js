// Import Modules
import { AcksItemSheet } from "./module/item/item-sheet.js";
import { AcksActorSheetCharacter } from "./module/actor/character-sheet.js";
import { AcksActorSheetMonster } from "./module/actor/monster-sheet.js";
import { preloadHandlebarsTemplates } from "./module/preloadTemplates.js";
import { AcksActor } from "./module/actor/entity.js";
import { AcksItem } from "./module/item/entity.js";
import { ACKS } from "./module/config.js";
import { registerMainSettings } from "./module/settings.js";
import { registerHelpers } from "./module/helpers.js";
import * as chat from "./module/chat.js";
import * as treasure from "./module/treasure.js";
import * as macros from "./module/macros.js";
import * as party from "./module/party.js";
import { AcksCombat, AcksCombatClass } from "./module/combat.js";
import { AcksTokenHud } from "./module/acks-token-hud.js";
import { AcksUtility } from "./module/utility.js";
import { AcksPolyglot } from "./module/apps/polyglot-support.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function () {
  //CONFIG.debug.hooks = true;

  // Clamp/Clamped management v11/v12
  if (Math.clamp === undefined) {
    Math.clamp = function (a, b, c) {
      return Math.max(b, Math.min(c, a));
    };
  };

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d6 + @initiative.value",
    decimals: 1,
  };

  CONFIG.ACKS = ACKS;

  game.acks = {
    rollItemMacro: macros.rollItemMacro,
  };

  // Custom Handlebars helpers
  registerHelpers();
  registerMainSettings();

  CONFIG.Actor.documentClass = AcksActor;
  CONFIG.Item.documentClass = AcksItem;
  CONFIG.Combat.documentClass = AcksCombatClass;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("acks", AcksActorSheetCharacter, {
    types: ["character"],
    makeDefault: true,
  });
  Actors.registerSheet("acks", AcksActorSheetMonster, {
    types: ["monster"],
    makeDefault: true,
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("acks", AcksItemSheet, {
    makeDefault: true,
  });

  await preloadHandlebarsTemplates();

  AcksTokenHud.init()

  // Ensure new effect transfer
  CONFIG.ActiveEffect.legacyTransferral = false;

  Hooks.on("getSceneControlButtons", (controls) => {
    const V13 = game.release.generation >= 13;
    const targetControl = V13 ? controls?.tokens : controls.find((control) => control.name === "token");
    const isGM = game.user.isGM;
    if(!targetControl) {
      return;
    }
    const partyBtnAction = () => {
      const actorDirectory = game.actors.apps.find((app) => app instanceof ActorDirectory);
      if(actorDirectory) {
        party.showPartySheet(actorDirectory);
      } else {
        ui.notifications.error("Something went wrong. Can't find ActorDirectory.");
      }
    };
    const partyButtonTool = {
      name: "acksPartyButton",
      title: "ACKS.dialog.partysheet",
      icon: "fas fa-users",
      button: true,
      visible: isGM,
    };
    if(V13) {
      partyButtonTool.onChange = () => partyBtnAction();
      targetControl.tools.acksPartyButton = partyButtonTool;
    } else {
      // onClick is deprecated in v13
      partyButtonTool.onClick = () => partyBtnAction();
      targetControl.tools.push(partyButtonTool);
    }
  });
});

// Setup Polyglot stuff if needed
AcksPolyglot.init()

/**
 * This function runs after game data has been requested and loaded from the servers, so entities exist
 */
Hooks.once("setup", function () {
  // Localize CONFIG objects once up-front
  const toLocalize = ["saves_short", "saves_long", "scores", "armor", "colors", "tags"];
  for (let o of toLocalize) {
    CONFIG.ACKS[o] = Object.entries(CONFIG.ACKS[o]).reduce((obj, e) => {
      obj[e[0]] = game.i18n.localize(e[1]);
      return obj;
    }, {});
  }
});

Hooks.once("ready", async () => {
  Hooks.on("hotbarDrop", (bar, data, slot) =>
    macros.createAcksMacro(data, slot)
  );

  AcksUtility.setupSocket()
  if (game.user.isGM) { // only for GM, to avoid dummy permissions issues
    AcksUtility.updateWeightsLanguages()
    AcksUtility.displayWelcomeMessage()
  }

});

// License and KOFI infos
Hooks.on("preUpdateCombatant", AcksCombat.updateCombatant);
Hooks.on("renderCombatTracker", AcksCombat.format);
Hooks.on("preUpdateCombat", AcksCombat.preUpdateCombat);
Hooks.on("getCombatTrackerEntryContext", AcksCombat.addContextEntry);
Hooks.on('combatTurn', AcksCombat.combatTurn);
Hooks.on('combatRound', AcksCombat.combatRound);

Hooks.on("renderChatLog", (app, html, data) => AcksItem.chatListeners(html));
Hooks.on("getChatLogEntryContext", chat.addChatMessageContextOptions);
Hooks.on("renderChatMessage", chat.addChatMessageButtons);
Hooks.on("renderRollTableConfig", treasure.augmentTable);
Hooks.on("updateActor", party.update);

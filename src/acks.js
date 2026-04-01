/* global CONFIG, game, Hooks, foundry */
import { preloadHandlebarsTemplates } from "./module/preloadTemplates.js";
import AcksActor from "./module/documents/actor.mjs";
import AcksItem from "./module/documents/item.mjs";
import { ACKS } from "./module/config.mjs";
import { registerMainSettings } from "./module/settings.mjs";
import { registerHelpers } from "./module/helpers.mjs";
import * as chat from "./module/chat.mjs";
import * as macros from "./module/macros.js";
import AcksCombat from "./module/combat.mjs";
import { AcksTokenHud } from "./module/acks-token-hud.js";
import { AcksUtility } from "./module/utility.js";
import AcksPolyglot from "./module/apps/polyglot-support.mjs";
import ACKSTableManager from "./module/apps/table-manager.mjs";
import ACKSCommands from "./module/apps/acks-commands.mjs";
import AcksItemSheetV2 from "./module/item/item-sheet-v2.mjs";
import LanguageData from "./module/data/item/language-data.mjs";
import MoneyData from "./module/data/item/money-data.mjs";
import ItemData from "./module/data/item/item-data.mjs";
import WeaponData from "./module/data/item/weapon-data.mjs";
import ArmorData from "./module/data/item/armor-data.mjs";
import SpellData from "./module/data/item/spell-data.mjs";
import AbilityData from "./module/data/item/ability-data.mjs";
import CharacterData from "./module/data/actor/character-data.mjs";
import MonsterData from "./module/data/actor/monster-data.mjs";
import ACKSCharacterSheetV2 from "./module/actor/character-sheet-v2.mjs";
import ACKSMonsterSheetV2 from "./module/actor/monster-sheet-v2.mjs";
import ItemBundleData from "./module/data/item/item-bundle-data.mjs";
import renderActorDirectory from "./module/hooks/render-actor-directory.mjs";
import { showPartySheet } from "./module/party.mjs";
import AcksCombatHelper from "./module/combat-helper.mjs";

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
  }

  // Set an initiative formula for the system
  CONFIG.Combat.initiative = {
    formula: "1d6 + @initiative.value",
    decimals: 1,
  };

  CONFIG.ACKS = ACKS;

  game.acks = {
    rollItemMacro: macros.rollItemMacro,
  };

  // Custom Handlebars helpers
  void registerHelpers();
  void registerMainSettings();

  CONFIG.Actor.documentClass = AcksActor;
  CONFIG.Actor.dataModels = {
    character: CharacterData,
    monster: MonsterData,
  };

  CONFIG.Item.documentClass = AcksItem;
  CONFIG.Item.dataModels = {
    language: LanguageData,
    money: MoneyData,
    item: ItemData,
    weapon: WeaponData,
    armor: ArmorData,
    spell: SpellData,
    ability: AbilityData,
    bundle: ItemBundleData,
  };
  CONFIG.Combat.documentClass = AcksCombat;

  // Unregister default sheets
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);

  foundry.documents.collections.Items.registerSheet("acks", AcksItemSheetV2, { makeDefault: true });

  foundry.documents.collections.Actors.registerSheet("acks", ACKSCharacterSheetV2, {
    types: ["character"],
    makeDefault: true,
  });
  foundry.documents.collections.Actors.registerSheet("acks", ACKSMonsterSheetV2, {
    types: ["monster"],
    makeDefault: true,
  });

  await preloadHandlebarsTemplates();

  AcksTokenHud.init();
  ACKSCommands.init();

  // Ensure new effect transfer
  CONFIG.ActiveEffect.legacyTransferral = false;

  Hooks.on("getSceneControlButtons", (controls) => {
    const targetControl = controls?.tokens;
    if (!targetControl) {
      return;
    }
    const partyButtonTool = {
      name: "acksPartyButton",
      title: "ACKS.dialog.partysheet",
      icon: "fas fa-users",
      button: true,
      visible: true,
    };

    partyButtonTool.onChange = () => showPartySheet();
    targetControl.tools.acksPartyButton = partyButtonTool;
  });
});

// Setup Polyglot stuff if needed
AcksPolyglot.init();

/**
 * This function runs after game data has been requested and loaded from the servers, so entities exist
 */
Hooks.once("setup", function () {
  // Localize CONFIG objects once up-front
  const toLocalize = ["saves_short", "saves_long", "scores", "armor", "colors", "tags"];
  for (let o of toLocalize) {
    ACKS[o] = Object.entries(ACKS[o]).reduce((obj, e) => {
      obj[e[0]] = game.i18n.localize(e[1]);
      return obj;
    }, {});
  }
});

Hooks.on("chatMessage", (html, content, msg) => {
  if (content[0] === "/") {
    let regExp = /(\S+)/g;
    let commands = content.match(regExp);
    if (game.acks.commands.processChatCommand(commands, content, msg)) {
      return false;
    }
  }
  return true;
});

Hooks.once("ready", async () => {
  Hooks.on("hotbarDrop", (bar, data, slot) => macros.createAcksMacro(data, slot));

  AcksUtility.updateWeightsLanguages();
  AcksUtility.displayWelcomeMessage();
  AcksUtility.setupSocket();
  ACKSTableManager.init();
});

// License and KOFI infos
Hooks.on("preUpdateCombatant", AcksCombatHelper.updateCombatant);
Hooks.on("renderCombatTracker", AcksCombatHelper.format);
Hooks.on("preUpdateCombat", AcksCombatHelper.preUpdateCombat);
Hooks.on("getCombatTrackerEntryContext", AcksCombatHelper.addContextEntry);
Hooks.on("combatTurn", AcksCombatHelper.combatTurn);
Hooks.on("combatRound", AcksCombatHelper.combatRound);

Hooks.on("renderChatLog", (_app, html, _data) => AcksItem.chatListeners(html));
Hooks.on("renderChatMessageHTML", chat.addChatMessageButtons);

Hooks.on("renderActorDirectory", (app, html, data) => renderActorDirectory(app, html, data));

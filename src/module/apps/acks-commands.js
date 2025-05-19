/* -------------------------------------------- */
import { AcksMortalWoundsDialog } from "../dialog/mortal-wounds.js";
import { AcksTamperingDialog } from "../dialog/tampering-mortality.js";

/* -------------------------------------------- */
export class AcksCommands {
  static init() {
    if (!game.acks.commands) {
      const commands = new AcksCommands();
      commands.registerCommand({
        path: ["/mortal"],
        func: (content, msg, params) => AcksCommands.rollMortalWounds(msg, params),
        descr: "Roll Mortal Wounds",
      });
      commands.registerCommand({
        path: ["/tampering"],
        func: (content, msg, params) => AcksCommands.rollTampering(msg, params),
        descr: "Roll Tampering With Mortality",
      });
      game.acks.commands = commands;
    }
  }
  constructor() {
    this.commandsTable = {};
  }

  /* -------------------------------------------- */
  registerCommand(command) {
    this._addCommand(this.commandsTable, command.path, "", command);
  }

  /* -------------------------------------------- */
  _addCommand(targetTable, path, fullPath, command) {
    if (!this._validateCommand(targetTable, path, command)) {
      return;
    }
    const term = path[0];
    fullPath = fullPath + term + " ";
    if (path.length == 1) {
      command.descr = `<strong>${fullPath}</strong>: ${command.descr}`;
      targetTable[term] = command;
    } else {
      if (!targetTable[term]) {
        targetTable[term] = { subTable: {} };
      }
      this._addCommand(targetTable[term].subTable, path.slice(1), fullPath, command);
    }
  }

  /* -------------------------------------------- */
  _validateCommand(targetTable, path, command) {
    if (path.length > 0 && path[0] && command.descr && (path.length != 1 || targetTable[path[0]] == undefined)) {
      return true;
    }
    console.warn("AcksCommands._validateCommand failed ", targetTable, path, command);
    return false;
  }

  /* -------------------------------------------- */
  /* Manage chat commands */
  processChatCommand(commandLine, content = "", msg = {}) {
    // Setup new message's visibility
    let rollMode = game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode)) msg["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if (rollMode === "blindroll") msg["blind"] = true;
    msg["type"] = 0;

    let command = commandLine[0].toLowerCase();
    let params = commandLine.slice(1);

    return this.process(command, params, content, msg);
  }

  /* -------------------------------------------- */
  process(command, params, content, msg) {
    return this._processCommand(this.commandsTable, command, params, content, msg);
  }

  /* -------------------------------------------- */
  _processCommand(commandsTable, name, params, content = "", msg = {}, path = "") {
    console.log("===> Processing command");
    let command = commandsTable[name];
    path = path + name + " ";
    if (command?.subTable) {
      if (params[0]) {
        return this._processCommand(command.subTable, params[0], params.slice(1), content, msg, path);
      } else {
        this.help(msg, command.subTable);
        return true;
      }
    }
    if (command?.func) {
      const result = command.func(content, msg, params);
      if (!result) {
        AcksCommands._chatAnswer(msg, command.descr);
      }
      return true;
    }
    return false;
  }

  /* -------------------------------------------- */
  static _chatAnswer(msg, content) {
    msg.whisper = [game.user.id];
    msg.content = content;
    ChatMessage.create(msg);
  }

  /* --------------------------------------------- */
  static async rollMortalWounds(msg, params) {
    let dialog = new AcksMortalWoundsDialog();
    dialog.init();
  }

  /* --------------------------------------------- */
  static async rollTampering(msg) {
    let dialog = new AcksTamperingDialog();
    dialog.init();
  }
}

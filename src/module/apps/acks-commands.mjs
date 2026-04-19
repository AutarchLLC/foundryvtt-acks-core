/* global game, ChatMessage */
import CharacterMortalWoundsApp from "./character-mortal-wounds-app.mjs";
import CharacterTamperingMortalityApp from "./character-tampering-mortality-app.mjs";

/* -------------------------------------------- */
export default class ACKSCommands {
  #commandsTable = {};

  constructor() {}

  static init() {
    if (game.acks.commands) {
      return;
    }

    const commands = new ACKSCommands();

    commands.registerCommand({
      path: ["/mortal"],
      func: (_content, _msg, _params) => ACKSCommands.#rollMortalWounds(),
      desc: "Roll Mortal Wounds",
    });
    commands.registerCommand({
      path: ["/tampering"],
      func: (_content, _msg, _params) => ACKSCommands.#rollTampering(),
      desc: "Roll Tampering With Mortality",
    });
    game.acks.commands = commands;
  }

  registerCommand(command) {
    this.#addCommand(this.#commandsTable, command.path, "", command);
  }

  processChatCommand(commandLine, content = "", msg = {}) {
    // Setup new message's visibility
    const rollMode = game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode)) {
      msg.whisper = ChatMessage.getWhisperRecipients("GM");
    }
    if (rollMode === "blindroll") {
      msg.blind = true;
    }
    msg.type = 0;

    const command = commandLine[0].toLowerCase();
    const params = commandLine.slice(1);

    return this.#process(command, params, content, msg);
  }

  static #chatAnswer(msg, content) {
    msg.whisper = [game.user.id];
    msg.content = content;
    ChatMessage.create(msg);
  }

  static async #rollMortalWounds() {
    return new CharacterMortalWoundsApp().render(true);
  }

  static async #rollTampering() {
    return new CharacterTamperingMortalityApp().render(true);
  }

  #addCommand(targetTable, path, fullPath, command) {
    if (!this.#validateCommand(targetTable, path, command)) {
      return;
    }
    const term = path[0];
    fullPath = fullPath + term + " ";
    if (path.length === 1) {
      command.desc = `<strong>${fullPath}</strong>: ${command.desc}`;
      targetTable[term] = command;
    } else {
      if (!targetTable[term]) {
        targetTable[term] = { subTable: {} };
      }
      this.#addCommand(targetTable[term].subTable, path.slice(1), fullPath, command);
    }
  }

  #validateCommand(targetTable, path, command) {
    if (path.length > 0 && path[0] && command.desc && (path.length !== 1 || targetTable[path[0]] === undefined)) {
      return true;
    }
    console.warn("ACKSCommands.#validateCommand failed ", targetTable, path, command);
    return false;
  }

  #process(command, params, content, msg) {
    return this.#processCommand(this.#commandsTable, command, params, content, msg);
  }

  #processCommand(commandsTable, name, params, content = "", msg = {}, path = "") {
    const command = commandsTable[name];
    path = path + name + " ";
    if (command.subTable) {
      if (params[0]) {
        return this.#processCommand(command.subTable, params[0], params.slice(1), content, msg, path);
      } else {
        //FIXME: this.help(msg, command.subTable);
        return true;
      }
    }
    if (command.func) {
      const result = command.func(content, msg, params);
      if (!result) {
        ACKSCommands.#chatAnswer(msg, command.desc);
      }
      return true;
    }
    return false;
  }
}

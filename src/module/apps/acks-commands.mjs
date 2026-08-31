/* global foundry */
import CharacterMortalWoundsApp from "./character-mortal-wounds-app.mjs";
import CharacterTamperingMortalityApp from "./character-tampering-mortality-app.mjs";

export default function registerACKSCommands() {
  /** @type ChatCommandPattern */
  foundry.applications.sidebar.tabs.ChatLog.CHAT_COMMANDS.mortal = {
    rgx: /^\/mortal$/i,
    fn: async () => showCharacterMortalWoundsApp(),
  };

  /** @type ChatCommandPattern */
  foundry.applications.sidebar.tabs.ChatLog.CHAT_COMMANDS.tampering = {
    rgx: /^\/tampering$/i,
    fn: async () => showCharacterTamperingMortalityApp(),
  };
}

const showCharacterMortalWoundsApp = function () {
  const _ = new CharacterMortalWoundsApp().render(true);
  return false; // Prevent message creation
};

const showCharacterTamperingMortalityApp = function () {
  const _ = new CharacterTamperingMortalityApp().render(true);
  return false; // Prevent message creation
};

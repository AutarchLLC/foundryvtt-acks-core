import { createACKSMacro } from "../macros.mjs";

/**
 * https://foundryvtt.com/api/v13/functions/hookEvents.hotbarDrop.html
 * @param {Hotbar} hotbar The Hotbar application instance
 * @param {object} data The dropped data object
 * @param {string} slot The target hotbar slot
 * @return {void|boolean} Return false to prevent the default behavior, otherwise return nothing
 */
export default function hotbarDrop(hotbar, data, slot) {
  if (data.type === "Item") {
    void createACKSMacro(data, slot);
    return false;
  }
}

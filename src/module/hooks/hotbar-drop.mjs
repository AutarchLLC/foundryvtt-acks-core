import { createACKSMacro } from "../macros.mjs";

/**
 * A hook event that fires whenever data is dropped into a Hotbar slot.
 * The hook provides a reference to the Hotbar application, the dropped data, and the target slot.
 * Default handling of the drop event can be prevented by returning false within the hooked function.
 * @see https://foundryvtt.com/api/functions/hookEvents.hotbarDrop.html
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

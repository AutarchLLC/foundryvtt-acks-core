/* global game */
import { SAVING_THROW_CHOICES } from "../../../constants.mjs";

/**
 * Chat card button that rolls a saving throw for the clicking user's controlled tokens.
 * Handled by the `save` action of {@link ACKSChatMessage}.
 * @param {string} save - a `SAVING_THROW` key, or blank for none
 * @return {?{action: "save", actionParam: string, label: string}} the button, or null when there is no save
 */
export default function createSaveChatButton(save) {
  if (!save) {
    return null;
  }
  return {
    action: "save",
    actionParam: save,
    label: `${game.i18n.localize(SAVING_THROW_CHOICES[save])} - ${game.i18n.localize("ACKS.spells.Save")}`,
  };
}

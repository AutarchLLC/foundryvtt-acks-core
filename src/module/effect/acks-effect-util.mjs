/* global foundry, game */
export default class AcksEffectUtil {
  /**
   * Creates new ActiveEffect document and shows its sheet
   * @param {string} effectType
   * @param {AcksItem|ClientDocument} owner
   * @return {Promise<void|*>}
   */
  static async addEffect(effectType, owner) {
    // Get registered ActiveEffect Document Class (in case we are going to have custom one).
    const ActiveEffectClass = foundry.utils.getDocumentClass("ActiveEffect");

    const effect = await ActiveEffectClass.implementation.create(
      {
        name: game.i18n.format("DOCUMENT.New", { type: game.i18n.localize("DOCUMENT.ActiveEffect") }),
        transfer: true,
        img: "icons/svg/aura.svg",
        origin: owner.uuid,
        "duration.rounds": effectType === "temporary" ? 1 : undefined,
        disabled: effectType === "inactive",
        changes: [{}],
      },
      { parent: owner },
    );

    return effect.sheet.render(true);
  }

  /**
   * Toggles Active effect on a document
   * @param {string} effectUuid
   * @return {Promise<void>}
   */
  static async toggleEffect(effectUuid) {
    const effect = await foundry.utils.fromUuid(effectUuid);

    if (effect) {
      return effect.update({ disabled: !effect.disabled });
    }
  }

  /**
   * Edits Active effect on a document
   * @param {string} effectUuid
   * @return {Promise<void>}
   */
  static async editEffect(effectUuid) {
    const effect = await foundry.utils.fromUuid(effectUuid);

    if (effect) {
      return effect.sheet.render(true);
    }
  }

  /**
   * Deletes Active effect from a document
   * @param {string} effectUuid
   * @return {Promise<void>}
   */
  static async deleteEffect(effectUuid) {
    const effect = await foundry.utils.fromUuid(effectUuid);

    if (effect) {
      return effect.delete();
    }
  }
}

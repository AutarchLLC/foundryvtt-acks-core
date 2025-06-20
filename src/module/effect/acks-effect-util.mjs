export default class AcksEffectUtil {
  /**
   * Creates new ActiveEffect document and shows its sheet
   * @param {string} effectType
   * @param {AcksItem|ClientDocument} owner
   * @return {Promise<void|*>}
   */
  static async addEffect(effectType, owner) {
    // Get registered ActiveEffect Document Class (in case we are going to have custom one).
    const ActiveEffectClass = getDocumentClass("ActiveEffect");

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
   * @param {string} effectId
   * @param {AcksItem|ClientDocument} owner
   * @return {Promise<void>}
   */
  static async toggleEffect(effectId, owner) {
    const effect = owner.effects.get(effectId);

    if (effect) {
      return effect.update({ disabled: !effect.disabled });
    }
  }

  /**
   * Edits Active effect on a document
   * @param {string} effectId
   * @param {AcksItem|ClientDocument} owner
   * @return {Promise<void>}
   */
  static async editEffect(effectId, owner) {
    const effect = owner.effects.get(effectId);

    if (effect) {
      return effect.sheet.render(true);
    }
  }

  /**
   * Deletes Active effect from a document
   * @param {string} effectId
   * @param {AcksItem|ClientDocument} owner
   * @return {Promise<void>}
   */
  static async deleteEffect(effectId, owner) {
    const effect = owner.effects.get(effectId);

    if (effect) {
      return effect.delete();
    }
  }
}

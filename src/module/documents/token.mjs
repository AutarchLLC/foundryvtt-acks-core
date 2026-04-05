/* global TokenDocument, game */
export default class ACKSToken extends TokenDocument {
  /**
   * Pre-process a creation operation for a single Document instance. Pre-operation events only occur for the client
   * which requested the operation.
   *
   * Modifications to the pending Document instance must be performed using <b>updateSource</b>.
   *
   * @param {object} data The initial data object provided to the document creation request
   * @param {object} options Additional options which modify the creation request
   * @param {BaseUser} user The User requesting the document creation
   * @return {Promise<boolean|void>} Return false to exclude this Document from the creation operation
   * @protected
   * @override
   */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) {
      return false;
    }
    // Auto roll HP for synthetic monsters (not linked)
    if (this.actor.type === "monster" && !this.actorLink && game.settings.get("acks", "autoRollMonsterHP")) {
      /** @type Roll */
      const hpRoll = await this.actor.rollHP(false);
      this.delta.updateSource({
        "system.hp": {
          max: hpRoll.total,
          value: hpRoll.total,
        },
      });
    }
  }
}

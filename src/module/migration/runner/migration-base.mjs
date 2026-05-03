export default class MigrationBase {
  /** @type number */
  static version = 0;

  version = this.constructor.version;

  /**
   * Setting requiresFlush to true will indicate that the migration runner should not call any more
   * migrations after this in a batch. Use this if you are adding items to actors for instance.
   */
  requiresFlush = false;

  /**
   * Modify actor field - `source.system.foo = newValue`.
   * Add an item - Push to `source.items` *without* `_id`.
   * Remove an item - Splice/filter from `source.items` by `_id`.
   * @param source
   * @return {Promise<boolean>}
   */
  // eslint-disable-next-line no-unused-vars
  async updateActor(source) {
    return false;
  }

  // eslint-disable-next-line no-unused-vars
  async updateItem(source, actorSource) {
    return false;
  }
}

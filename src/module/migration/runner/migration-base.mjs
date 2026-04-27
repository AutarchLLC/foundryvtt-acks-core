export default class MigrationBase {
  /** @type number */
  static version = 0;

  version = this.constructor.version;

  /**
   * Setting requiresFlush to true will indicate that the migration runner should not call any more
   * migrations after this in a batch. Use this if you are adding items to actors for instance.
   */
  requiresFlush = false;

  async updateActor(_source) {
    return false;
  }

  async updateItem(_source, _actorSource) {
    return false;
  }
}

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
   * Build a Foundry update object for a single actor.
   * Each block should be guarded so it only runs when the old field exists,
   * making the function safe to call multiple times.
   * Modify actor field - `"source.system.foo" = newValue`.
   * Delete a key - `"system.saves.-=wand": null`   (the "-=" prefix) TODO: this is deprecated in Foundry v14
   *
   * Add an item - Push to `source.items` *without* `_id`.
   * Remove an item - Splice/filter from `source.items` by `_id`.
   * @param source
   * @return {Promise<boolean>}
   */
  // eslint-disable-next-line no-unused-vars
  async updateActor(source) {
    // Example A — rename a field:
    //   if ("wand" in (system.saves ?? {}) && !("implements" in (system.saves ?? {}))) {
    //     update["system.saves.implements"] = { value: system.saves.wand.value };
    //     update["system.saves.-=wand"] = null;
    //   }
    //
    // Example B — restructure a flat field into a SchemaField:
    //   if (typeof system.movement === "number") {
    //     update["system.movementacks"] = {
    //       exploration: system.movement * 10,
    //       combat:      system.movement * 3,
    //     };
    //     update["system.-=movement"] = null;
    //   }
    //
    // Example C — type coercion:
    //   if (typeof system.details?.xp === "string") {
    //     update["system.details.xp"] = Number(system.details.xp) || 0;
    //   }
    return false;
  }

  /**
   * Build a Foundry update object for a single item.
   * @param source
   * @param actorSource
   * @return {Promise<boolean>}
   */
  // eslint-disable-next-line no-unused-vars
  async updateItem(source, actorSource) {
    return false;
  }
}

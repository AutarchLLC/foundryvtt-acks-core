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
   * Migrate a single actor. Mutate `source` in place.
   *
   * Modify actor fields:  source.system.foo = newValue
   * Add an item:          push to source.items WITHOUT an _id
   * Remove an item:       splice/filter source.items by _id
   *
   * Item roster changes (add/remove) must only be done here, not in updateItem.
   * The runner diffs source.items by _id after this method runs:
   *   - Entry without _id  → createEmbeddedDocuments
   *   - Original _id missing from result → deleteEmbeddedDocuments
   *   - Do NOT copy an existing item with its _id to "duplicate" it — that updates the original.
   *
   * To delete a field from the DB use foundry.data.operators.ForcedDeletion (v14+).
   * The old "-=fieldName": null syntax still works in v14 but is deprecated (removed in v16).
   *
   * @param {object} source  Actor plain object. Mutate in place.
   * @return {Promise<void>}
   *
   * @example <caption>A — Rename a field</caption>
   * if (source.system.saves?.wand !== undefined && source.system.saves?.implements === undefined) {
   *   source.system.saves.implements = source.system.saves.wand;
   *   // v14+: ForcedDeletion permanently removes the key from the DB.
   *   source.system.saves.wand = new foundry.data.operators.ForcedDeletion();
   * }
   *
   * @example <caption>B — Restructure a flat value into an object</caption>
   * if (typeof source.system.movement === "number") {
   *   const old = source.system.movement;
   *   source.system.movement = { exploration: old, combat: old * 3 };
   * }
   *
   * @example <caption>C — Type coercion</caption>
   * if (typeof source.system.details?.xp === "string") {
   *   source.system.details.xp = Number(source.system.details.xp) || 0;
   * }
   *
   * @example <caption>D — Add a new embedded item</caption>
   * if (!source.items.some((i) => i.type === "language" && i.name === "Common")) {
   *   source.items.push({ type: "language", name: "Common", system: {} }); // no _id!
   * }
   *
   * @example <caption>E — Remove an embedded item</caption>
   * source.items = source.items.filter((i) => i.type !== "money" || i.name !== "Obsolete Currency");
   */
  // eslint-disable-next-line no-unused-vars
  async updateActor(source) {}

  /**
   * Migrate a single item's own fields. Mutate `source` in place.
   * Do NOT add or remove items here — use updateActor for roster changes.
   *
   * @param {object} source            Item plain object. Mutate in place.
   * @param {object|null} actorSource  Parent actor plain object (after updateActor ran),
   *                                   or null when migrating a world item with no parent.
   * @return {Promise<void>}
   *
   * @example <caption>A — Rename a field</caption>
   * if (source.type === "weapon" && source.system.dmg !== undefined && source.system.damage === undefined) {
   *   source.system.damage = source.system.dmg;
   *   // v14+: ForcedDeletion permanently removes the key from the DB.
   *   source.system.dmg = new foundry.data.operators.ForcedDeletion();
   * }
   *
   * @example <caption>B — Set a new field from actor context</caption>
   * if (source.type === "ability" && source.system.classTag === undefined && actorSource) {
   *   source.system.classTag = actorSource.system.details.class ?? "";
   * }
   *
   * @example <caption>C — Restructure nested data</caption>
   * if (source.type === "spell" && typeof source.system.range === "string") {
   *   source.system.range = { value: source.system.range, unit: "ft" };
   * }
   */
  // eslint-disable-next-line no-unused-vars
  async updateItem(source, actorSource = null) {}
}

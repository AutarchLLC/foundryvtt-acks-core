/* global foundry */
import MigrationBase from "../runner/migration-base.mjs";
import MigrationUtil from "../migration-util.mjs";

/**
 * Moves the new-actor marker from `system.isNew` to the `flags.acks.isNew` flag.
 *
 * A stored `true` or `false` becomes the flag's value; an actor without one gets no flag and counts as not new.
 * Keeping `false` matters for an unlinked token delta: it overrides a base actor that is still new.
 * `system.isNew` is deleted from every actor.
 *
 * No in-memory `migrateData()` equivalent: a system data model's `migrateData()` sees only the system data,
 * so it cannot set a flag. Read-only compendiums lose the field to schema cleaning and load as not new,
 * which is right for the system compendiums: none of their actors is stored as new.
 */
export class Migration9NewActorFlag extends MigrationBase {
  static version = 9;

  /**
   * @override
   * @inheritDoc
   */
  async updateActor(source) {
    const isNew = source.system?.isNew;
    if (typeof isNew === "boolean") {
      foundry.utils.setProperty(source, "flags.acks.isNew", isNew);
    }
    MigrationUtil.markPropertyForDeletion(source.system, "isNew");
  }
}

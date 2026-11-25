import MigrationBase from "../runner/migration-base.mjs";
import MigrationUtil from "../migration-util.mjs";

/**
 * Deletes a character's stored `encumbrance.max` and `encumbrance.forcemax` (#281).
 *
 * The Maximum Load is now derived from the Normal Load, which a character never stores: house rules change it with an
 * Active Effect on `system.encumbrance.normalLoad6`. A forced maximum set in Actor Tweaks is dropped, not converted.
 *
 * Only characters ever stored these keys, so the type is not checked: a token delta's source has no type.
 *
 * No in-memory `migrateData()` equivalent: schema cleaning already drops both keys from loaded documents.
 */
export class Migration10DropForcedMaxEncumbrance extends MigrationBase {
  static version = 10;

  /**
   * @override
   * @inheritDoc
   */
  async updateActor(source) {
    if (!source.system?.encumbrance) return;
    MigrationUtil.markPropertyForDeletion(source.system, "encumbrance.max");
    MigrationUtil.markPropertyForDeletion(source.system, "encumbrance.forcemax");
  }
}

import MigrationBase from "../runner/migration-base.mjs";
import { Migration1IISavingThrows } from "./m1-ii-saving-throws.mjs";
import { Migration2ItemWeightToStone } from "./m2-item-weight.mjs";
import { Migration3LanguagesToItems } from "./m3-languages-to-items.mjs";
import { Migration4WeaponsRework } from "./m4-weapons-rework.mjs";
import { Migration5DataCleanup } from "./m5-data-cleanup.mjs";

/**
 * Re-runs migrations 1–5 to repair worlds migrated by ACKS 14.1.0.
 *
 * The 14.1.0 runner migrated loaded documents instead of their stored data, so it wrote only the
 * schema version: no field it moved or reshaped was saved, no legacy field was deleted, and no
 * language item was created. Those documents still hold their legacy data, stamped as current,
 * so the loaded documents showed schema defaults (AC 0, attack throw 10, Blast 15, 1d6 damage, …).
 *
 * Migrations 1–5 only act on legacy data that is still present, and never overwrite a new field that
 * already has a value, so running them again leaves migrated documents unchanged and keeps any value
 * a user has entered since.
 */
export class Migration7RepairLostMigrations extends MigrationBase {
  static version = 7;

  /** @type {MigrationBase[]} */
  #repeated = [
    new Migration1IISavingThrows(),
    new Migration2ItemWeightToStone(),
    new Migration3LanguagesToItems(),
    new Migration4WeaponsRework(),
    new Migration5DataCleanup(),
  ];

  /**
   * @override
   * @inheritDoc
   */
  async updateActor(source) {
    for (const migration of this.#repeated) {
      await migration.updateActor(source);
    }
  }

  /**
   * @override
   * @inheritDoc
   */
  async updateItem(source, actorSource = null) {
    for (const migration of this.#repeated) {
      await migration.updateItem(source, actorSource);
    }
  }
}

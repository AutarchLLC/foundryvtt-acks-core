import MigrationBase from "../runner/migration-base.mjs";
import MigrationUtil from "../migration-util.mjs";
import { MovementData } from "../../data/actor/fields/movement-field.mjs";
import { ACTOR_TYPE } from "../../constants.mjs";

/**
 * Replaces the old movement fields with a Speed in every Movement Mode (#292).
 *
 * - Characters walk at 120, or at their stored exploration speed if movement was not calculated automatically.
 *   The Actor Tweaks movement bonus is dropped; an Active Effect on `system.movement.walking.speed` replaces it.
 * - Monsters walk at their old `movement.base`, taken as exploration speed. Speeds are read from the free-text
 *   `movement.value` too (see {@link MovementData.parseLegacyMovement}), and a labelled copy of both old fields is
 *   appended to the biography.
 *
 * Deletes `movement.base`, `movement.mod`, `movement.value`, and a character's `movementacks` and `config`.
 * The same conversion runs in memory in each actor data model's `migrateData()`.
 */
export class Migration11MovementModes extends MigrationBase {
  static version = 11;

  /**
   * @override
   * @inheritDoc
   */
  async updateActor(source) {
    const system = source.system;
    if (!system) return;

    if (MovementData.hasLegacyMovement(system)) {
      if (source.type === ACTOR_TYPE.MONSTER) {
        MovementData.migrateMonsterMovement(system);
      } else if (source.type === ACTOR_TYPE.PC) {
        MovementData.migrateCharacterMovement(system);
      }
    }

    for (const key of ["movement.base", "movement.mod", "movement.value", "movementacks", "config"]) {
      MigrationUtil.markPropertyForDeletion(system, key);
    }
  }
}

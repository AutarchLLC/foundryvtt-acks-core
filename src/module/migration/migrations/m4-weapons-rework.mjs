import MigrationBase from "../runner/migration-base.mjs";
import MigrationUtil from "../migration-util.mjs";

export class Migration4WeaponsRework extends MigrationBase {
  static version = 4;

  /**
   * @override
   * @inheritDoc
   */
  async updateItem(source, _actorSource = null) {
    MigrationUtil.markPropertyForDeletion(source.system, "slow");
  }
}

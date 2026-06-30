import MigrationBase from "../runner/migration-base.mjs";
import MigrationUtil from "../migration-util.mjs";
import WeaponDamageTemplate from "../../data/item/templates/weapon-damage-template.mjs";

export class Migration4WeaponsRework extends MigrationBase {
  static version = 4;

  /**
   * @override
   * @inheritDoc
   */
  async updateItem(source, _actorSource = null) {
    MigrationUtil.markPropertyForDeletion(source.system, "slow");
    WeaponDamageTemplate.migrateDamageStringToObject(source.system);
  }
}

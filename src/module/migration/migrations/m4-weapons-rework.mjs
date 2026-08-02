import MigrationBase from "../runner/migration-base.mjs";
import MigrationUtil from "../migration-util.mjs";
import WeaponDamageTemplate from "../../data/item/templates/weapon-damage-template.mjs";
import WeaponCustomTagsTemplate from "../../data/item/templates/weapon-custom-tags-template.mjs";

export class Migration4WeaponsRework extends MigrationBase {
  static version = 4;

  /**
   * @override
   * @inheritDoc
   */
  async updateItem(source, _actorSource = null) {
    MigrationUtil.markPropertyForDeletion(source.system, "slow");
    WeaponDamageTemplate.migrateDamageStringToObject(source.system);
    WeaponCustomTagsTemplate.migrateTags(source.system);
    MigrationUtil.markPropertyForDeletion(source.system, "tags");
  }
}

import MigrationBase from "../runner/migration-base.mjs";
import MigrationUtil from "../migration-util.mjs";
import WeaponCustomTagsTemplate from "../../data/item/templates/weapon-custom-tags-template.mjs";
import WeaponData from "../../data/item/weapon-data.mjs";

export class Migration4WeaponsRework extends MigrationBase {
  static version = 4;

  /**
   * @override
   * @inheritDoc
   */
  async updateItem(source, _actorSource = null) {
    MigrationUtil.markPropertyForDeletion(source.system, "slow");
    WeaponData.migrateDamageStringToObject(source.system);
    WeaponCustomTagsTemplate.migrateTags(source.system);
    MigrationUtil.markPropertyForDeletion(source.system, "tags");
  }
}

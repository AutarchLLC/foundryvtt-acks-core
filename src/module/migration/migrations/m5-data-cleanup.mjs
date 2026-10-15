import MigrationBase from "../runner/migration-base.mjs";
import MigrationUtil from "../migration-util.mjs";
import ActorCommonTemplate from "../../data/actor/templates/actor-common-template.mjs";
import ArmorData from "../../data/item/armor-data.mjs";
import { ITEM_TYPE } from "../../constants.mjs";

export class Migration5DataCleanup extends MigrationBase {
  static version = 5;

  /**
   * @override
   * @inheritDoc
   */
  async updateActor(source) {
    ActorCommonTemplate.migrateThac0ToAttack(source.system);
    MigrationUtil.markPropertyForDeletion(source.system, "thac0");
    MigrationUtil.markPropertyForDeletion(source.system, "attack.value");
    MigrationUtil.markPropertyForDeletion(source.system, "attack.bba");
    ActorCommonTemplate.migrateAacToAc(source.system);
    MigrationUtil.markPropertyForDeletion(source.system, "aac");
  }

  /**
   * @override
   * @inheritDoc
   */
  async updateItem(source, _actorSource = null) {
    if (source.type === ITEM_TYPE.ITEM) {
      MigrationUtil.markPropertyForDeletion(source.system, "quantity.max");
      MigrationUtil.markPropertyForDeletion(source.system, "treasure");
      MigrationUtil.markPropertyForDeletion(source.system, "iconsource");
      MigrationUtil.markPropertyForDeletion(source.system, "iconlicense");
    }
    if (source.type === ITEM_TYPE.ARMOR) {
      ArmorData.migrateAacToAc(source.system);
      MigrationUtil.markPropertyForDeletion(source.system, "aac");
    }
  }
}

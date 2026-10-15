import MigrationBase from "../runner/migration-base.mjs";
import MigrationUtil from "../migration-util.mjs";
import { ITEM_TYPE } from "../../constants.mjs";

export class Migration5DataCleanup extends MigrationBase {
  static version = 5;

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
  }
}

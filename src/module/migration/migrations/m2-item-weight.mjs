import MigrationBase from "../runner/migration-base.mjs";
import MigrationUtil from "../migration-util.mjs";
import ItemPhysicalTemplate from "../../data/item/templates/item-physical-template.mjs";

export class Migration2ItemWeightToStone extends MigrationBase {
  static version = 2;

  async updateItem(source, _actorSource = null) {
    ItemPhysicalTemplate.migrateWeightToWeight6(source.system);
    MigrationUtil.markPropertyForDeletion(source.system, "weight");
  }
}

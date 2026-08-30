import MigrationBase from "../runner/migration-base.mjs";
import SavingThrowsTemplate from "../../data/actor/templates/saving-throws.mjs";
import MigrationUtil from "../migration-util.mjs";

export class Migration1IISavingThrows extends MigrationBase {
  static version = 1;

  /**
   * @override
   * @inheritDoc
   */
  async updateActor(source) {
    SavingThrowsTemplate.migrateWandToImplements(source.system);
    MigrationUtil.markPropertyForDeletion(source.system, "saves.wand");

    SavingThrowsTemplate.migrateBreathToBlast(source.system);
    MigrationUtil.markPropertyForDeletion(source.system, "saves.breath");
  }

  /**
   * @override
   * @inheritDoc
   */
  async updateItem(source, _actorSource = null) {
    SavingThrowsTemplate.migrateSaveValue(source.system);
  }
}

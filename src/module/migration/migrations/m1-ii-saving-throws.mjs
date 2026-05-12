import MigrationBase from "../runner/migration-base.mjs";
import SavingThrowsTemplate from "../../data/actor/templates/saving-throws.mjs";
import MigrationUtil from "../migration-util.mjs";

export class Migration1IISavingThrows extends MigrationBase {
  static version = 1;

  async updateActor(source) {
    SavingThrowsTemplate.migrateWandToImplements(source.system);
    MigrationUtil.markPropertyForDeletion(source.system, "saves.wand");

    SavingThrowsTemplate.migrateBreathToBlast(source.system);
    MigrationUtil.markPropertyForDeletion(source.system, "saves.breath");
  }

  async updateItem(source, _actorSource = null) {
    if (source.system?.save === "wand") {
      source.system.save = "implements";
    } else if (source.system?.save === "breath") {
      source.system.save = "blast";
    }
  }
}

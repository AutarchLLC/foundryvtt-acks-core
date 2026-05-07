/* global foundry */
import MigrationBase from "../runner/migration-base.mjs";

export class Migration1IISavingThrows extends MigrationBase {
  static version = 1;

  async updateActor(source) {
    if (source.system.saves?.wand !== undefined && source.system.saves?.implements === undefined) {
      source.system.saves.implements = source.system.saves.wand;
      // ForcedDeletion is v14+; fall back to the deprecated "-=" prefix for v13.
      if (foundry.data.operators?.ForcedDeletion) {
        source.system.saves.wand = new foundry.data.operators.ForcedDeletion();
      } else {
        source.system.saves["-=wand"] = null;
      }
    }
    if (source.system.saves?.breath !== undefined && source.system.saves?.blast === undefined) {
      source.system.saves.blast = source.system.saves.breath;
      // ForcedDeletion is v14+; fall back to the deprecated "-=" prefix for v13.
      if (foundry.data.operators?.ForcedDeletion) {
        source.system.saves.breath = new foundry.data.operators.ForcedDeletion();
      } else {
        source.system.saves["-=breath"] = null;
      }
    }
  }

  async updateItem(source, _actorSource = null) {
    if (source.system?.save && source.system.save === "wand") {
      source.system.save = "implements";
    }
    if (source.system?.save && source.system.save === "breath") {
      source.system.save = "blast";
    }
  }
}

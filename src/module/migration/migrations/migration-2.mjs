import MigrationBase from "../runner/migration-base.mjs";

export class Migration2Test extends MigrationBase {
  static version = 2;

  async updateItem(source, actorSource = null) {
    return super.updateItem(source, actorSource);
  }
}

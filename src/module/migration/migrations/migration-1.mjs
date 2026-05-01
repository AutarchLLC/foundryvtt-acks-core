import MigrationBase from "../runner/migration-base.mjs";

export class Migration1Test extends MigrationBase {
  static version = 1;

  requiresFlush = true;

  async updateActor(source) {
    return super.updateActor(source);
    debugger;
  }

  async updateItem(source, actorSource) {
    return super.updateItem(source, actorSource);
    debugger;
  }
}

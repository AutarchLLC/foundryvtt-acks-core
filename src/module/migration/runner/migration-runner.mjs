export default class MigrationRunner {
  /** @type {MigrationBase[]} */
  #migrations;
  /**
   *
   * @param {MigrationBase[]} migrations
   */
  constructor(migrations) {
    this.#migrations = migrations.sort((a, b) => a.version - b.version);
  }

  needsMigration(currentVersion, latestVersion) {
    return currentVersion < latestVersion;
  }

  async runMigration() {
    // We might want to break the migration into phases.
    // For example, if a migration creates an item, we need to push it to the database in order to get its id.
    // This way if a later migration depends on the item actually being created, it will work.
    const migrationPhases = [];
    const migrationsInPhase = [];

    for (const migration of this.#migrations) {
      migrationsInPhase.push(migration);
      if (migration.requiresFlush) {
        migrationPhases.push([...migrationsInPhase]);
        migrationsInPhase.length = 0;
      }
    }

    for (const migrationPhase of migrationPhases) {
      await this.runMigrations(migrationPhase);
    }
  }

  async runMigrations(migrations) {
    if (migrations.length === 0) {
      return;
    }
  }
}

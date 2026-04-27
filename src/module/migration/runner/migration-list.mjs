import * as migrations from "../migrations/index.mjs";
export default class MigrationList {
  /** @type {typeof import("./migration-base.mjs").default[]} */
  static #migrations = Object.values(migrations).sort((a, b) => a.version - b.version);

  /** All migrations in ascending version order. */
  static get all() {
    return [...this.#migrations];
  }

  /**
   * All migrations with a version number greater than the given version.
   * @param {number} version - Last completed migration version (0 if never run).
   * @returns {import("./migration-base.mjs").default[]}
   */
  static afterVersion(version) {
    return this.#migrations.filter((M) => M.version > version).map((M) => new M());
  }
}

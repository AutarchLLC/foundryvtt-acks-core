import * as migrations from "../migrations/index.mjs";

export default class MigrationList {
  /** @type {MigrationBase[]} */
  static #migrations = Object.values(migrations).sort((a, b) => a.version - b.version);

  /** All migrations in ascending version order. */
  static get all() {
    return [...this.#migrations];
  }

  /**
   * All migrations with a version number greater than the given version.
   * @param {number} from - Last completed migration version (0 if never run).
   * @param {number} to - target migration version.
   * @returns {import("./migration-base.mjs").default[]}
   */
  static fromVersionTo(from, to) {
    return this.#migrations.filter((M) => M.version > from && M.version <= to).map((M) => new M());
  }
}

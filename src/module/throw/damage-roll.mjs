import ModifiedFormula from "./modified-formula.mjs";

/**
 * A damage roll: a weapon damage formula plus modifiers, with the damage types it deals.
 */
export default class AcksDamageRoll extends ModifiedFormula {
  /** @type {DAMAGE_TYPE[]} */
  types;

  /** @type {boolean} */
  extraordinary;

  /**
   * @param {string} base - damage formula, e.g. "1d8"
   * @param {object} [options]
   * @param {Iterable<DAMAGE_TYPE>} [options.types=[]] - damage types dealt
   * @param {boolean} [options.extraordinary=false] - whether the damage is extraordinary
   */
  constructor(base, { types = [], extraordinary = false } = {}) {
    super(base);
    this.types = Array.from(types);
    this.extraordinary = extraordinary;
  }

  /**
   * @inheritDoc
   * @return {TDamageRollSpec}
   */
  toRollSpec(data) {
    return { ...super.toRollSpec(data), types: [...this.types], extraordinary: this.extraordinary };
  }
}

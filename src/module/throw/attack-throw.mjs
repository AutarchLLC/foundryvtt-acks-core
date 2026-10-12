/* global game */
import ModifiedFormula from "./modified-formula.mjs";

/**
 * An attack throw: 1d20 plus modifiers, compared against a target value.
 * The target value is the attacker's attack throw plus the target's Armor Class.
 */
export default class AcksAttackThrow extends ModifiedFormula {
  /** @type {number} */
  targetValue;

  /**
   * @param {number} targetValue - value the roll must meet or beat to hit
   */
  constructor(targetValue) {
    super(game.settings.get("acks", "exploding20s") ? "1d20x" : "1d20");
    this.targetValue = targetValue;
  }

  /**
   * @inheritDoc
   * @return {TAttackThrowRollSpec}
   */
  toRollSpec(data) {
    return { ...super.toRollSpec(data), targetValue: this.targetValue };
  }
}

/* global game, Roll */

/**
 * Resolves an evaluated attack throw into hit, miss or critical hit, and rolls damage.
 *
 * Rules:
 * - The attack hits if the roll total meets or beats the target value.
 * - An unmodified 1 always misses.
 * - An unmodified 20 always hits, unless the "Exploding 20s" rule (JJ 392) is used.
 * - With the "Critical Hits" rule (JJ 391), a hit that beats the target value by 10 or more is a critical hit,
 *   which doubles the damage dice.
 * - Damage modifiers cannot reduce the damage of a hit below 1.
 */

/** Margin over the target value needed for a critical hit. */
const CRITICAL_HIT_MARGIN = 10;

/** Minimum damage dealt by a hit. */
const MINIMUM_DAMAGE = 1;

/**
 * @param {Roll} attackRoll - evaluated attack throw roll; its first die is the d20
 * @param {number} targetValue - value the roll must meet or beat to hit
 * @return {TAttackThrowResolution}
 */
export function resolveAttackThrow(attackRoll, targetValue) {
  const exploding20s = game.settings.get("acks", "exploding20s");
  const criticalHits = game.settings.get("acks", "criticalHits");

  // first result of the d20 is the unmodified roll, even if it exploded
  const naturalRoll = attackRoll.dice[0]?.results[0]?.result ?? null;
  const total = attackRoll.total;

  const isAutomaticMiss = naturalRoll === 1;
  const isAutomaticHit = naturalRoll === 20 && !exploding20s;
  const isHit = !isAutomaticMiss && (isAutomaticHit || total >= targetValue);
  const isCritical = criticalHits && isHit && total - targetValue >= CRITICAL_HIT_MARGIN;

  return { naturalRoll, total, targetValue, isHit, isCritical, isAutomaticHit, isAutomaticMiss };
}

/**
 * Roll damage. A critical hit doubles the number of damage dice; flat modifiers are not doubled.
 * @param {TDamageRollSpec} damage
 * @param {object} [options]
 * @param {boolean} [options.isCritical=false]
 * @return {Promise<Roll>} evaluated damage roll
 */
export async function rollDamage(damage, { isCritical = false } = {}) {
  const roll = new Roll(damage.formula, damage.data);
  if (isCritical) {
    roll.alter(2, 0);
  }
  return roll.evaluate();
}

/**
 * Damage dealt by an evaluated damage roll: its total, but never less than 1.
 * The roll itself is left untouched so it still shows what was rolled.
 * @param {Roll} damageRoll - evaluated damage roll
 * @return {number}
 */
export function getDamageTotal(damageRoll) {
  return Math.max(MINIMUM_DAMAGE, damageRoll.total);
}

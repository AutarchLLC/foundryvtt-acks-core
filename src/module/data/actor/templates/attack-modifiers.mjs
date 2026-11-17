/* global game */
import { ATTACK_TYPE } from "../../../constants.mjs";
import { getEffectModifierBreakdown } from "../../../effect/effect-modifiers.mjs";

/**
 * Labelled attack throw and damage modifiers from an actor's `attack.mod` and `damage.mod` fields: the bonus set in
 * Actor Tweaks, then what Active Effects such as Conditions add to it.
 * Missile and thrown attacks use the missile fields; melee attacks use the melee ones.
 */
export default class AttackModifiers {
  /**
   * @param {ATTACK_TYPE} attackType
   * @return {boolean}
   */
  static #isMissile(attackType) {
    return attackType === ATTACK_TYPE.MISSILE || attackType === ATTACK_TYPE.THROWN;
  }

  /**
   * The Actor Tweaks attack bonus, followed by what Active Effects add to it, each on its own line.
   * @param {CharacterData|MonsterData} system - actor system data
   * @param {ATTACK_TYPE} attackType
   * @return {TNumValueWithLabel[]}
   */
  static getAttackThrowModifiers(system, attackType) {
    return AttackModifiers.#isMissile(attackType)
      ? getEffectModifierBreakdown(system, "attack.mod.missile", game.i18n.localize("ACKS.MissileBonus"))
      : getEffectModifierBreakdown(system, "attack.mod.melee", game.i18n.localize("ACKS.MeleeBonus"));
  }

  /**
   * The Actor Tweaks damage bonus, followed by what Active Effects add to it, each on its own line.
   * @param {CharacterData|MonsterData} system - actor system data
   * @param {ATTACK_TYPE} attackType
   * @return {TNumValueWithLabel[]}
   */
  static getDamageModifiers(system, attackType) {
    return AttackModifiers.#isMissile(attackType)
      ? getEffectModifierBreakdown(system, "damage.mod.missile", game.i18n.localize("ACKS.MissileDamageBonus"))
      : getEffectModifierBreakdown(system, "damage.mod.melee", game.i18n.localize("ACKS.MeleeDamageBonus"));
  }
}

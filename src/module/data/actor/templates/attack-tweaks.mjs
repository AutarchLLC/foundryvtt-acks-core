/* global game */
import { ATTACK_TYPE } from "../../../constants.mjs";
import { getEffectModifierBreakdown } from "../../../effect/effect-modifiers.mjs";

/**
 * Attack throw and damage bonuses configured via Actor Tweaks (`attack.mod` and `damage.mod`),
 * plus what Active Effects such as Conditions add to them.
 * Missile and thrown attacks use the missile bonuses; melee attacks use the melee ones.
 */
export default class AttackTweaks {
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
    return AttackTweaks.#isMissile(attackType)
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
    return AttackTweaks.#isMissile(attackType)
      ? getEffectModifierBreakdown(system, "damage.mod.missile", game.i18n.localize("ACKS.MissileDamageBonus"))
      : getEffectModifierBreakdown(system, "damage.mod.melee", game.i18n.localize("ACKS.MeleeDamageBonus"));
  }
}

/* global game */
import { ATTACK_TYPE } from "../../../constants.mjs";

/**
 * Attack throw and damage bonuses configured via Actor Tweaks (`thac0.mod` and `damage.mod`).
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
   * @param {CharacterData|MonsterData} system - actor system data
   * @param {ATTACK_TYPE} attackType
   * @return {TNumValueWithLabel}
   */
  static getAttackThrowModifier(system, attackType) {
    return AttackTweaks.#isMissile(attackType)
      ? { label: game.i18n.localize("ACKS.MissileBonus"), value: system.thac0.mod.missile }
      : { label: game.i18n.localize("ACKS.MeleeBonus"), value: system.thac0.mod.melee };
  }

  /**
   * @param {CharacterData|MonsterData} system - actor system data
   * @param {ATTACK_TYPE} attackType
   * @return {TNumValueWithLabel}
   */
  static getDamageModifier(system, attackType) {
    return AttackTweaks.#isMissile(attackType)
      ? { label: game.i18n.localize("ACKS.MissileDamageBonus"), value: system.damage.mod.missile }
      : { label: game.i18n.localize("ACKS.MeleeDamageBonus"), value: system.damage.mod.melee };
  }
}

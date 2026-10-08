/* global game, CONFIG, Roll */
import { ATTACK_RANGE, ATTACK_RANGE_PENALTY, ATTACK_TYPE, ITEM_TYPE } from "../constants.mjs";
import AcksAttackThrow from "./attack-throw.mjs";
import AcksDamageRoll from "./damage-roll.mjs";
import ModifiedFormula from "./modified-formula.mjs";

/**
 * Builds attack throws and damage rolls from an attacker, an optional item and the player's choices.
 * Used by the Attack Throw dialog for its live preview, and directly when the dialog is skipped.
 */

/** @type {ATTACK_TYPE[]} */
const RANGED_ATTACK_TYPES = [ATTACK_TYPE.MISSILE, ATTACK_TYPE.THROWN];

/**
 * @param {?AcksItem} item
 * @return {?AcksItem} the item if it is a weapon, otherwise null
 */
function asWeapon(item) {
  return item?.type === ITEM_TYPE.WEAPON ? item : null;
}

/**
 * Choices available to the attacker for the given attack type.
 * @param {AcksActor} actor - attacker
 * @param {?AcksItem} item - item used to attack
 * @param {ATTACK_TYPE} attackType - selected attack type
 * @return {TAttackOptions}
 */
export function getAttackOptions(actor, item, attackType) {
  const weapon = asWeapon(item);
  return {
    attackTypes: actor.system.getAttackTypes(item),
    damageModes: weapon ? weapon.system.getDamageModes(attackType) : [],
    ranges: RANGED_ATTACK_TYPES.includes(attackType) ? Object.values(ATTACK_RANGE) : [],
  };
}

/**
 * Replace any choice that is not available for this attacker and item with its first valid option.
 * @param {AcksActor} actor - attacker
 * @param {?AcksItem} item - item used to attack
 * @param {Partial<TAttackThrowChoices>} choices
 * @return {TAttackThrowChoices}
 */
export function normalizeChoices(actor, item, choices) {
  const attackTypes = actor.system.getAttackTypes(item);
  const attackType = attackTypes.includes(choices.attackType) ? choices.attackType : attackTypes[0];
  const { damageModes, ranges } = getAttackOptions(actor, item, attackType);
  const messageMode =
    choices.messageMode in CONFIG.ChatMessage.modes ? choices.messageMode : game.settings.get("core", "messageMode");

  return {
    attackType,
    damageMode: damageModes.includes(choices.damageMode) ? choices.damageMode : (damageModes[0] ?? null),
    range: ranges.includes(choices.range) ? choices.range : (ranges[0] ?? null),
    situational: String(choices.situational ?? "").trim(),
    messageMode,
  };
}

/**
 * Default choices: first attack type, base damage, short range, no situational modifier.
 * @param {AcksActor} actor - attacker
 * @param {?AcksItem} item - item used to attack
 * @return {TAttackThrowChoices}
 */
export function getDefaultChoices(actor, item) {
  return normalizeChoices(actor, item, {});
}

/**
 * Whether a situational modifier can be added to a roll formula. An empty modifier is valid.
 * @param {string} value - e.g. "2", "-1", "+1d4", "@str"
 * @return {boolean}
 */
export function isValidSituationalModifier(value) {
  const signed = ModifiedFormula.toSignedValue(value);
  return !signed || Roll.validate(`0 ${signed}`);
}

/**
 * Build the attack throw and damage roll.
 * The attack throw target value is the attacker's attack throw plus the target's AC (0 without a target).
 * There is no damage roll without a weapon, or if the weapon has no damage formula.
 * An invalid situational modifier is left out.
 * @param {AcksActor} actor - attacker
 * @param {?AcksItem} item - item used to attack
 * @param {Partial<TAttackThrowChoices>} choices
 * @param {?TokenDocument} [target=null] - token being attacked
 * @return {TAttackThrowResult}
 */
export function buildAttackThrow(actor, item, choices, target = null) {
  const { attackType, damageMode, range, situational, messageMode } = normalizeChoices(actor, item, choices);
  const weapon = asWeapon(item);
  const rollData = actor.getRollData();

  const targetAC = target?.actor?.system?.aac?.value ?? 0;
  const attackThrow = new AcksAttackThrow(actor.system.thac0.throw + targetAC);
  attackThrow.addModifiers(actor.system.getAttackThrowModifiers(attackType));
  if (weapon) {
    attackThrow.addModifiers(weapon.system.getAttackThrowModifiers());
  }
  if (range) {
    const rangeLabel = game.i18n.localize(`ACKS.throw.range.${range}`);
    attackThrow.addModifier(
      game.i18n.format("ACKS.throw.modifier.range", { range: rangeLabel }),
      ATTACK_RANGE_PENALTY[range],
    );
  }
  if (isValidSituationalModifier(situational)) {
    attackThrow.addModifier(game.i18n.localize("ACKS.SitMod"), situational);
  }

  let damage = null;
  const damageFormula = weapon?.system.getDamageFormula(damageMode)?.trim();
  if (damageFormula) {
    damage = new AcksDamageRoll(damageFormula)
      .addModifiers(actor.system.getDamageModifiers(attackType))
      .toRollSpec(rollData);
  }

  return {
    attackType,
    damageMode,
    range,
    situational,
    messageMode,
    target,
    attack: attackThrow.toRollSpec(rollData),
    damage,
  };
}

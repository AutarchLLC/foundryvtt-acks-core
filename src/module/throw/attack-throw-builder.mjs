/* global game, CONFIG, Roll */
import {
  ATTACK_DIRECTION,
  ATTACK_DIRECTION_MODIFIER,
  ATTACK_RANGE,
  ATTACK_RANGE_PENALTY,
  ATTACK_TYPE,
  ITEM_TYPE,
  SUBJACENT_TARGET_MODIFIER,
} from "../constants.mjs";
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
 * Attack types available with the given item: the weapon's attack types, or every attack type without a weapon.
 * Characters and monsters follow the same rules.
 * @param {?AcksItem} item
 * @return {ATTACK_TYPE[]}
 */
function getAttackTypes(item) {
  const weaponAttackTypes = asWeapon(item)?.system.getAttackTypes() ?? [];
  return weaponAttackTypes.length > 0
    ? weaponAttackTypes
    : [ATTACK_TYPE.MELEE, ATTACK_TYPE.MISSILE, ATTACK_TYPE.THROWN];
}

/**
 * Attack directions available for the given attack type and range. A backstab or ambush is only possible in melee
 * or at short range.
 * @param {ATTACK_TYPE} attackType
 * @param {?ATTACK_RANGE} range
 * @return {ATTACK_DIRECTION[]}
 */
function getAttackDirections(attackType, range) {
  const canBackstab = attackType === ATTACK_TYPE.MELEE || range === ATTACK_RANGE.SHORT;
  return Object.values(ATTACK_DIRECTION).filter((direction) => canBackstab || direction !== ATTACK_DIRECTION.BACKSTAB);
}

/**
 * @param {ATTACK_DIRECTION|undefined} direction - chosen direction
 * @param {ATTACK_DIRECTION[]} directions - available directions
 * @return {ATTACK_DIRECTION} the chosen direction if available; a backstab that is no longer possible becomes an
 * attack from the rear (flank / rear); anything else becomes a frontal attack
 */
function normalizeDirection(direction, directions) {
  if (directions.includes(direction)) {
    return direction;
  }
  return direction === ATTACK_DIRECTION.BACKSTAB ? ATTACK_DIRECTION.FLANK : ATTACK_DIRECTION.FRONT;
}

/**
 * Choices available with the given item, attack type and range.
 * @param {?AcksItem} item - item used to attack
 * @param {ATTACK_TYPE} attackType - selected attack type
 * @param {?ATTACK_RANGE} [range=null] - selected range band
 * @return {TAttackOptions}
 */
export function getAttackOptions(item, attackType, range = null) {
  const weapon = asWeapon(item);
  return {
    attackTypes: getAttackTypes(item),
    damageModes: weapon ? weapon.system.getDamageModes(attackType) : [],
    ranges: RANGED_ATTACK_TYPES.includes(attackType) ? Object.values(ATTACK_RANGE) : [],
    directions: getAttackDirections(attackType, range),
  };
}

/**
 * Replace any choice that is not available with this item with its first valid option.
 * Called with no choices, this gives the defaults: first attack type, base damage, short range, frontal attack on a
 * target that is not subjacent, no situational modifier.
 * @param {?AcksItem} item - item used to attack
 * @param {Partial<TAttackThrowChoices>} choices
 * @return {TAttackThrowChoices}
 */
export function normalizeChoices(item, choices) {
  const attackTypes = getAttackTypes(item);
  const attackType = attackTypes.includes(choices.attackType) ? choices.attackType : attackTypes[0];
  const { damageModes, ranges } = getAttackOptions(item, attackType);
  const range = ranges.includes(choices.range) ? choices.range : (ranges[0] ?? null);
  const directions = getAttackDirections(attackType, range);
  const messageMode =
    choices.messageMode in CONFIG.ChatMessage.modes ? choices.messageMode : game.settings.get("core", "messageMode");

  return {
    attackType,
    damageMode: damageModes.includes(choices.damageMode) ? choices.damageMode : (damageModes[0] ?? null),
    range,
    direction: normalizeDirection(choices.direction, directions),
    subjacent: Boolean(choices.subjacent),
    situational: String(choices.situational ?? "").trim(),
    messageMode,
  };
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
  const normalized = normalizeChoices(item, choices);
  const { attackType, damageMode, range, direction, subjacent, situational } = normalized;
  const weapon = asWeapon(item);
  const rollData = actor.getRollData();

  const targetAC = target?.actor?.system?.ac?.value ?? 0;
  const attackThrow = new AcksAttackThrow(actor.system.attack.throw + targetAC);
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
  attackThrow.addModifier(
    game.i18n.localize(`ACKS.throw.direction.${direction}`),
    ATTACK_DIRECTION_MODIFIER[direction],
  );
  if (subjacent) {
    attackThrow.addModifier(game.i18n.localize("ACKS.throw.modifier.subjacent"), SUBJACENT_TARGET_MODIFIER);
  }
  if (isValidSituationalModifier(situational)) {
    attackThrow.addModifier(game.i18n.localize("ACKS.SitMod"), situational);
  }

  let damage = null;
  const damageFormula = weapon?.system.getDamageFormula(damageMode)?.trim();
  if (damageFormula) {
    // damage types are only defined on the base damage; they apply to the alternate formula too
    const { types, extraordinary } = weapon.system.damage.base;
    damage = new AcksDamageRoll(damageFormula, { types, extraordinary })
      .addModifiers(actor.system.getDamageModifiers(attackType))
      .addModifiers(weapon.system.getDamageModifiers())
      .toRollSpec(rollData);
  }

  return {
    ...normalized,
    target,
    attack: attackThrow.toRollSpec(rollData),
    damage,
  };
}

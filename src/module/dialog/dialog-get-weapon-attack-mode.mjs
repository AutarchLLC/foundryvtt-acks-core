/* global foundry */
import { ATTACK_TYPE } from "../constants.mjs";

/**
 *
 * @param {string} weaponName
 * @param {ATTACK_TYPE[]} attackTypes
 * @return {Promise<?ATTACK_TYPE>}
 */
export default async function getWeaponAttackMode(weaponName, attackTypes) {
  if (attackTypes.length === 0) {
    return null;
  }

  if (attackTypes.length === 1) {
    return attackTypes[0];
  }

  const buttons = attackTypes.map((attackType, index) => {
    const button = {
      action: attackType,
      default: index === 0,
      callback: () => attackType,
    };
    switch (attackType) {
      case ATTACK_TYPE.MELEE:
        button.icon = "fas fa-sword";
        button.label = "Melee"; // TODO: localize
        break;
      case ATTACK_TYPE.MISSILE:
        button.icon = "fas fa-bow-arrow";
        button.label = "Missile"; // TODO: localize
        break;
      case ATTACK_TYPE.THROWN:
        button.icon = "fas fa-dagger";
        button.label = "Thrown"; // TODO: localize
        break;
      default:
        button.icon = "fas fa-question";
        button.label = "Unknown"; // TODO: localize
    }
    return button;
  });

  return foundry.applications.api.DialogV2.wait({
    window: {
      title: `Attack Mode Selector`, // TODO: localize
    },
    content: `<p>Choose the attack mode for ${weaponName}.</p>`, // TODO: localize
    buttons,
  });
}

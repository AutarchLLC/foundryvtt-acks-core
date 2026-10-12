import AttackThrowDialog from "../apps/attack-throw-dialog.mjs";

/**
 * Show the Attack Throw dialog, where the player picks the attack type, damage mode, range and a situational
 * modifier.
 * @param {AcksActor} actor - attacker
 * @param {?AcksItem} [item=null] - item used to attack, usually a weapon
 * @param {?TokenDocument} [target=null] - token being attacked
 * @param {Partial<TAttackThrowChoices>} [choices={}] - initially selected choices, e.g. the attack type
 * @return {Promise<?TAttackThrowResult>} the attack throw and damage roll, or null if the dialog was dismissed
 */
export default async function getAttackThrowDetails(actor, item = null, target = null, choices = {}) {
  return AttackThrowDialog.wait({ actor, item, target, choices });
}

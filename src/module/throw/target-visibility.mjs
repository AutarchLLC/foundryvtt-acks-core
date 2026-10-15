/* global game */

/**
 * Whether the target's Armor Class (and the target value derived from it) is shown to the current user.
 * The Judge always sees it; players only if the "Show Target's AC to Players" setting allows it.
 */

/**
 * Value of the `data-acks-visibility` attribute for elements that reveal the target's AC.
 * {@link ACKSChatMessage} removes them for users who may not see it.
 */
export const TARGET_AC_SHOWN = "target-ac-shown";

/**
 * Value of the `data-acks-visibility` attribute for elements that replace the target's AC when it is hidden.
 * {@link ACKSChatMessage} removes them for users who may see it.
 */
export const TARGET_AC_HIDDEN = "target-ac-hidden";

/**
 * @return {boolean} whether the current user may see a target's Armor Class
 */
export function canSeeTargetAC() {
  return game.user.isGM || game.settings.get("acks", "showTargetACToPlayers");
}

/**
 * Target and target value labels, both revealing the target's AC and hiding it.
 * Without a target there is no AC to hide, so both versions are the same.
 * @param {AcksActor} attacker
 * @param {?TokenDocument} target
 * @param {number} targetValue - attacker's attack throw plus the target's AC
 * @return {{shown: TTargetLabels, hidden: TTargetLabels}}
 */
export function getTargetLabels(attacker, target, targetValue) {
  if (!target) {
    const labels = {
      target: game.i18n.localize("ACKS.throw.attack.noTarget"),
      targetValue: game.i18n.format("ACKS.throw.attack.targetValue", { value: targetValue }),
    };
    return { shown: labels, hidden: labels };
  }

  return {
    shown: {
      target: game.i18n.format("ACKS.throw.attack.target", {
        name: target.name,
        ac: target.actor?.system?.aac?.value ?? 0,
      }),
      targetValue: game.i18n.format("ACKS.throw.attack.targetValue", { value: targetValue }),
    },
    hidden: {
      target: game.i18n.format("ACKS.throw.attack.target", {
        name: target.name,
        ac: game.i18n.localize("ACKS.throw.attack.hiddenAC"),
      }),
      targetValue: game.i18n.format("ACKS.throw.attack.targetValueHiddenAC", { value: attacker.system.attack.throw }),
    },
  };
}

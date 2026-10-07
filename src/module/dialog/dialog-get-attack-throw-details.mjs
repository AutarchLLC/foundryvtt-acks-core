/* global CONFIG, foundry, game */

import { ATTACK_RANGE, ATTACK_TYPE, MELEE_ATTACK_MODE } from "../constants.mjs";

/**
 * @typedef {Object} TAttackThrowDialogResult
 * @property {ATTACK_RANGE|MELEE_ATTACK_MODE} act - The action taken (e.g., "melee", "range_short", etc.)
 * @property {string} bonus - The situational modifier input by the user
 * @property {string} messageMode - The selected message mode for the chat message
 */

/**
 *
 * @param {AcksAttackThrow} attackThrow
 * @param {string} actorName
 * @param {?AcksItem} [item=null]
 * @return {Promise<?TAttackThrowDialogResult>} - Returns the dialog result or null if canceled
 */
export default async function getAttackThrowDetails(attackThrow, actorName, item = null) {
  const content = document.createElement("div");

  const details = item
    ? game.i18n.format("ACKS.throw.attack.attacksWith", { actorName, itemName: item.name })
    : game.i18n.format("ACKS.throw.attack.attacks", { actorName });
  const detailsDiv = document.createElement("div");
  detailsDiv.textContent = details;
  content.appendChild(detailsDiv);

  // formula
  content.appendChild(attackThrow.getFullFormulaToHTML());

  // situational modifier input
  const bonusFormGroup = foundry.applications.fields.createFormGroup({
    input: foundry.applications.fields.createTextInput({
      name: "bonus",
      placeholder: game.i18n.localize("ACKS.RollExample"),
    }),
    label: "ACKS.SitMod",
    localize: true,
  });
  content.appendChild(bonusFormGroup);

  content.appendChild(buildMessageModeSelectGroup());

  const buttons = buildAttackThrowButtons(attackThrow, item);
  const title = `${game.i18n.format(`ACKS.throw.attack.${attackThrow.attackType}`)}: ${actorName}`;

  return foundry.applications.api.DialogV2.wait({
    window: { title },
    position: { width: 446 },
    classes: ["acksii", "attack-throw-dialog"],
    content,
    buttons,
  });
}

/**
 *
 * @param {boolean} hasTwoHandedDamage
 * @return {TDialogV2Button[]}
 */
function buildMeleeAttackThrowButtons(hasTwoHandedDamage = false) {
  /** @type {TDialogV2Button[]} */
  const buttons = [];
  if (hasTwoHandedDamage) {
    // show two buttons for melee attacks with two-handed damage: one for one-handed, one for two-handed
    buttons.push(
      {
        action: MELEE_ATTACK_MODE.BASE,
        default: true,
        label: "One-Handed",
        callback: (_event, button) => ({
          ...new foundry.applications.ux.FormDataExtended(button.form).object,
          act: MELEE_ATTACK_MODE.BASE,
        }),
      },
      {
        action: MELEE_ATTACK_MODE.ALTERNATE,
        label: "Two-Handed",
        callback: (_event, button) => ({
          ...new foundry.applications.ux.FormDataExtended(button.form).object,
          act: MELEE_ATTACK_MODE.ALTERNATE,
        }),
      },
    );
  } else {
    // show one button
    buttons.push({
      action: MELEE_ATTACK_MODE.BASE,
      default: true,
      label: "ACKS.Attack",
      callback: (_event, button) => ({
        ...new foundry.applications.ux.FormDataExtended(button.form).object,
        act: MELEE_ATTACK_MODE.BASE,
      }),
    });
  }

  return buttons;
}

/**
 *
 * @return {TDialogV2Button[]}
 */
function buildMissileAttackThrowButtons() {
  /** @type {TDialogV2Button[]} */
  const buttons = [];
  buttons.push(
    {
      action: ATTACK_RANGE.SHORT,
      default: true,
      label: "Short Range",
      callback: (_event, button) => ({
        ...new foundry.applications.ux.FormDataExtended(button.form).object,
        act: ATTACK_RANGE.SHORT,
      }),
    },
    {
      action: ATTACK_RANGE.MEDIUM,
      label: "Medium Range (-2)",
      callback: (_event, button) => ({
        ...new foundry.applications.ux.FormDataExtended(button.form).object,
        act: ATTACK_RANGE.MEDIUM,
      }),
    },
    {
      action: ATTACK_RANGE.LONG,
      label: "Long Range (-5)",
      callback: (_event, button) => ({
        ...new foundry.applications.ux.FormDataExtended(button.form).object,
        act: ATTACK_RANGE.LONG,
      }),
    },
  );
  return buttons;
}

/**
 * @param {AcksAttackThrow} attackThrow
 * @param {AcksItem|null} item
 * @return {TDialogV2Button[]}
 */
function buildAttackThrowButtons(attackThrow, item) {
  if (attackThrow.attackType === ATTACK_TYPE.MELEE) {
    return buildMeleeAttackThrowButtons(item?.system?.hasTwoHandedDamage ?? false);
  } else if (attackThrow.attackType === ATTACK_TYPE.MISSILE || attackThrow.attackType === ATTACK_TYPE.THROWN) {
    return buildMissileAttackThrowButtons();
  } else {
    throw new Error(`Unsupported attack type: ${attackThrow.attackType}`);
  }
}

/**
 *
 * @return {HTMLDivElement}
 */
function buildMessageModeSelectGroup() {
  const messageModes = Object.entries(CONFIG.ChatMessage.modes).map(([action, { label, icon }]) => {
    return { value: action, label, icon };
  });
  const messageModeSelect = foundry.applications.fields.createSelectInput({
    name: "messageMode",
    options: messageModes,
    value: game.settings.get("core", "messageMode"),
    localize: true,
  });
  return foundry.applications.fields.createFormGroup({
    input: messageModeSelect,
    label: "ACKS.MessageMode",
    localize: true,
  });
}

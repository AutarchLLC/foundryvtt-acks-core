/* global foundry, game, ChatMessage */
import { ATTACK_RANGE_PENALTY, DAMAGE_MODE } from "../constants.mjs";

const TEMPLATE = "systems/acks/templates/chat/attack-throw-card.hbs";

/**
 * Dice So Nice animation order: rolls with a lower `rollOrder` animate first.
 * @see https://riccisi.gitlab.io/foundryvtt-dice-so-nice/api/integration/#step-4-select-roll-order-for-multiple-rolls
 */
const ROLL_ORDER = Object.freeze({
  ATTACK: 1,
  DAMAGE: 2,
});

/**
 * Post an attack throw to chat. The message carries the attack and damage rolls, so message modes, blind rolls and
 * Dice So Nice are handled by Foundry. The target's AC is included both revealed and hidden; {@link ACKSChatMessage}
 * removes the version the viewing user may not see.
 * @param {AcksActor} actor - attacker
 * @param {?AcksItem} item - item used to attack
 * @param {TAttackThrowOutcome} outcome
 * @return {Promise<ChatMessage>}
 */
export async function createAttackThrowMessage(actor, item, outcome) {
  const content = await foundry.applications.handlebars.renderTemplate(
    TEMPLATE,
    await prepareCardContext(actor, item, outcome),
  );
  // Dice So Nice animates the attack throw first and the damage after it, so a hit isn't given away early
  outcome.attackRoll.options.rollOrder = ROLL_ORDER.ATTACK;
  if (outcome.damageRoll) {
    outcome.damageRoll.options.rollOrder = ROLL_ORDER.DAMAGE;
  }
  const rolls = [outcome.attackRoll, outcome.damageRoll].filter(Boolean);

  return ChatMessage.create(
    {
      content,
      rolls,
      speaker: ChatMessage.getSpeaker({ actor, token: actor.token }),
    },
    { messageMode: outcome.result.messageMode },
  );
}

/**
 * @param {AcksActor} actor
 * @param {?AcksItem} item
 * @param {TAttackThrowOutcome} outcome
 * @return {Promise<object>} template context
 */
async function prepareCardContext(actor, item, outcome) {
  const { result, attackRoll, resolution, damageRoll, damageTotal, targetLabels } = outcome;

  return {
    actor,
    item,
    img: actor.img,
    imgAlt: actor.name,
    title: item
      ? game.i18n.format("ACKS.throw.attack.attacksWith", { actorName: actor.name, itemName: item.name })
      : game.i18n.format("ACKS.throw.attack.attacks", { actorName: actor.name }),
    targetLabels,
    choiceLabels: getChoiceLabels(result),
    outcome: getOutcomeLabels(resolution),
    result,
    attackRollHTML: await renderRollWithModifiers(attackRoll, result.attack.modifiers),
    damageRollHTML: damageRoll ? await renderRollWithModifiers(damageRoll, result.damage.modifiers) : null,
    damageIcons: damageRoll && item ? Array.from(item.system.damage.base.icons ?? []) : [],
    damageNotes: damageRoll ? getDamageNotes(resolution, damageRoll, damageTotal) : [],
  };
}

/**
 * Render a roll with its modifier breakdown inside the roll's expandable dice tooltip, so the breakdown is shown
 * when the roll is clicked rather than cluttering the card.
 * @param {Roll} roll - evaluated roll
 * @param {TStringValueWithLabel[]} modifiers
 * @return {Promise<string>} roll HTML
 */
async function renderRollWithModifiers(roll, modifiers) {
  const container = document.createElement("div");
  container.innerHTML = await roll.render();
  if (!modifiers.length) {
    return container.innerHTML;
  }

  // Foundry only renders the tooltip for rolls with dice; add an empty one for flat formulas
  let wrapper = container.querySelector(".dice-tooltip .wrapper");
  if (!wrapper) {
    const tooltip = document.createElement("div");
    tooltip.classList.add("dice-tooltip");
    wrapper = document.createElement("div");
    wrapper.classList.add("wrapper");
    tooltip.append(wrapper);
    container.querySelector(".dice-total")?.before(tooltip);
  }
  wrapper.append(createModifierList(modifiers));
  return container.innerHTML;
}

/**
 * @param {TStringValueWithLabel[]} modifiers
 * @return {HTMLUListElement}
 */
function createModifierList(modifiers) {
  const list = document.createElement("ul");
  list.classList.add("attack-throw-card__modifiers");
  for (const { label, value } of modifiers) {
    const labelSpan = document.createElement("span");
    labelSpan.textContent = label;
    const valueSpan = document.createElement("span");
    valueSpan.classList.add("attack-throw-card__value");
    valueSpan.textContent = value;
    const item = document.createElement("li");
    item.append(labelSpan, valueSpan);
    list.append(item);
  }
  return list;
}

/**
 * Short labels for the choices made in the Attack Throw dialog, e.g. ["Missile", "Medium Range (-2)"].
 * @param {TAttackThrowResult} result
 * @return {string[]}
 */
function getChoiceLabels(result) {
  const labels = [game.i18n.localize(`ACKS.throw.attackType.${result.attackType}`)];
  if (result.damageMode === DAMAGE_MODE.ALTERNATE) {
    labels.push(game.i18n.localize(`ACKS.throw.damageMode.${result.damageMode}`));
  }
  if (result.range) {
    const penalty = ATTACK_RANGE_PENALTY[result.range];
    const range = game.i18n.format("ACKS.throw.modifier.range", {
      range: game.i18n.localize(`ACKS.throw.range.${result.range}`),
    });
    labels.push(penalty ? `${range} (${penalty})` : range);
  }
  return labels;
}

/**
 * @param {TAttackThrowResolution} resolution
 * @return {{status: "critical"|"auto-hit"|"hit"|"auto-miss"|"miss", label: string, reason: ?string}}
 */
function getOutcomeLabels(resolution) {
  let reason = null;
  if (resolution.isAutomaticHit) {
    reason = game.i18n.localize("ACKS.throw.outcome.natural20");
  } else if (resolution.isAutomaticMiss) {
    reason = game.i18n.localize("ACKS.throw.outcome.natural1");
  }

  if (resolution.isCritical) {
    return { status: "critical", label: game.i18n.localize("ACKS.throw.outcome.critical"), reason };
  }
  if (resolution.isHit) {
    const status = resolution.isAutomaticHit ? "auto-hit" : "hit";
    return { status, label: game.i18n.localize("ACKS.throw.outcome.hit"), reason };
  }
  const status = resolution.isAutomaticMiss ? "auto-miss" : "miss";
  return { status, label: game.i18n.localize("ACKS.throw.outcome.miss"), reason };
}

/**
 * Notes explaining how damage differs from the plain damage formula.
 * @param {TAttackThrowResolution} resolution
 * @param {Roll} damageRoll
 * @param {number} damageTotal
 * @return {string[]}
 */
function getDamageNotes(resolution, damageRoll, damageTotal) {
  const notes = [];
  if (resolution.isCritical) {
    notes.push(game.i18n.localize("ACKS.throw.damage.criticalDice"));
  }
  if (damageTotal !== damageRoll.total) {
    notes.push(game.i18n.format("ACKS.throw.damage.minimum", { value: damageTotal }));
  }
  return notes;
}

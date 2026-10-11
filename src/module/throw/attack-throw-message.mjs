/* global foundry, game, ChatMessage */
import { ATTACK_RANGE_PENALTY, DAMAGE_MODE } from "../constants.mjs";

const TEMPLATE = "systems/acks/templates/chat/attack-throw-card.hbs";

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
    img: item?.img ?? actor.img,
    imgAlt: item?.name ?? actor.name,
    title: item
      ? game.i18n.format("ACKS.throw.attack.attacksWith", { actorName: actor.name, itemName: item.name })
      : game.i18n.format("ACKS.throw.attack.attacks", { actorName: actor.name }),
    targetLabels,
    choiceLabels: getChoiceLabels(result),
    outcome: getOutcomeLabels(resolution),
    result,
    attackRollHTML: await attackRoll.render(),
    damageRollHTML: damageRoll ? await damageRoll.render() : null,
    damageIcons: damageRoll && item ? Array.from(item.system.damage.base.icons ?? []) : [],
    damageNotes: damageRoll ? getDamageNotes(resolution, damageRoll, damageTotal) : [],
  };
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
 * @return {{status: "hit"|"critical"|"miss", label: string, reason: ?string}}
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
    return { status: "hit", label: game.i18n.localize("ACKS.throw.outcome.hit"), reason };
  }
  return { status: "miss", label: game.i18n.localize("ACKS.throw.outcome.miss"), reason };
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

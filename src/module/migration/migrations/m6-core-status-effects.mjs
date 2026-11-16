/* global game */
import MigrationBase from "../runner/migration-base.mjs";
import { ACKS } from "../../config.mjs";

/**
 * Foundry core status ids replaced by the ACKS Condition with the same meaning.
 * See docs/adr/0001-acks-conditions-replace-core-status-effects.md.
 */
const CORE_TO_ACKS_STATUS = Object.freeze({
  blind: "blinded",
  deaf: "deafened",
  sleep: "slumbering",
  restrain: "restrained",
  paralysis: "paralyzed",
  silence: "mute",
  fear: "frightened",
  bless: "blessed",
});

/**
 * Images a status effect could carry before the ACKS Conditions, by the status id it carried:
 * Foundry core's images, and the ones ACKS used for its own few status effects.
 * An effect with one of these images was placed as a status, not made by hand.
 */
const LEGACY_STATUS_IMAGES = Object.freeze({
  blind: ["icons/svg/blind.svg"],
  deaf: ["icons/svg/deaf.svg"],
  sleep: ["icons/svg/sleep.svg"],
  restrain: ["icons/svg/net.svg"],
  paralysis: ["icons/svg/paralysis.svg"],
  silence: ["icons/svg/silenced.svg"],
  fear: ["icons/svg/terror.svg"],
  bless: ["icons/svg/angel.svg"],
  unconscious: ["icons/svg/unconscious.svg"],
  prone: ["icons/svg/falling.svg"],
  burning: ["icons/svg/fire.svg"],
  slumbering: ["icons/svg/stoned.svg"],
  surprised: ["systems/acks/assets/icons/surprised.svg"],
  overnumbering: ["icons/svg/regen.svg"],
  done: ["icons/svg/cancel.svg"],
  readied: ["icons/svg/ice-aura.svg"],
  delayed: ["icons/svg/clockwork.svg"],
});

/**
 * Convert Foundry core status effects already on actors into the matching ACKS Conditions,
 * and bring plain status effects up to the name and image the token HUD now uses.
 */
export class Migration6CoreStatusEffects extends MigrationBase {
  static version = 6;

  /**
   * @override
   * @inheritDoc
   */
  async updateActor(source) {
    if (!source.effects?.length) {
      return;
    }
    const statusEntries = new Map([...ACKS.conditions, ...ACKS.combatStates].map((entry) => [entry.id, entry]));
    const isPlainCoreStatus = (effect) => isPlainStatus(effect) && effect.statuses[0] in CORE_TO_ACKS_STATUS;

    // Statuses the actor keeps no matter what, so a converted core status would duplicate them.
    const heldStatuses = new Set(
      source.effects.filter((effect) => !isPlainCoreStatus(effect)).flatMap((effect) => remapStatuses(effect)),
    );

    const migratedEffects = [];
    for (const effect of source.effects) {
      const plain = isPlainStatus(effect);
      if (isPlainCoreStatus(effect)) {
        const target = CORE_TO_ACKS_STATUS[effect.statuses[0]];
        if (heldStatuses.has(target)) {
          continue;
        }
        heldStatuses.add(target);
      }
      effect.statuses = remapStatuses(effect);

      const statusEntry = plain ? statusEntries.get(effect.statuses[0]) : undefined;
      if (statusEntry) {
        effect.name = game.i18n.localize(statusEntry.name);
        effect.img = statusEntry.img;
      }
      migratedEffects.push(effect);
    }
    source.effects = migratedEffects;
  }
}

/**
 * An effect's status ids, with each replaced core id swapped for its ACKS Condition.
 * @param {object} effect  ActiveEffect source data
 * @returns {string[]}
 */
function remapStatuses(effect) {
  return (effect.statuses ?? []).map((id) => CORE_TO_ACKS_STATUS[id] ?? id);
}

/**
 * Whether an effect is a status placed from the token HUD (or by the system) and left as it was:
 * a single status, with the image that status had before the ACKS Conditions.
 * Names are not compared, because Foundry stores them localised into the GM's language.
 * @param {object} effect  ActiveEffect source data
 * @returns {boolean}
 */
function isPlainStatus(effect) {
  const statuses = effect.statuses ?? [];
  return statuses.length === 1 && (LEGACY_STATUS_IMAGES[statuses[0]] ?? []).includes(effect.img);
}

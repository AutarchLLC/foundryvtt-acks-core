/* global CONFIG, game */
import { ACKS } from "./config.mjs";

/**
 * Foundry core status effects kept alongside the ACKS Conditions, because Foundry core gives them
 * special treatment through CONFIG.specialStatusEffects (defeated, vision, detection, light).
 * See docs/adr/0001-acks-conditions-replace-core-status-effects.md.
 */
const KEPT_CORE_STATUS_IDS = Object.freeze(["dead", "invisible", "fly", "burrow", "hover"]);

/**
 * Replace Foundry's core status effects with the ACKS Conditions and Combat States.
 * Must run in the `init` hook, after the system settings are registered.
 * The token HUD sorts entries by their localised name.
 */
export default function configureStatusEffects() {
  const coreStatusEffects = [...CONFIG.statusEffects];
  const keptCore = coreStatusEffects.filter((status) => KEPT_CORE_STATUS_IDS.includes(status.id));
  const statusEffects = [...ACKS.conditions, ...ACKS.combatStates, ...keptCore];

  if (game.settings.get("acks", "core-status-effects")) {
    const usedIds = new Set(statusEffects.map((status) => status.id));
    statusEffects.push(...coreStatusEffects.filter((status) => !usedIds.has(status.id)));
  }

  CONFIG.statusEffects = statusEffects;
  CONFIG.specialStatusEffects.BLIND = "blinded";
}

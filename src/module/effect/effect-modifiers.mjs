/* global foundry, game */

/** Change types whose numeric value can be listed as a signed modifier. */
const SIGN_BY_CHANGE_TYPE = Object.freeze({ add: 1, subtract: -1 });

/**
 * Break an actor modifier field into labelled roll modifiers: the stored value (set in Actor Tweaks), one line for
 * each active Active Effect that adds to the field (a Condition, for example), and an "Other Effects" line for
 * whatever effects changed that cannot be listed, such as multiplied or overridden values (ADR 0003).
 * Together the lines always add up to the field's prepared value.
 * @param {CharacterData|MonsterData} system - actor system data
 * @param {string} path - path of the modifier field under `system`, e.g. `"attack.mod.melee"`
 * @param {string} label - label of the stored value
 * @return {TNumValueWithLabel[]}
 */
export function getEffectModifierBreakdown(system, path, label) {
  const stored = Number(foundry.utils.getProperty(system._source, path)) || 0;
  const prepared = Number(foundry.utils.getProperty(system, path)) || 0;
  const modifiers = [{ label, value: stored }];

  let listed = stored;
  const key = `system.${path}`;
  for (const effect of system.parent?.allApplicableEffects() ?? []) {
    if (!effect.active) continue;
    const value = effect.system.changes.reduce((sum, change) => sum + getListedValue(change, key), 0);
    if (!value) continue;
    modifiers.push({ label: effect.name, value });
    listed += value;
  }

  const other = prepared - listed;
  if (other) {
    modifiers.push({ label: game.i18n.localize("ACKS.throw.modifier.otherEffects"), value: other });
  }
  return modifiers;
}

/**
 * @param {{key: string, type: string, value: unknown}} change - Active Effect change
 * @param {string} key - the change key being listed
 * @return {number} the signed amount the change adds to `key`, or 0 if it cannot be listed
 */
function getListedValue(change, key) {
  const sign = SIGN_BY_CHANGE_TYPE[change.type];
  const value = Number(change.value);
  return change.key === key && sign && Number.isFinite(value) ? sign * value : 0;
}

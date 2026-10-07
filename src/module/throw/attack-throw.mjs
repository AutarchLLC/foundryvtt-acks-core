/* global game */
import { ATTACK_TYPE } from "../constants.mjs";

export default class AcksAttackThrow {
  /** @type {string} */
  formula;

  /** @type {TStringValueWithLabel[]} */
  modifiers;

  /** @type {number} */
  targetValue;

  /** @type {ATTACK_TYPE} */
  attackType;

  /**
   *
   * @param {ATTACK_TYPE} attackType
   * @param {number} targetValue
   */
  constructor(attackType = ATTACK_TYPE.MELEE, targetValue = 12) {
    this.attackType = attackType;
    this.formula = game.settings.get("acks", "exploding20s") ? "1d20x" : "1d20";
    this.modifiers = [];
    this.targetValue = targetValue;
  }

  /**
   * @param {TStringValueWithLabel[]} modifiers
   */
  addModifiers(modifiers) {
    for (const modifier of modifiers) {
      this.addModifier(modifier);
    }
  }

  /**
   * @param {TStringValueWithLabel} modifier
   */
  addModifier(modifier) {
    if (modifier.value === "" || modifier.value === null || modifier.value === undefined) {
      modifier.value = "0";
    }
    this.modifiers.push(modifier);
  }

  /**
   * Returns the full formula as a string, including the base formula and all modifiers.
   * @param {Object} [options]
   * @param {boolean} [options.includeZero=false] - Whether to include modifiers with a value of 0 in the output.
   * @return {string}
   */
  getFullFormula(options = { includeZero: false }) {
    const mods = [];
    for (const modifier of this.modifiers) {
      if (modifier.value === "0" || modifier.value === "-0" || modifier.value === "+0") {
        if (options.includeZero) {
          mods.push(modifier.value);
        }
      } else {
        mods.push(modifier.value);
      }
    }
    return [this.formula, ...mods].join("+");
  }

  /**
   * Converts formula and situational modifiers into an HTML element.
   * @return {HTMLDivElement}
   */
  getFullFormulaToHTML() {
    const container = document.createElement("div");
    container.classList.add("acksii", "attack-throw-formula");

    const formulaDiv = document.createElement("div");
    formulaDiv.textContent = this.formula;
    container.appendChild(formulaDiv);

    for (const modifier of this.modifiers) {
      const modifierDiv = document.createElement("div");

      const sign = modifier.value.charAt(0);
      modifierDiv.textContent = sign === "+" || sign === "-" ? modifier.value : `+${modifier.value}`;
      modifierDiv.dataset.tooltip = modifier.label;
      modifierDiv.classList.add("attack-throw-formula__modifier");
      container.appendChild(modifierDiv);
    }

    return container;
  }
}

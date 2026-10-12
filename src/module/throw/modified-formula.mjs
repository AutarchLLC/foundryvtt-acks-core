/**
 * A base dice formula plus a list of labelled modifiers, e.g. `1d20` with `STR +1` and `Medium Range -2`.
 * Every modifier value is stored with an explicit sign (`"+1"`, `"-2"`, `"+1d4"`), so it can be appended to
 * the formula as-is and shown in a breakdown.
 */
export default class ModifiedFormula {
  /** @type {string} */
  base;

  /** @type {TStringValueWithLabel[]} */
  modifiers = [];

  /**
   * @param {string} base - base dice formula, e.g. "1d20" or a weapon damage formula
   */
  constructor(base) {
    this.base = base;
  }

  /**
   * Add a modifier. Empty values are ignored.
   * @param {string} label - localized label of the modifier
   * @param {number|string} value - numeric value or formula fragment, e.g. 2, -1, "1d4", "-@str"
   * @return {this}
   */
  addModifier(label, value) {
    const signed = ModifiedFormula.toSignedValue(value);
    if (signed) {
      this.modifiers.push({ label, value: signed });
    }
    return this;
  }

  /**
   * @param {TStringValueWithLabel[]} modifiers
   * @return {this}
   */
  addModifiers(modifiers) {
    for (const { label, value } of modifiers) {
      this.addModifier(label, value);
    }
    return this;
  }

  /**
   * Modifiers that change the result, i.e. everything except `+0` / `-0`.
   * @return {TStringValueWithLabel[]}
   */
  get effectiveModifiers() {
    return this.modifiers.filter(({ value }) => Number(value) !== 0);
  }

  /**
   * The full formula, e.g. "1d20 + 1 - 2". Zero-valued modifiers are left out.
   * @return {string}
   */
  get formula() {
    const parts = [this.base];
    for (const { value } of this.effectiveModifiers) {
      parts.push(value.charAt(0), value.slice(1).trim());
    }
    return parts.join(" ");
  }

  /**
   * A plain object ready for `new Roll(spec.formula, spec.data)`.
   * @param {object} data - roll data used to resolve `@` references in the formula
   * @return {TRollSpec}
   */
  toRollSpec(data) {
    return {
      formula: this.formula,
      data,
      modifiers: this.effectiveModifiers.map((modifier) => ({ ...modifier })),
    };
  }

  /**
   * Convert a modifier value into a string with an explicit leading sign.
   * @param {number|string|null|undefined} value
   * @return {string} signed value, or an empty string if the value is empty
   */
  static toSignedValue(value) {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "number") {
      return value < 0 ? `${value}` : `+${value}`;
    }
    const trimmed = `${value}`.trim();
    if (!trimmed) {
      return "";
    }
    return trimmed.startsWith("+") || trimmed.startsWith("-") ? trimmed : `+${trimmed}`;
  }
}

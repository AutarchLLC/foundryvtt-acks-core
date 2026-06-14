import AcksItemSheetV2 from "./item-sheet-v2.mjs";

export default class WeaponSheetV2 extends AcksItemSheetV2 {
  constructor(...args) {
    super(...args);
  }

  static DEFAULT_OPTIONS = {
    classes: ["acksii", "standard-form"],
  };
}

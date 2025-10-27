import ACKSActorSheetV2 from "./actor-sheet-v2.mjs";

export default class ACKSCharacterSheetV2 extends ACKSActorSheetV2 {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["character-v2"],
  };

  /** @override */
  static PARTS = {
    header: {
      template: "systems/acks/templates/actors/v2/header.hbs",
    },
  };
}

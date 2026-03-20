/* global foundry, game */
import { SURPRISE_MATRIX } from "../../constants.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class SurpriseMatrix extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options) {
    super(options);
  }

  static DEFAULT_OPTIONS = {
    classes: ["acks2", "surprise-matrix-app"],
    sheetConfig: false,
    window: {
      resizable: false,
      title: "Surprise Matrix", //TODO: localization
    },
    position: {
      width: 940,
      height: "auto",
    },
    actions: {
      rollSurprise: SurpriseMatrix.#rollSurprise,
    },
  };

  static PARTS = {
    app: {
      template: "systems/acks/templates/apps/surprise/surprise-matrix-app.hbs",
    },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.headerKeys = Object.keys(SURPRISE_MATRIX).map((key) => game.i18n.localize(`ACKS.surprise.title.${key}`));
    context.gridCells = this.#prepareGridCells(SURPRISE_MATRIX);

    return context;
  }

  #prepareGridCells(surpriseMatrix) {
    const gridCells = [];

    for (const [adventurerStatusKey, statusRecord] of Object.entries(surpriseMatrix)) {
      gridCells.push({
        isHeader: true,
        desc: game.i18n.localize(`ACKS.surprise.title.${adventurerStatusKey}`),
      });
      for (const [monsterStatusKey, status] of Object.entries(statusRecord)) {
        gridCells.push({
          isHeader: false,
          adventurerStatusKey,
          monsterStatusKey,
          desc: game.i18n.localize(status.description),
        });
      }
    }

    return gridCells;
  }

  /**
   * @this {SurpriseMatrix}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #rollSurprise(event, target) {}
}

/* global foundry, game, ui */
import { ACKS } from "../config.js";
import { AcksHtmlUtil } from "../util/html-util.mjs";
import ACKSDialog from "../dialog/dialog.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const TextEditorRef = foundry.applications.ux.TextEditor.implementation;

export default class AcksPartyOverviewApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options) {
    super(options);
  }

  static DEFAULT_OPTIONS = {
    classes: ["acks2", "party-overview-app"],
    sheetConfig: false,
    window: {
      resizable: true,
      title: "ACKS.dialog.partysheet",
    },
    position: {
      width: 640,
      height: "auto",
    },
    actions: {
      openSheet: AcksPartyOverviewApp.#openSheet,
      deleteFromParty: AcksPartyOverviewApp.#deleteFromParty,
      dealXP: AcksPartyOverviewApp.#dealXP,
      resync: AcksPartyOverviewApp.#resync,
    },
  };

  static PARTS = {
    app: {
      template: "systems/acks/templates/apps/party/party-overview-app.hbs",
    },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.config = ACKS;
    context.isGM = game.user.isGM;
    context.party = game.actors.contents.filter((actor) => actor.getFlag("acks", "party"));
    context.saves_long = ACKS.saves_long;
    context.saves_short = ACKS.saves_short;

    return context;
  }

  /**
   * @this {AcksPartyOverviewApp}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #openSheet(event, target) {
    const actorId = AcksHtmlUtil.getActorIdFromDOM(target);
    const actor = game.actors.get(actorId);
    if (actor) {
      await actor.sheet.render(true);
    } else {
      ui.notifications.error("Can't find actor to open sheet for.");
    }
  }

  /**
   * @this {AcksPartyOverviewApp}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #deleteFromParty(event, target) {
    const actorId = AcksHtmlUtil.getActorIdFromDOM(target);
    const actor = game.actors.get(actorId);
    if (actor) {
      await actor.setFlag("acks", "party", false);
      await this.#refresh();
    }
  }

  /**
   * @this {AcksPartyOverviewApp}
   * @param {PointerEvent} _event
   * @param {HTMLElement} _target
   */
  static async #dealXP(_event, _target) {
    const { total } = await ACKSDialog.inputXPAmount();

    if (total) {
      const pcs = game.actors.contents.filter((actor) => {
        return actor.getFlag("acks", "party") && actor.type === "character";
      });
      let shares = 0;
      pcs.forEach((c) => {
        shares += c.system.details.xp.share;
      });
      const value = total / shares;
      if (value) {
        // Give experience
        pcs.forEach((c) => {
          c.getExperience(Math.floor(c.system.details.xp.share * value));
        });
      }
    }
  }

  /**
   * @this {AcksPartyOverviewApp}
   */
  static async #resync() {
    await this.#refresh();
  }

  async #refresh() {
    await this.render({ parts: ["app"] });
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    /** @type {DragDropConfiguration} */
    const dragDropConfig = {
      permissions: {
        drop: () => game.user.isGM,
      },
      callbacks: {
        drop: this._onDrop.bind(this),
      },
    };
    new foundry.applications.ux.DragDrop.implementation(dragDropConfig).bind(this.element);
  }

  async _onDrop(event) {
    const data = TextEditorRef.getDragEventData(event);
    const documentClass = foundry.utils.getDocumentClass(data.type);
    if (documentClass) {
      const doc = await documentClass.fromDropData(data);
      if (doc?.documentName === "Actor") {
        await doc.setFlag("acks", "party", true);
        await this.#refresh();
      } else {
        ui.notifications.error("Only character actors can be added to the party.");
      }
    }
  }
}

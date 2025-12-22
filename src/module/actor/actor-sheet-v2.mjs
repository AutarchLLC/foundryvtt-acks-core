import { AcksEntityTweaks } from "../dialog/entity-tweaks.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const TextEditorRef = foundry.applications?.ux?.TextEditor?.implementation ?? TextEditor;

/**
 * @see https://foundryvtt.wiki/en/development/api/applicationv2
 * @see https://foundryvtt.com/api/v13/classes/foundry.applications.sheets.ActorSheetV2.html
 */
export default class ACKSActorSheetV2 extends HandlebarsApplicationMixin(ActorSheetV2) {
  constructor(...args) {
    super(...args);
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["acks", "actor-v2"],
    position: {
      // initial size of the window
      width: 800,
      height: 700,
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
      submitOnClose: true,
    },
    window: {
      resizable: true,
      controls: [
        {
          icon: "fas fa-code",
          label: "ACKS.dialog.tweaks",
          action: "showTweaksDialog",
          ownership: "OWNER",
          visible: ACKSActorSheetV2.#canShowTweaksBtn,
        },
      ],
    },
    actions: {
      showTweaksDialog: ACKSActorSheetV2.#showTweaksDialog,
      rollHitDice: ACKSActorSheetV2.#rollHitDice,
      rollMorale: ACKSActorSheetV2.#rollMorale,
      rollLoyalty: ACKSActorSheetV2.#rollLoyalty,
      rollSave: ACKSActorSheetV2.#rollSave,
      rollAttack: ACKSActorSheetV2.#rollAttack,
      toggleSummary: ACKSActorSheetV2.#toggleSummary,
      itemShow: ACKSActorSheetV2.#itemShow,
      itemEdit: ACKSActorSheetV2.#itemEdit,
      itemDelete: ACKSActorSheetV2.#itemDelete,
      itemCreate: ACKSActorSheetV2.#itemCreate,
      itemUse: ACKSActorSheetV2.#itemUse,
    },
  };

  /**
   * Can current user see Tweaks button?
   * TODO: seems redundant - it is not visible to player if he is not owner even when this returns true. why?
   * @return {boolean}
   */
  static #canShowTweaksBtn() {
    return this.isEditable && (game.user.isGM || this.actor.isOwner);
  }

  static #showTweaksDialog() {
    new AcksEntityTweaks(this.actor, {
      top: this.position.top + 40,
      left: this.position.left + (this.position.width - 400) / 2,
    }).render(true);
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #rollHitDice(event, target) {
    this.actor.rollHitDice({ event });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #rollMorale(event, target) {
    this.actor.rollMorale({ event });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #rollLoyalty(event, target) {
    this.actor.rollLoyalty({ event });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #rollSave(event, target) {
    const save = target.dataset.save;
    this.actor.rollSave(save, { event });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #rollAttack(event, target) {
    const attack = target.dataset.attack;

    // TODO: why do we create rollData here?
    const rollData = {
      actor: this.actor,
      roll: {},
    };

    let skip = false;
    const skipKey = game.settings.get("acks", "skip-dialog-key");
    if (event[skipKey]) {
      skip = true;
    }

    this.actor.targetAttack(rollData, attack, {
      type: attack,
      skipDialog: skip,
    });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #toggleSummary(event, target) {
    const item = this._getItemFromDOM(target);
    const itemEl = target.closest(".item");

    const summaryEl = itemEl.querySelector(".item-summary");
    if (summaryEl.classList.contains("expanded")) {
      // Collapse
      summaryEl.classList.remove("expanded");
      summaryEl.addEventListener(
        "transitionend",
        () => {
          if (!summaryEl.classList.contains("expanded")) {
            summaryEl.innerHTML = "";
          }
        },
        { once: true },
      );
    } else {
      // Expand
      const enrichmentOptions = {
        secrets: item.isOwner,
        relativeTo: item,
      };
      const enriched = await TextEditorRef.enrichHTML(item.system.description, enrichmentOptions);
      const tagsHtmlString = item.getTags();
      const tags = tagsHtmlString.length > 0 ? `<ol class="tag-list unlist">${tagsHtmlString}</ol>` : "";
      summaryEl.innerHTML = `<div>${tags}${enriched}</div>`;
      summaryEl.classList.add("expanded");
    }
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #itemShow(event, target) {
    const item = this._getItemFromDOM(target);
    void item.show();
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #itemEdit(event, target) {
    const item = this._getItemFromDOM(target);
    void item.sheet.render(true);
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #itemDelete(event, target) {
    const itemId = this._getItemIdFromDOM(target);
    await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #itemCreate(event, target) {
    const itemType = target.dataset.type;
    const itemSource = {
      name: `New ${itemType}`,
      type: itemType,
    };

    await this.actor.createEmbeddedDocuments("Item", [itemSource]);
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #itemUse(event, target) {
    const item = this._getItemFromDOM(target);
    const skipKey = game.settings.get("acks", "skip-dialog-key");
    const skipDialog = event[skipKey] || false;

    switch (item.type) {
      case "weapon":
        if (this.actor.type === "monster") {
          void item.update({ "system.counter.value": item.system.counter.value - 1 });
        }
        item.rollWeapon({ skipDialog });
        break;

      case "spell":
        item.spendSpell({ skipDialog });
        break;

      default:
        void item.rollFormula({ skipDialog });
        break;
    }
  }

  /**
   * Actions performed after a first render of the Application.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @returns {Promise<void>}
   * @protected
   */
  async _onRender(context, options) {
    await super._onRender(context, options);

    const itemInputs = this.element.querySelectorAll("input.item-input");
    for (const input of itemInputs) {
      input.addEventListener("change", this._onInputChange.bind(this));
    }
  }

  _onInputChange(event) {
    event.stopImmediatePropagation();

    const item = this._getItemFromDOM(event.target);
    const value = event.target.valueAsNumber;
    const field = event.target.dataset.name;
    if (!item || !field || Number.isNaN(value)) {
      return;
    }

    const upd = { [field]: value };

    void item.update(upd);
  }

  // Prepare application rendering context data for a given render request.
  // @see https://foundryvtt.wiki/en/development/api/applicationv2#_preparecontext
  async _prepareContext(options) {
    const context = {
      ...(await super._prepareContext(options)),
      actor: this.actor,
      actorFields: this.actor.system.schema.fields,
      system: this.actor.system,
      isGM: game.user.isGM,
      managerName: this.actor.getManagerName(),
      owner: this.document.isOwner,
    };

    await this._prepareItems(context);

    context.totalMoneyGC = this.actor.getTotalMoneyGC();
    context.moneyEncumbrance = this.actor.getTotalMoneyEncumbrance();

    context.enriched = {
      biography: await TextEditorRef.enrichHTML(this.actor.system.details.biography),
      notes: await TextEditorRef.enrichHTML(this.actor.system.details.notes),
    };

    return context;
  }

  /**
   * Prepare items display across the sheet.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @protected
   */
  async _prepareItems(context) {
    const items = [];
    const weapons = [];
    const armors = [];
    const abilities = [];
    const spells = [];
    const languages = [];
    const money = [];

    for (const item of this.actor.items) {
      switch (item.type) {
        case "item":
          items.push(item);
          break;
        case "weapon":
          weapons.push(item);
          break;
        case "armor":
          armors.push(item);
          break;
        case "ability":
          abilities.push(item);
          break;
        case "spell":
          spells.push(item);
          break;
        case "language":
          languages.push(item);
          break;
        case "money":
          money.push(item);
          break;
      }
    }

    // Sort spells by level
    const sortedSpells = {};
    const slots = {};
    for (const spell of spells) {
      const lvl = spell.system.lvl;

      sortedSpells[lvl] ??= [];

      slots[lvl] ??= 0;

      slots[lvl] += spell.system.cast;
      sortedSpells[lvl].push(spell);
    }

    // Sort money according to the 'coppervalue' field
    money.sort((a, b) => b.system.coppervalue - a.system.coppervalue);
    // Compute total money value
    for (const m of money) {
      m.system.totalvalue = (m.system.coppervalue * (m.system.quantity + m.system.quantitybank)) / 100;
    }

    context.slots = {
      used: slots,
    };
    context.owned = {
      items,
      weapons,
      armors,
      money,
    };
    context.abilities = abilities;
    context.spells = sortedSpells;
    context.languages = languages;

    context.favorites = this.actor.getFavorites();
  }

  /**
   * Will return the item corresponding to the clicked element, or null if not found.
   * @param {HTMLElement} target
   * @return {AcksItem|null}
   * @private
   */
  _getItemFromDOM(target) {
    const itemId = this._getItemIdFromDOM(target);
    const item = this.actor.items.get(itemId);
    if (!item) {
      ui.notifications.error("Can't find item on actor to show summary for.");
      return null;
    }
    return item;
  }

  /**
   *
   * @param {HTMLElement} target
   * @return {string}
   * @private
   */
  _getItemIdFromDOM(target) {
    const itemEl = target.closest(".item");
    return itemEl.dataset.itemId;
  }
}

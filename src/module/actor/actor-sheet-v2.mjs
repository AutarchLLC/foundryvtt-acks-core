/* global foundry, game, ui, Item */
import { ITEM_TYPE } from "../constants.mjs";
import { AcksHtmlUtil } from "../util/html-util.mjs";
import ACKSDialog from "../dialog/dialog.mjs";
import ActorTweaksConfig from "../apps/actor-tweaks-config.mjs";
import AcksEffectUtil from "../effect/acks-effect-util.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const TextEditorRef = foundry.applications.ux.TextEditor.implementation;

/**
 * @see https://foundryvtt.wiki/en/development/api/applicationv2
 * @see https://foundryvtt.com/api/v13/classes/foundry.applications.sheets.ActorSheetV2.html
 */
export default class ACKSActorSheetV2 extends HandlebarsApplicationMixin(ActorSheetV2) {
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
          icon: "fas fa-screwdriver-wrench",
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
      hirelingShow: ACKSActorSheetV2.#hirelingShow,
      hirelingLoyalty: ACKSActorSheetV2.#hirelingLoyalty,
      hirelingMorale: ACKSActorSheetV2.#hirelingMorale,
      hirelingDelete: ACKSActorSheetV2.#hirelingDelete,
      toggleListSection: AcksHtmlUtil.toggleListSection,
      resetSpellSlots: ACKSActorSheetV2.#resetSpellSlots,
      createEffect: ACKSActorSheetV2.#addEffect,
      toggleEffect: ACKSActorSheetV2.#toggleEffect,
      editEffect: ACKSActorSheetV2.#editEffect,
      deleteEffect: ACKSActorSheetV2.#deleteEffect,
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
    const config = { document: this.actor };

    return new ActorTweaksConfig(config).render(true);
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #resetSpellSlots(event, target) {
    const spells = target.closest(".item-list-section.spells").querySelectorAll(".item");
    for (const spell of spells) {
      const item = AcksHtmlUtil.getActorItemFromDOM(spell, this.actor);
      void item.update({
        "system.cast": 0,
        "system.memorized": 0,
      });
    }
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} _target
   */
  static #rollHitDice(event, _target) {
    this.actor.rollHitDice({ event });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} _target
   */
  static #rollMorale(event, _target) {
    this.actor.rollMorale({ event });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} _target
   */
  static #rollLoyalty(event, _target) {
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
    const item = AcksHtmlUtil.getActorItemFromDOM(target, this.actor);
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
    const item = AcksHtmlUtil.getActorItemFromDOM(target, this.actor);
    void item.show();
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #itemEdit(event, target) {
    const item = AcksHtmlUtil.getActorItemFromDOM(target, this.actor);
    void item.sheet.render(true);
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #itemDelete(event, target) {
    if (game.settings.get("acks", "confirmDeletion") && !(await ACKSDialog.confirmDeletion())) {
      return;
    }
    const itemId = AcksHtmlUtil.getItemIdFromDOM(target);
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

    if (itemType === "choice") {
      const result = await ACKSDialog.chooseItemNameAndType();
      if (result === null) {
        return;
      } else {
        if (result.itemName === null || result.itemName === "") {
          ui.notifications.error("Item creation cancelled: no name provided."); //TODO: localization
          return;
        }

        itemSource.name = result.itemName;
        itemSource.type = result.itemType;
      }
    }

    await this.actor.createEmbeddedDocuments("Item", [itemSource]);
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #itemUse(event, target) {
    const item = AcksHtmlUtil.getActorItemFromDOM(target, this.actor);
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
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #hirelingShow(event, target) {
    const hirelingId = AcksHtmlUtil.getItemIdFromDOM(target);
    this.actor.showHenchman(hirelingId);
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #hirelingLoyalty(event, target) {
    const hireling = this._getActorFromDOM(target);
    void hireling.rollLoyalty({ event });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #hirelingMorale(event, target) {
    const hireling = this._getActorFromDOM(target);
    void hireling.rollMorale({ event });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #hirelingDelete(event, target) {
    if (game.settings.get("acks", "confirmDeletion") && !(await ACKSDialog.confirmDeletion())) {
      return;
    }
    const hirelingId = AcksHtmlUtil.getItemIdFromDOM(target);
    void this.actor.delHenchman(hirelingId);
  }

  /**
   * Handle adding new active effect.
   * @this {ACKSActorSheetV2}
   * @param {Event} event
   * @param {HTMLElement} target - add effect button
   */
  static async #addEffect(event, target) {
    const effectType = target.dataset.effectType;
    await AcksEffectUtil.addEffect(effectType, this.actor);
  }

  /**
   * Handle toggling of an active event.
   * @this {ACKSActorSheetV2}
   * @param {Event} event
   * @param {HTMLElement} target
   * @return {Promise<void>}
   */
  static async #toggleEffect(event, target) {
    const effectId = target.dataset.effectId;
    await AcksEffectUtil.toggleEffect(effectId, this.actor);
  }

  /**
   * Handle editing of an active event.
   * @this {ACKSActorSheetV2}
   * @param {Event} event
   * @param {HTMLElement} target
   * @return {Promise<void>}
   */
  static async #editEffect(event, target) {
    const effectId = target.dataset.effectId;
    await AcksEffectUtil.editEffect(effectId, this.actor);
  }

  /**
   * Handle deleting of an active event.
   * @this {ACKSActorSheetV2}
   * @param {Event} event
   * @param {HTMLElement} target
   * @return {Promise<void>}
   */
  static async #deleteEffect(event, target) {
    if (game.settings.get("acks", "confirmDeletion") && !(await ACKSDialog.confirmDeletion())) {
      return;
    }
    const effectId = target.dataset.effectId;
    await AcksEffectUtil.deleteEffect(effectId, this.actor);
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

    const kind = event.target.dataset.kind ?? "item";
    const doc = this._getDocumentFromDOM(event.target, kind);
    const value = event.target.valueAsNumber;
    const field = event.target.dataset.name;
    if (!doc || !field || Number.isNaN(value)) {
      return;
    }

    const upd = { [field]: value };

    void doc.update(upd);
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
      hirelings: this.actor.getHirelings(),
    };

    await this._prepareItems(context);

    context.totalMoneyGC = this.actor.getTotalMoneyGC();
    context.moneyEncumbrance = this.actor.getTotalMoneyEncumbrance();

    context.isNew = this.actor.isNew();

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
    const proficiencies = [];
    const spells = [];
    const languages = [];
    const money = [];

    for (const item of this.actor.items) {
      switch (item.type) {
        case ITEM_TYPE.ITEM:
          items.push(item);
          break;
        case ITEM_TYPE.WEAPON:
          weapons.push(item);
          break;
        case ITEM_TYPE.ARMOR:
          armors.push(item);
          break;
        case ITEM_TYPE.PROFICIENCY:
          proficiencies.push(item);
          break;
        case ITEM_TYPE.SPELL:
          spells.push(item);
          break;
        case ITEM_TYPE.LANGUAGE:
          languages.push(item);
          break;
        case ITEM_TYPE.MONEY:
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
    context.abilities = proficiencies;
    context.spells = sortedSpells;
    context.languages = languages;

    context.favorites = this.actor.getFavorites();
  }

  /**
   * Will return the actor corresponding to the clicked element, or null if not found.
   * @param {HTMLElement} target
   * @return {AcksActor|null}
   * @private
   */
  _getActorFromDOM(target) {
    const actorId = AcksHtmlUtil.getItemIdFromDOM(target);
    const actor = game.actors.get(actorId);
    if (!actor) {
      ui.notifications.error("Can't find actor.");
      return null;
    }
    return actor;
  }

  /**
   * Will return document corresponding to the clicked element, or null if not found.
   * @param {HTMLElement} target
   * @param {"item"|"actor"} kind
   * @return {AcksItem|AcksActor|null}
   * @private
   */
  _getDocumentFromDOM(target, kind = "item") {
    switch (kind) {
      case "item":
        return AcksHtmlUtil.getActorItemFromDOM(target, this.actor);
      case "actor":
        return this._getActorFromDOM(target);
      default:
        return null;
    }
  }

  /**
   * Handle a dropped document on the ActorSheet
   * @template {Document} TDocument
   * @param {DragEvent} event The initiating drop event
   * @param {TDocument} document The resolved Document class
   * @returns {Promise<TDocument|null>} A Document of the same type as the dropped one in case of a successful result,
   * or null in case of failure or no action being taken
   * @protected
   * @override
   */
  async _onDropDocument(event, document) {
    if (document.documentName === "RollTable") {
      return (await this._onDropRollTable(event, document)) ?? null;
    } else {
      return super._onDropDocument(event, document);
    }
  }

  /**
   * Handle a dropped RollTable on the Actor Sheet. By default, dropping a RollTable does nothing,
   * but this can be overridden in subclasses.
   * @param {DragEvent} _event The initiating drop event
   * @param {RollTable} _rollTable The dropped RollTable document
   * @return {Promise<RollTable|null|undefined>} A Promise resolving to an RollTable identical or related to the dropped RollTable
   * to indicate success, or a nullish value to indicate failure or no action being taken
   * @protected
   */
  async _onDropRollTable(_event, _rollTable) {
    return null;
  }

  /**
   * Handle a dropped Item on the Actor Sheet.
   * @param {DragEvent} event The initiating drop event
   * @param {Item} item The dropped Item document
   * @returns A Promise resolving to the dropped Item (if sorting), a newly created Item,
   * or a nullish value in case of failure or no action being taken
   * @protected
   * @override
   */
  async _onDropItem(event, item) {
    if (!this.actor.isOwner) {
      return null;
    }
    switch (item.type) {
      case ITEM_TYPE.BUNDLE:
        return await this._onDropItemBundle(event, item);
      case ITEM_TYPE.MONEY:
        return await this._onDropItemMoney(event, item, 1);
      default:
        return super._onDropItem(event, item);
    }
  }

  /**
   * Handle a dropped Item Bundle on the Actor Sheet.
   * @param {DragEvent} event The initiating drop event
   * @param {Item} item The dropped Item document
   * @protected
   */
  async _onDropItemBundle(event, item) {
    const result = [];
    for (const bundleItemData of item.system.itemList) {
      /** @type Item */
      const bundleItem = await foundry.utils.fromUuid(bundleItemData.uuid);
      if (bundleItem.type === ITEM_TYPE.MONEY) {
        await this._onDropItemMoney(event, bundleItem, bundleItemData.quantity ?? 1);
      } else {
        const count = bundleItemData.quantity ?? 1;
        for (let i = 0; i < count; i++) {
          result.push(await this._onDropItem(event, bundleItem));
        }
      }
    }
    return result;
  }

  /**
   * Handle a dropped Money Item on the Actor Sheet. It can be from Item bundle - in that case quantity might be more than 1.
   * @param {DragEvent} event The initiating drop event
   * @param {Item} item The dropped Item document
   * @param {number} quantity Quantity of money items to add (default: 1)
   * @protected
   */
  async _onDropItemMoney(event, item, quantity = 1) {
    // let's check if actor already has this money item.
    const existingMoneyItem = this.actor.items.get(item.id);
    if (existingMoneyItem) {
      // update the amount of existing money item
      await existingMoneyItem.update({ "system.quantity": existingMoneyItem.system.quantity + quantity });
      return existingMoneyItem;
    } else {
      const itemObject = item.toObject();
      itemObject.system.quantity += quantity;
      const result = await Item.implementation.create(itemObject, { parent: this.actor, keepId: true });
      return result ?? null;
    }
  }
}

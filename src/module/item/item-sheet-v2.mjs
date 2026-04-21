/* global foundry, ui, game */
import { AcksUtility } from "../util/acks-utility.mjs";
import AcksEffectUtil from "../effect/acks-effect-util.mjs";
import { ACKS } from "../config.mjs";
import { AcksHtmlUtil } from "../util/html-util.mjs";
import { ITEM_TYPE } from "../constants.mjs";
import ACKSDialog from "../dialog/dialog.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export default class AcksItemSheetV2 extends HandlebarsApplicationMixin(ItemSheetV2) {
  constructor(...args) {
    super(...args);
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["acks", "acks2", "item-v2"],
    position: {
      // initial size of the window
      width: 570,
      height: 400,
    },
    window: {
      resizable: true,
    },
    form: {
      submitOnChange: true,
      submitOnClose: true,
    },
    actions: {
      // button actions, defined in template as data-action
      createEffect: AcksItemSheetV2.#addEffect,
      toggleEffect: AcksItemSheetV2.#toggleEffect,
      editEffect: AcksItemSheetV2.#editEffect,
      deleteEffect: AcksItemSheetV2.#deleteEffect,
      toggleMelee: AcksItemSheetV2.#toggleMelee,
      toggleMissile: AcksItemSheetV2.#toggleMissile,
      deleteTag: AcksItemSheetV2.#deleteTag,
      viewItemFromBundle: AcksItemSheetV2.#viewItemFromBundle,
      deleteItemFromBundle: AcksItemSheetV2.#deleteItemFromBundle,
      changeQuantityInBundle: AcksItemSheetV2.#changeQuantityInBundle,
      toggleListSection: AcksHtmlUtil.toggleListSection,
    },
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: "description", label: "ACKS.category.description" },
        { id: "effects", label: "ACKS.category.effects" },
        { id: "contents", label: "ACKS.category.contents" },
      ],
      initial: "description",
    },
  };

  /** @override */
  tabGroups = {
    primary: "description",
  };

  /** @override */
  static PARTS = {
    header: {
      template: "systems/acks/templates/items/v2/item/header.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    description: {
      template: "systems/acks/templates/items/v2/item/description.hbs",
      scrollable: [""],
    },
    effects: {
      template: "systems/acks/templates/items/v2/item/effects.hbs",
      templates: ["systems/acks/templates/items/v2/common/item-active-effects.hbs"],
      scrollable: [""],
    },
    contents: {
      template: "systems/acks/templates/items/v2/item/bundle-contents.hbs",
      scrollable: [""],
    },
  };

  get item() {
    return this.document;
  }

  /**
   * Modify the provided options passed to a render request.
   * @param {RenderOptions} options Options which configure application rendering behavior
   * @protected
   */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);

    // change initial height of window to accommodate for more details (left "stats" block with configuration)
    if (options.isFirstRender && [ITEM_TYPE.SPELL, ITEM_TYPE.PROFICIENCY, ITEM_TYPE.WEAPON].includes(this.item.type)) {
      Object.assign(options.position, { height: 530 });
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
    const tagInput = this.element.querySelector(':scope input[data-action="add-tag"]');
    tagInput?.addEventListener("keydown", this.#tagInputKeydownHandler.bind(this));

    if (this._isItemBundle()) {
      /** @type {DragDropConfiguration} */
      const dragDropConfig = {
        permissions: {
          drop: () => this.isEditable,
        },
        callbacks: {
          drop: this._onDrop.bind(this),
        },
      };
      new foundry.applications.ux.DragDrop.implementation(dragDropConfig).bind(this.element);
    }
  }

  /**
   * An event that occurs when data is dropped into a drop target.
   * @param {DragEvent} event
   * @returns {Promise<void>}
   * @protected
   */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    const documentClass = foundry.utils.getDocumentClass(data.type);
    if (documentClass) {
      const doc = await documentClass.fromDropData(data);
      await this._onDropDocument(event, doc);
    }
  }

  /**
   * Handle a dropped document on the ActorSheet
   * @template {Document} TDocument
   * @param {DragEvent} event         The initiating drop event
   * @param {TDocument} doc       The resolved Document class
   * @returns {Promise<TDocument|null>} A Document of the same type as the dropped one in case of a successful result,
   *                                    or null in case of failure or no action being taken
   * @protected
   */
  async _onDropDocument(event, doc) {
    switch (doc.documentName) {
      case "Item":
        return (await this._onDropItem(event, doc)) ?? null;
      default:
        return null;
    }
  }

  /**
   * Handle a dropped Item on the Actor Sheet.
   * @param {DragEvent} event     The initiating drop event
   * @param {Item} item           The dropped Item document
   * @returns {Promise<Item|null|undefined>} A Promise resolving to the dropped Item (if sorting), a newly created Item,
   *                                         or a nullish value in case of failure or no action being taken
   * @protected
   */
  async _onDropItem(event, item) {
    if (item.type === ITEM_TYPE.BUNDLE) {
      ui.notifications.warn(`Cannot add a bundle to another bundle - ${item.name}`);
      return;
    }
    if (this.item.system.itemList.some((bundleItem) => bundleItem.id === item.id)) {
      ui.notifications.warn(`Bundle already contains this item - ${item.name}`);
    } else {
      const itemList = foundry.utils.deepClone(this.item.system.itemList);
      itemList.push({
        id: item.id,
        uuid: item.uuid,
        quantity: 1,
        name: item.name,
        img: item.img,
        type: item.type,
        inCompendium: item.inCompendium,
      });
      this.item.update({ "system.itemList": itemList });
    }
  }

  /**
   * Allow subclasses to dynamically configure render parts.
   * @param {HandlebarsRenderOptions} options
   * @returns {Record<string, HandlebarsTemplatePart>}
   * @protected
   */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    // if item can't have Active Effects remove corresponding part
    if (!this._hasActiveEffects()) {
      delete parts.effects;
    }
    if (!this._isItemBundle()) {
      delete parts.contents;
    }
    return parts;
  }

  /**
   * Prepare application tab data for a single tab group.
   * @param {string} group The ID of the tab group to prepare
   * @returns {Record<string, ApplicationTab>}
   * @protected
   */
  _prepareTabs(group) {
    const tabs = super._prepareTabs(group);
    // if item can't have Active Effects remove corresponding tab
    if (!this._hasActiveEffects()) {
      delete tabs.effects;
    }
    if (!this._isItemBundle()) {
      delete tabs.contents;
    }
    return tabs;
  }

  /**
   * Returns true if item can have Active Effects
   * @return {boolean}
   * @protected
   */
  _hasActiveEffects() {
    return [ITEM_TYPE.ITEM, ITEM_TYPE.WEAPON, ITEM_TYPE.ARMOR, ITEM_TYPE.SPELL, ITEM_TYPE.PROFICIENCY].includes(
      this.item.type,
    );
  }

  /**
   * @return {boolean} True if the item is a bundle
   * @private
   */
  _isItemBundle() {
    return this.item.type === ITEM_TYPE.BUNDLE;
  }

  /**
   * Prepare data for rendering the Item sheet
   * The prepared data object contains both the actor data and additional sheet options
   * @param {ApplicationRenderOptions} options https://foundryvtt.com/api/interfaces/foundry.applications.types.ApplicationRenderOptions.html
   * @return {Promise<ApplicationRenderContext>} https://foundryvtt.com/api/interfaces/foundry.applications.types.ApplicationRenderContext.html
   */
  async _prepareContext(options) {
    const context = {
      ...(await super._prepareContext(options)),
      item: this.item,
      config: ACKS,
      system: this.item.system,
      isGM: game.user.isGM,
      isPhysical: "cost" in this.item.system && "weight6" in this.item.system,
      hasTags: "tags" in this.item.system && this.item.system.tags.length > 0,
    };

    return context;
  }

  /**
   * Prepare context that is specific to only a single rendered part.
   *
   * It is recommended to augment or mutate the shared context so that downstream methods like _onRender have
   * visibility into the data that was used for rendering. It is acceptable to return a different context object
   * rather than mutating the shared context at the expense of this transparency.
   *
   * @param {string} partId                         The part being rendered
   * @param {ApplicationRenderContext} context      Shared context provided by _prepareContext
   * @param {HandlebarsRenderOptions} options       Options which configure application rendering behavior
   * @returns {Promise<ApplicationRenderContext>}   Context data for a specific part
   * @protected
   */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    switch (partId) {
      case "description":
        context.tab = context.tabs[partId];
        context = await this._prepareDescriptionContext(context);
        break;

      case "effects":
        context.tab = context.tabs[partId];
        context = await this._prepareEffectsContext(context);
        break;

      case "contents":
        context.tab = context.tabs[partId];
        context = await this._prepareItemBundleContext(context);
        break;

      default:
        break;
    }

    return context;
  }

  /**
   * Prepare context for Effects Tab
   * @param {ApplicationRenderContext} context
   * @return {Promise<ApplicationRenderContext>}
   * @private
   */
  async _prepareEffectsContext(context) {
    context.effects = await AcksUtility.prepareActiveEffectCategories(this.item.effects);

    return context;
  }

  /**
   * Prepare context for Bundle Contents Tab
   * @param {ApplicationRenderContext} context
   * @return {Promise<ApplicationRenderContext>}
   * @private
   */
  async _prepareItemBundleContext(context) {
    context.bundleItems = this.item.system.itemList.reduce((acc, bundleItem) => {
      if (!acc[bundleItem.type]) {
        acc[bundleItem.type] = [];
      }
      acc[bundleItem.type].push(bundleItem);
      return acc;
    }, {});

    return context;
  }

  /**
   * Prepare context for Description Tab
   * @param {ApplicationRenderContext} context
   * @return {Promise<ApplicationRenderContext>}
   * @private
   */
  async _prepareDescriptionContext(context) {
    context.getDetailsPartialPath = () => {
      return `systems/acks/templates/items/v2/details/details-${this.item.type}.hbs`;
    };

    const enrichmentOptions = {
      secrets: this.item.isOwner,
      relativeTo: this.item,
    };

    context.enriched = {
      description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.item.system.description,
        enrichmentOptions,
      ),
    };

    return context;
  }

  /**
   * Handle adding new active effect.
   * @this {AcksItemSheetV2}
   * @param {Event} event
   * @param {HTMLElement} target - add effect button
   */
  static async #addEffect(event, target) {
    const effectType = target.dataset.effectType;
    await AcksEffectUtil.addEffect(effectType, this.item);
  }

  /**
   * Handle toggling of an active event.
   * @this {AcksItemSheetV2}
   * @param {Event} event
   * @param {HTMLElement} target
   * @return {Promise<void>}
   */
  static async #toggleEffect(event, target) {
    const effectId = target.dataset.effectId;
    await AcksEffectUtil.toggleEffect(effectId, this.item);
  }

  /**
   * Handle editing of an active event.
   * @this {AcksItemSheetV2}
   * @param {Event} event
   * @param {HTMLElement} target
   * @return {Promise<void>}
   */
  static async #editEffect(event, target) {
    const effectId = target.dataset.effectId;
    await AcksEffectUtil.editEffect(effectId, this.item);
  }

  /**
   * Handle deleting of an active event.
   * @this {AcksItemSheetV2}
   * @param {Event} event
   * @param {HTMLElement} target
   * @return {Promise<void>}
   */
  static async #deleteEffect(event, target) {
    if (game.settings.get("acks", "confirmDeletion") && !(await ACKSDialog.confirmDeletion())) {
      return;
    }
    const effectId = target.dataset.effectId;
    await AcksEffectUtil.deleteEffect(effectId, this.item);
  }

  /**
   * Handle melee flag toggling for weapon.
   * @this {AcksItemSheetV2}
   * @param {Event} _event
   * @param {HTMLElement} _target
   * @return {Promise<void>}
   */
  static async #toggleMelee(_event, _target) {
    this.item.update({ "system.melee": !this.item.system.melee });
  }

  /**
   * Handle missile flag toggling for weapon.
   * @this {AcksItemSheetV2}
   * @param {Event} _event
   * @param {HTMLElement} _target
   * @return {Promise<void>}
   */
  static async #toggleMissile(_event, _target) {
    this.item.update({ "system.missile": !this.item.system.missile });
  }

  /**
   * Remove tag from item
   * @param {Event} event
   * @param {HTMLElement} target
   * @return {Promise<void>}
   */
  static async #deleteTag(event, target) {
    if (this.isEditable) {
      if (game.settings.get("acks", "confirmDeletion") && !(await ACKSDialog.confirmDeletion())) {
        return;
      }
      const tag = target.dataset.tag;
      this.item.popTag(tag);
    }
  }

  /**
   * Remove tag from item
   * @param {Event} event
   * @param {HTMLElement} target
   * @return {Promise<void>}
   */
  static async #viewItemFromBundle(event, target) {
    const itemUUID = AcksHtmlUtil.getItemIdFromDOM(target);
    const item = await foundry.utils.fromUuid(itemUUID);
    if (item) {
      item.sheet.render(true);
    }
  }

  /**
   * Remove tag from item
   * @param {Event} event
   * @param {HTMLElement} target
   * @return {Promise<void>}
   */
  static async #deleteItemFromBundle(event, target) {
    if (game.settings.get("acks", "confirmDeletion") && !(await ACKSDialog.confirmDeletion())) {
      return;
    }
    const itemUUID = AcksHtmlUtil.getItemIdFromDOM(target);
    const itemList = foundry.utils.deepClone(this.item.system.itemList);
    const updatedItemList = itemList.filter((bundleItem) => bundleItem.uuid !== itemUUID);
    this.item.update({ "system.itemList": updatedItemList });
  }

  /**
   * Change quantity of item in bundle
   * @this {AcksItemSheetV2}
   * @param {Event} event
   * @param {HTMLElement} target
   * @return {Promise<void>}
   */
  static async #changeQuantityInBundle(event, target) {
    const itemUUID = AcksHtmlUtil.getItemIdFromDOM(target);
    const itemRecord = this.item.system.itemList.find((bundleItem) => bundleItem.uuid === itemUUID);
    if (itemRecord) {
      const { quantity } = await ACKSDialog.inputNewQuantity(itemRecord.quantity);
      if (quantity && quantity >= 1 && quantity !== itemRecord.quantity) {
        itemRecord.quantity = quantity;
        const updatedItemList = foundry.utils.deepClone(this.item.system.itemList);
        await this.item.update({ "system.itemList": updatedItemList });
      }
    }
  }

  /**
   * Handle Enter key press in TAG input of weapon sheet
   * @param {KeyboardEvent} event
   */
  #tagInputKeydownHandler(event) {
    if (event.code === "Enter" || event.code === "NumpadEnter") {
      const val = event.target?.value ?? "";
      if (val.length > 0) {
        const values = val.split(",");
        this.item.pushTag(values);
      }
    }
  }
}

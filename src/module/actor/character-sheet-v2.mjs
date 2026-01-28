import ACKSActorSheetV2 from "./actor-sheet-v2.mjs";
import { AcksUtility } from "../utility.js";
import { AcksHtmlUtil } from "../util/html-util.mjs";

export default class ACKSCharacterSheetV2 extends ACKSActorSheetV2 {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["character-v2"],
    actions: {
      rollBaseHealingRate: ACKSCharacterSheetV2.#rollBaseHealingRate,
      rollAttribute: ACKSCharacterSheetV2.#rollAttribute,
      rollAdventuring: ACKSCharacterSheetV2.#rollAdventuring,
      itemToggleFavorite: ACKSCharacterSheetV2.#itemToggleFavorite,
      resetSpellSlots: ACKSCharacterSheetV2.#resetSpellSlots,
      toggleListSection: AcksHtmlUtil.toggleListSection,
      itemToggleEquipped: ACKSCharacterSheetV2.#itemToggleEquipped,
      payWages: ACKSCharacterSheetV2.#payWages,
    },
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: "attributes", label: "ACKS.category.attributes" },
        { id: "abilities", label: "ACKS.category.abilities" },
        { id: "spells", label: "ACKS.category.spells" },
        { id: "inventory", label: "ACKS.category.inventory" },
        { id: "notes", label: "ACKS.category.notes" },
        { id: "hirelings", label: "ACKS.category.hirelings" },
        { id: "effects", label: "ACKS.category.effects" },
      ],
      initial: "attributes",
    },
  };

  /** @override */
  tabGroups = {
    primary: "attributes",
  };

  /**
   * Prepare application tab data for a single tab group.
   * @param {string} group The ID of the tab group to prepare
   * @returns {Record<string, ApplicationTab>}
   * @protected
   */
  _prepareTabs(group) {
    const tabs = super._prepareTabs(group);
    // if item can't have Active Effects remove corresponding tab
    if (!this.actor.system.spells.enabled) {
      delete tabs.spells;
    }
    return tabs;
  }

  /** @override */
  static PARTS = {
    header: {
      template: "systems/acks/templates/actors/v2/header-character.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    attributes: {
      template: "systems/acks/templates/actors/v2/attributes-character.hbs",
    },
    abilities: {
      template: "systems/acks/templates/actors/v2/abilities.hbs",
    },
    spells: {
      template: "systems/acks/templates/actors/v2/spells.hbs",
    },
    inventory: {
      template: "systems/acks/templates/actors/v2/inventory.hbs",
    },
    notes: {
      template: "systems/acks/templates/actors/v2/notes-character.hbs",
    },
    hirelings: {
      template: "systems/acks/templates/actors/v2/hirelings.hbs",
    },
    effects: {
      template: "systems/acks/templates/actors/v2/effects.hbs",
      templates: ["systems/acks/templates/items/v2/common/item-active-effects.hbs"],
    },
  };

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

    context.tab = context.tabs[partId];

    switch (partId) {
      case "effects":
        context = await this._prepareEffectsContext(context);
        break;
      default:
        break;
    }

    return context;
  }

  async _prepareContext(options) {
    const context = {
      ...(await super._prepareContext(options)),
      totalWages: this.actor.getTotalWages(),
    };
    return context;
  }

  /**
   * Prepare context for Effects Tab
   * @param {ApplicationRenderContext} context
   * @return {Promise<ApplicationRenderContext>}
   * @private
   */
  async _prepareEffectsContext(context) {
    context.effects = await AcksUtility.prepareActiveEffectCategories(this.actor.allApplicableEffects());

    return context;
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #rollBaseHealingRate(event, target) {
    this.actor.rollBHR({ event });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #rollAttribute(event, target) {
    const attribute = target.dataset.attribute;
    this.actor.rollCheck(attribute, { event });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #rollAdventuring(event, target) {
    const skill = target.dataset.skill;
    this.actor.rollAdventuring(skill, { event });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #itemToggleFavorite(event, target) {
    const item = this._getItemFromDOM(target);

    item.update({ "system.favorite": !item.system.favorite });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #itemToggleEquipped(event, target) {
    const item = this._getItemFromDOM(target);

    item.update({ "system.equipped": !item.system.equipped });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #payWages(event, target) {
    this.actor.payWages();
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #resetSpellSlots(event, target) {
    const spells = target.closest(".item-list-section.spells").querySelectorAll(".item");
    for (const spell of spells) {
      const item = this._getItemFromDOM(spell);
      void item.update({
        "system.cast": 0,
        "system.memorized": 0,
      });
    }
  }

  /**
   * Handle a dropped Actor on the Actor Sheet.
   * @param {DragEvent} event     The initiating drop event
   * @param {Actor} actor         The dropped Actor document
   * @returns {Promise<Actor|null|undefined>} A Promise resolving to an Actor identical or related to the dropped Actor
   *                                          to indicate success, or a nullish value to indicate failure or no action
   *                                          being taken
   * @protected
   */
  async _onDropActor(event, actor) {
    const actorId = actor.id;
    await this.actor.addHenchman(actorId);
    // TODO: make sure this returns Actor after Hireling handling rework
    return null;
  }
}

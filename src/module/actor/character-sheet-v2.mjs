import ACKSActorSheetV2 from "./actor-sheet-v2.mjs";

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
      toggleListSection: ACKSCharacterSheetV2.#toggleListSection,
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

  /** @override */
  static PARTS = {
    header: {
      template: "systems/acks/templates/actors/v2/header.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    attributes: {
      template: "systems/acks/templates/actors/v2/attributes.hbs",
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
      template: "systems/acks/templates/actors/v2/notes.hbs",
    },
    hirelings: {
      template: "systems/acks/templates/actors/v2/hirelings.hbs",
    },
    effects: {
      template: "systems/acks/templates/actors/v2/effects.hbs",
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
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #toggleListSection(event, target) {
    const spellListSection = target.closest("section.item-list-section");
    const itemListWrapper = spellListSection.querySelector(".item-list-wrapper");
    const icon = target.children.item(0);

    itemListWrapper.classList.toggle("expanded");

    if (icon.classList.contains("fa-caret-down")) {
      icon.classList.remove("fa-caret-down");
      icon.classList.add("fa-caret-right");
    } else {
      icon.classList.remove("fa-caret-right");
      icon.classList.add("fa-caret-down");
    }
  }
}

import ACKSActorSheetV2 from "./actor-sheet-v2.mjs";
import { AcksUtility } from "../utility.js";
import { ACKS } from "../config.js";
import { AcksHtmlUtil } from "../util/html-util.mjs";

export default class ACKSMonsterSheetV2 extends ACKSActorSheetV2 {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["monster-v2"],
    actions: {
      rollDungeonEncounter: ACKSMonsterSheetV2.#rollDungeonEncounter,
      rollWildernessEncounter: ACKSMonsterSheetV2.#rollWildernessEncounter,
      rollHP: ACKSMonsterSheetV2.#rollHP,
      resetAttacks: ACKSMonsterSheetV2.#resetAttacks,
      changePattern: ACKSMonsterSheetV2.#changePattern,
      rollReaction: ACKSMonsterSheetV2.#rollReaction,
    },
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: "attributes", label: "ACKS.category.attributes" },
        { id: "spells", label: "ACKS.category.spells" },
        { id: "notes", label: "ACKS.category.notes" },
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
      template: "systems/acks/templates/actors/v2/header-monster.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    attributes: {
      template: "systems/acks/templates/actors/v2/attributes-monster.hbs",
    },
    spells: {
      template: "systems/acks/templates/actors/v2/spells.hbs",
    },
    notes: {
      template: "systems/acks/templates/actors/v2/notes-monster.hbs",
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
  static #rollDungeonEncounter(event, target) {
    void this.actor.rollAppearing({ event, check: "dungeon" });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #rollWildernessEncounter(event, target) {
    void this.actor.rollAppearing({ event, check: "wilderness" });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #rollHP(event, target) {
    this.actor.rollHP();
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #resetAttacks(event, target) {
    const weapons = this.actor.items.filter((i) => i.type === "weapon");
    for (const weapon of weapons) {
      weapon.update({
        "system.counter.value": weapon.system.counter.max,
      });
    }
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #changePattern(event, target) {
    const item = AcksHtmlUtil.getActorItemFromDOM(target, this.actor);
    const currentColor = item.system.pattern;
    const colors = Object.keys(ACKS.colors);
    let index = colors.indexOf(currentColor);
    index = (index + 1) % colors.length;

    item.update({
      "system.pattern": colors[index],
    });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #rollReaction(event, target) {
    void this.actor.rollReaction({ event });
  }
}

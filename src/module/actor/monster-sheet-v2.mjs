/* global foundry, game */
import ACKSActorSheetV2 from "./actor-sheet-v2.mjs";
import { AcksUtility } from "../util/acks-utility.mjs";
import { ACKS } from "../config.mjs";
import { AcksHtmlUtil } from "../util/html-util.mjs";
import * as ACKSDialog from "../dialog/index.mjs";
import { ITEM_TYPE, MONSTER_SAVING_THROW_LUT } from "../constants.mjs";

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
      generateSaves: ACKSMonsterSheetV2.#generateSaves,
      treasureLinkDelete: ACKSMonsterSheetV2.#treasureLinkDelete,
      addCreatureType: ACKSMonsterSheetV2.#addCreatureType,
      editCreatureType: ACKSMonsterSheetV2.#editCreatureType,
      deleteCreatureType: ACKSMonsterSheetV2.#deleteCreatureType,
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

  /** @override */
  get _canEditCreatureTypes() {
    return this.isEditable;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.treasureLink = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.actor.system.details.treasure.table,
    );

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
   * @param {HTMLElement} _target
   */
  static #rollDungeonEncounter(event, _target) {
    void this.actor.rollAppearing({ event, check: "dungeon" });
  }

  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} _target
   */
  static #rollWildernessEncounter(event, _target) {
    void this.actor.rollAppearing({ event, check: "wilderness" });
  }

  /**
   *
   * @param {PointerEvent} _event
   * @param {HTMLElement} _target
   */
  static #rollHP(_event, _target) {
    this.actor.rollHP();
  }

  /**
   *
   * @param {PointerEvent} _event
   * @param {HTMLElement} _target
   */
  static #resetAttacks(_event, _target) {
    const weapons = this.actor.items.filter((i) => i.type === ITEM_TYPE.WEAPON);
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
   * @param {HTMLElement} _target
   */
  static #rollReaction(event, _target) {
    void this.actor.rollReaction({ event });
  }

  /**
   *
   * @param {PointerEvent} _event
   * @param {HTMLElement} _target
   */
  static async #generateSaves(_event, _target) {
    const result = await ACKSDialog.chooseMonsterHitDice();
    if (result) {
      const monsterHD = result.monsterHD;
      const savingThrows = MONSTER_SAVING_THROW_LUT[monsterHD];
      await this.actor.updateSavingThrows(savingThrows);
    }
  }

  /**
   *
   * @param {PointerEvent} _event
   * @param {HTMLElement} _target
   */
  static async #treasureLinkDelete(_event, _target) {
    if (game.settings.get("acks", "confirmDeletion") && !(await ACKSDialog.confirmDeletion())) {
      return;
    }
    await this.actor.update({
      "system.details.treasure.table": "",
      "system.details.treasure.type": "",
    });
  }

  /**
   * Current Creature Types as plain objects, safe to change and write back.
   * @return {TCreatureType[]}
   */
  #creatureTypesSource() {
    return this.actor.system.toObject().creatureTypes;
  }

  /**
   * Index of the Creature Type chip that was clicked.
   * @param {HTMLElement} target
   * @return {number}
   */
  static #creatureTypeIndex(target) {
    return Number(target.closest("[data-index]").dataset.index);
  }

  /**
   * Add a Creature Type.
   * @param {PointerEvent} _event
   * @param {HTMLElement} _target
   */
  static async #addCreatureType(_event, _target) {
    const creatureTypes = this.#creatureTypesSource();
    const entry = await ACKSDialog.inputCreatureType({ takenTypes: creatureTypes.map((t) => t.type) });
    if (!entry) return;
    creatureTypes.push(entry);
    await this.actor.update({ "system.creatureTypes": creatureTypes });
  }

  /**
   * Edit the clicked Creature Type.
   * @param {PointerEvent} _event
   * @param {HTMLElement} target
   */
  static async #editCreatureType(_event, target) {
    const index = ACKSMonsterSheetV2.#creatureTypeIndex(target);
    const creatureTypes = this.#creatureTypesSource();
    const current = creatureTypes[index];
    if (!current) return;
    const entry = await ACKSDialog.inputCreatureType({ current, takenTypes: creatureTypes.map((t) => t.type) });
    if (!entry) return;
    creatureTypes[index] = entry;
    await this.actor.update({ "system.creatureTypes": creatureTypes });
  }

  /**
   * Remove the clicked Creature Type.
   * @param {PointerEvent} _event
   * @param {HTMLElement} target
   */
  static async #deleteCreatureType(_event, target) {
    const index = ACKSMonsterSheetV2.#creatureTypeIndex(target);
    const creatureTypes = this.#creatureTypesSource();
    creatureTypes.splice(index, 1);
    await this.actor.update({ "system.creatureTypes": creatureTypes });
  }

  /**
   * Handle a dropped RollTable on the Actor Sheet. By default, dropping a RollTable does nothing,
   * but this can be overridden in subclasses.
   * @param {DragEvent} event The initiating drop event
   * @param {RollTable} rollTable The dropped RollTable document
   * @return {Promise<RollTable|null|undefined>} A Promise resolving to an RollTable identical or related to the dropped RollTable
   * to indicate success, or a nullish value to indicate failure or no action being taken
   * @protected
   * @override
   */
  async _onDropRollTable(event, rollTable) {
    if (!this.actor.isOwner) {
      return null;
    }

    await this.actor.update({ "system.details.treasure.table": rollTable.link });
  }
}

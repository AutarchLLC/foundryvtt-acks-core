import { AcksActor } from "./entity.js";
import { AcksActorSheet } from "./actor-sheet.js";

// Define the Item sheet default options
const __DEFAULT_ITEM_TYPES = [
  { key: "weapon", label: "Weapon" },
  { key: "armor", label: "Armor" },
  { key: "ability", label: "Ability" },
  { key: "item", label: "Item" },
];

/**
 * Extend the basic ActorSheet with some very simple modifications
 */
export class AcksActorSheetMonster extends AcksActorSheet {
  constructor(...args) {
    super(...args);
  }

  /* -------------------------------------------- */

  /**
   * Extend and override the default options used by the 5e Actor Sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["acks", "sheet", "monster", "actor"],
      template: "systems/acks/templates/actors/monster-sheet.html",
      width: 580,
      height: 560,
      resizable: true,
      tabs: [
        {
          navSelector: ".tabs",
          contentSelector: ".sheet-body",
          initial: "attributes",
        },
      ],
    });
  }

  /* -------------------------------------------- */
  /**
   * Monster creation helpers
   */
  async generateSave() {
    let choices = CONFIG.ACKS.monster_saves;

    let templateData = { choices: choices },
      dlg = await renderTemplate("systems/acks/templates/actors/dialogs/monster-saves.html", templateData);
    //Create Dialog window
    new Dialog(
      {
        title: game.i18n.localize("ACKS.dialog.generateSaves"),
        content: dlg,
        buttons: {
          ok: {
            label: game.i18n.localize("ACKS.Ok"),
            icon: '<i class="fas fa-check"></i>',
            callback: (html) => {
              let hd = html.find('select[name="choice"]').val();
              this.actor.generateSave(hd);
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("ACKS.Cancel"),
          },
        },
        default: "ok",
      },
      {
        width: 250,
      },
    ).render(true);
  }

  /* -------------------------------------------- */
  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  async getData() {
    const data = await super.getData();

    // Settings
    data.config.morale = game.settings.get("acks", "morale");
    data.system = this.object.system;
    data.treasureLink = await TextEditor.enrichHTML(this.object.system.details.treasure.table);
    data.biography = await TextEditor.enrichHTML(this.object.system.details.biography);

    data.isNew = this.actor.isNew();
    return data;
  }

  /* -------------------------------------------- */
  async _onDrop(event) {
    super._onDrop(event);
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (data.type !== "RollTable") return;
    } catch (err) {
      return false;
    }

    let link = "";
    if (data.pack) {
      let tableData = game.packs.get(data.pack).index.filter((el) => (el._id = "laDZWR1TIe0MVNZe"));
      link = `@Compendium[${data.pack}.${data.id}]{${tableData[0].name}}`;
    } else {
      link = `@RollTable[${data.id}]`;
    }
    this.actor.update({ "data.details.treasure.table": link });
  }

  /* -------------------------------------------- */
  async _chooseItemType(choices = __DEFAULT_ITEM_TYPES) {
    let templateData = { types: choices },
      dlg = await renderTemplate("systems/acks/templates/items/entity-create.html", templateData);
    //Create Dialog window
    return new Promise((resolve) => {
      new Dialog({
        title: game.i18n.localize("ACKS.dialog.createItem"),
        content: dlg,
        buttons: {
          ok: {
            label: game.i18n.localize("ACKS.Ok"),
            icon: '<i class="fas fa-check"></i>',
            callback: (html) => {
              resolve({
                type: html.find('select[name="type"]').val(),
                name: html.find('input[name="name"]').val(),
              });
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("ACKS.Cancel"),
          },
        },
        default: "ok",
      }).render(true);
    });
  }

  /* -------------------------------------------- */
  async _resetCounters(event) {
    for (const weapon of this.actor.itemTypes["weapon"]) {
      await weapon.update({
        data: {
          counter: {
            value: parseInt(weapon.system.counter.max, 10),
          },
        },
      });
    }
  }

  /* -------------------------------------------- */
  async _onCountChange(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (event.target.dataset.field == "value") {
      return item.update({
        "system.counter.value": parseInt(event.target.value),
      });
    } else if (event.target.dataset.field == "max") {
      return item.update({
        "system.counter.max": parseInt(event.target.value),
      });
    }
  }

  /* -------------------------------------------- */
  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".morale-check a").click((ev) => {
      let actorObject = this.actor;
      actorObject.rollMorale({ event: event });
    });

    html.find(".reaction-check a").click((ev) => {
      let actorObject = this.actor;
      actorObject.rollReaction({ event: event });
    });

    html.find(".appearing-check a").click((ev) => {
      let actorObject = this.actor;
      let check = $(ev.currentTarget).closest(".check-field").data("check");
      actorObject.rollAppearing({ event: event, check: check });
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Update Inventory Item
    html.find(".item-edit").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find(".item-delete").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteEmbeddedDocuments("Item", [li.data("itemId")]);
      li.slideUp(200, () => this.render(false));
    });

    html.find(".item-create").click(async (event) => {
      event.preventDefault();
      const header = event.currentTarget;
      const type = header.dataset.type;
      // item creation helper func
      let createItem = function (type, name = `New ${type.capitalize()}`) {
        const itemData = {
          name: name ?? `New ${type.capitalize()}`,
          type: type,
        };
        return itemData;
      };

      // Getting back to main logic
      if (type == "choice") {
        const choices = __DEFAULT_ITEM_TYPES; //header.dataset.choices.split(",");
        this._chooseItemType(choices).then(async (dialogInput) => {
          const itemData = createItem(dialogInput.type, dialogInput.name);
          console.log("Type: ", dialogInput);
          await this.actor.createEmbeddedDocuments("Item", [itemData]);
        });
        return;
      }
      const itemData = createItem(type);
      await this.actor.createEmbeddedDocuments("Item", [itemData]);
    });

    html.find(".item-reset").click((ev) => {
      this._resetCounters(ev);
    });

    html
      .find(".counter input")
      .click((ev) => ev.target.select())
      .change(this._onCountChange.bind(this));

    html.find(".hp-roll").click((ev) => {
      let actorObject = this.actor;
      actorObject.rollHP({ event: ev });
    });

    html.find(".item-pattern").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      let currentColor = item.system.pattern;
      let colors = Object.keys(CONFIG.ACKS.colors);
      let index = colors.indexOf(currentColor);
      if (index + 1 == colors.length) {
        index = 0;
      } else {
        index++;
      }
      item.update({
        "system.pattern": colors[index],
      });
    });

    html.find('button[data-action="generate-saves"]').click(() => this.generateSave());
  }
}

import { AcksEntityTweaks } from "../dialog/entity-tweaks.js";
import { AcksUtility } from "../utility.js";
import { AcksMortalWoundsDialog } from "../dialog/mortal-wounds.js";
import { AcksTamperingDialog } from "../dialog/tampering-mortality.js";
export class AcksActorSheet extends ActorSheet {
  /* -------------------------------------------- */
  async getData() {
    const data = super.getData();

    data.config = CONFIG.ACKS;
    // Settings
    data.config.ascendingAC = game.settings.get("acks", "ascendingAC");
    data.config.encumbrance = game.settings.get("acks", "encumbranceOption");
    data.effects = await AcksUtility.prepareActiveEffectCategories(this.actor.allApplicableEffects());
    data.system = this.actor.system;
    data.isGM = game.user.isGM;

    // Prepare owned items
    this._prepareItems(data);
    data.henchmen = this.actor.getHenchmen();
    data.languages = this.actor.getLanguages();
    data.description = await TextEditor.enrichHTML(this.object.system.details.description, { async: true });
    data.notes = await TextEditor.enrichHTML(this.object.system.details.notes, { async: true });
    data.totalWages = this.actor.getTotalWages();
    data.totalMoneyGC = this.actor.getTotalMoneyGC();
    data.moneyEncumbrance = this.actor.getTotalMoneyEncumbrance();
    data.managerName = this.actor.getManagerName();

    console.log("Actor sheet", data);
    return data;
  }

  /* -------------------------------------------- */
  activateEditor(target, editorOptions, initialContent) {
    // remove some controls to the editor as the space is lacking
    if (target == "system.details.description") {
      editorOptions.toolbar = "styleselect bullist hr table removeFormat save";
    }
    super.activateEditor(target, editorOptions, initialContent);
  }

  /* -------------------------------------------- */
  async _onDrop(event) {
    let data = event.dataTransfer.getData("text/plain");
    if (data) {
      let dataItem = JSON.parse(data);
      let actorId = dataItem.uuid.split(".")[1];
      if (dataItem.uuid.includes("Actor") && !dataItem.uuid.includes("Item") && actorId && actorId != this.actor.id) {
        this.actor.addHenchman(actorId);
        return;
      }
    }
    super._onDrop(event);
  }

  /* -------------------------------------------- */
  /**
   * Organize and classify Owned Items for Character sheets
   * @private
   */
  _prepareItems(data) {
    // Partition items by category
    let [items, weapons, armors, abilities, spells, languages, money] = data.items.reduce(
      (arr, item) => {
        // Classify items into types
        if (item.type === "item") arr[0].push(item);
        else if (item.type === "weapon") arr[1].push(item);
        else if (item.type === "armor") arr[2].push(item);
        else if (item.type === "ability") arr[3].push(item);
        else if (item.type === "spell") arr[4].push(item);
        else if (item.type === "language") arr[5].push(item);
        else if (item.type === "money") arr[6].push(item);
        return arr;
      },
      [[], [], [], [], [], [], []],
    );

    // Sort spells by level
    let sortedSpells = {};
    let slots = {};
    for (let spell of spells) {
      let lvl = spell.system.lvl;
      if (!sortedSpells[lvl]) {
        sortedSpells[lvl] = [];
      }
      if (!slots[lvl]) {
        slots[lvl] = 0;
      }
      slots[lvl] += spell.system.cast;
      sortedSpells[lvl].push(spell);
    }
    data.slots = {
      used: slots,
    };
    // Sort money according to the 'coppervalue' field
    money.sort((a, b) => b.system.coppervalue - a.system.coppervalue);
    // Compute total money value
    for (let m of money) {
      let valuegp = (m.system.coppervalue * (m.system.quantity + m.system.quantitybank)) / 100;
      m.system.totalvalue = valuegp;
    }

    // Assign and return
    data.owned = {
      items: items,
      weapons: weapons,
      armors: armors,
      money: money,
    };
    data.abilities = abilities;
    data.spells = sortedSpells;
    data.languages = languages;

    data.favorites = this.actor.getFavorites();
  }

  /* -------------------------------------------- */
  async _onItemSummary(event) {
    event.preventDefault();
    let li = $(event.currentTarget).parents(".item"),
      item = this.actor.items.get(li.data("item-id")),
      description = await TextEditor.enrichHTML(item.system.description, { async: true });
    // Toggle summary
    if (li.hasClass("expanded")) {
      let summary = li.parents(".item-entry").children(".item-summary");
      summary.slideUp(200, () => summary.remove());
    } else {
      // Add item tags
      let div = $(
        `<div class="item-summary"><ol class="tag-list">${item.getTags()}</ol><div>${description}</div></div>`,
      );
      li.parents(".item-entry").append(div.hide());
      div.slideDown(200);
    }
    li.toggleClass("expanded");
  }

  /* -------------------------------------------- */
  async _onSpellChange(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (event.target.dataset.field == "cast") {
      return item.update({ "system.cast": parseInt(event.target.value) });
    } else if (event.target.dataset.field == "memorize") {
      return item.update({
        "system.memorized": parseInt(event.target.value),
      });
    }
  }

  /* -------------------------------------------- */
  async _resetSpells(event) {
    let spells = $(event.currentTarget).closest(".inventory.spells").find(".item");
    spells.each((_, el) => {
      let itemId = el.dataset.itemId;
      const item = this.actor.items.get(itemId);
      item.update({
        _id: item.id,
        "system.cast": 0,
        "system.memorized": 0,
      });
    });
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

    // Item summaries
    html.find(".item .item-name h4").click((event) => this._onItemSummary(event));

    html.on("click", ".effect-control", (ev) => {
      const row = ev.currentTarget.closest("li");
      const document = row.dataset.parentId === this.actor.id ? this.actor : this.actor.items.get(row.dataset.parentId);
      AcksUtility.onManageActiveEffect(ev, document);
    });

    html.find(".mortal-wound-dialog").click((ev) => {
      let actorObject = this.actor;
      let dialog = new AcksMortalWoundsDialog();
      dialog.init(actorObject);
    });

    html.find(".tampering-dialog").click((ev) => {
      let actorObject = this.actor;
      let dialog = new AcksTamperingDialog();
      dialog.init(actorObject);
    });

    html.find(".item .item-controls .item-show").click(async (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.show();
    });

    html.find(".saving-throw .attribute-name a").click((ev) => {
      let actorObject = this.actor;
      let element = ev.currentTarget;
      let save = element.parentElement.parentElement.dataset.save;
      actorObject.rollSave(save, { event: ev });
    });

    html.find(".item .item-rollable .item-image").click(async (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));

      let skip = false;
      let skipKey = game.settings.get("acks", "skip-dialog-key");
      if (ev && ev[skipKey]) {
        skip = true;
      }

      if (item.type == "weapon") {
        if (this.actor.type === "monster") {
          item.update({ "system.counter.value": item.system.counter.value - 1 });
        }
        item.rollWeapon({ skipDialog: skip });
      } else if (item.type == "spell") {
        item.spendSpell({ skipDialog: skip });
      } else {
        item.rollFormula({ skipDialog: skip });
      }
    });

    html.find(".favorite-rollable").click(async (ev) => {
      const li = $(ev.currentTarget);
      const item = this.actor.items.get(li.data("itemId"));

      let skip = false;
      let skipKey = game.settings.get("acks", "skip-dialog-key");
      if (ev && ev[skipKey]) {
        skip = true;
      }

      if (item.type == "weapon") {
        if (this.actor.type === "monster") {
          item.update({ "system.counter.value": item.system.counter.value - 1 });
        }
        item.rollWeapon({ skipDialog: skip });
      } else if (item.type == "spell") {
        item.spendSpell({ skipDialog: skip });
      } else {
        item.rollFormula({ skipDialog: skip });
      }
    });

    html
      .find(".memorize input")
      .click((ev) => ev.target.select())
      .change(this._onSpellChange.bind(this));

    html.find(".attack a").click((ev) => {
      let actorObject = this.actor;
      let element = ev.currentTarget;
      let attack = element.parentElement.parentElement.dataset.attack;
      const rollData = {
        actor: this.data,
        roll: {},
      };

      let skip = false;
      let skipKey = game.settings.get("acks", "skip-dialog-key");
      if (ev[skipKey]) {
        skip = true;
      }

      actorObject.targetAttack(rollData, attack, {
        type: attack,
        skipDialog: skip,
      });

      html.find(".spells .item-reset").click((ev) => {
        this._resetSpells(ev);
      });
    });

    html.find(".hit-dice ").click((ev) => {
      let actorObject = this.actor;
      actorObject.rollHitDice({ event: ev });
    });

    html.find(".bhr .attribute-name a").click((ev) => {
      let actorObject = this.actor;
      actorObject.rollBHR({ event: ev });
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    html
      .find(".memorize input")
      .click((ev) => ev.target.select())
      .change(this._onSpellChange.bind(this));

    html.find(".spells .item-reset").click((ev) => {
      this._resetSpells(ev);
    });
  }

  // Override to set resizable initial size
  async _renderInner(...args) {
    const html = await super._renderInner(...args);
    this.form = html[0];

    // Resize resizable classes
    let resizable = html.find(".resizable");
    if (resizable.length == 0) {
      return;
    }
    resizable.each((_, el) => {
      let heightDelta = this.position.height - this.options.height;
      el.style.height = `${heightDelta + parseInt(el.dataset.baseSize)}px`;
    });
    return html;
  }

  async _onResize(event) {
    super._onResize(event);

    let html = $(this.form);
    let resizable = html.find(".resizable");
    if (resizable.length == 0) {
      return;
    }
    // Resize divs
    resizable.each((_, el) => {
      let heightDelta = this.position.height - this.options.height;
      el.style.height = `${heightDelta + parseInt(el.dataset.baseSize)}px`;
    });
    // Resize editors
    let editors = html.find(".editor");
    editors.each((id, editor) => {
      let container = editor.closest(".resizable-editor");
      if (container) {
        let heightDelta = this.position.height - this.options.height;
        editor.style.height = `${heightDelta + parseInt(container.dataset.editorSize)}px`;
      }
    });
  }

  _onConfigureActor(event) {
    event.preventDefault();
    new AcksEntityTweaks(this.actor, {
      top: this.position.top + 40,
      left: this.position.left + (this.position.width - 400) / 2,
    }).render(true);
  }

  /**
   * Extend and override the sheet header buttons
   * @override
   */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();

    // Token Configuration
    const canConfigure = game.user.isGM || this.actor.isOwner;
    if (this.options.editable && canConfigure) {
      buttons = [
        {
          label: game.i18n.localize("ACKS.dialog.tweaks"),
          class: "configure-actor",
          icon: "fas fa-code",
          onclick: (ev) => this._onConfigureActor(ev),
        },
      ].concat(buttons);
    }
    return buttons;
  }
}

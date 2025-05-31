export class AcksPartySheet extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["acks", "dialog", "party-sheet"],
      template: "systems/acks/templates/apps/party-sheet.hbs",
      width: 500,
      height: 400,
      resizable: true,
    });
  }

  /* -------------------------------------------- */

  /**
   * Add the Entity name into the window title
   * @type {String}
   */
  get title() {
    return game.i18n.localize("ACKS.dialog.partysheet");
  }

  /* -------------------------------------------- */

  /**
   * Construct and return the data object used to render the HTML template for this form application.
   * @return {Object}
   */
  getData() {
    return {
      data: game.actors.contents,
      config: CONFIG.ACKS,
      user: game.user,
    };
  }

  /* -------------------------------------------- */
  onDrop(event) {
    event.preventDefault();
    // WIP Drop Items
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (data.type !== "Item") return;
    } catch (err) {
      return false;
    }
  }
  /* -------------------------------------------- */

  _dealXP(ev) {
    // Grab experience
    const template = `
      <form>
        <div class="form-group">
          <label>Amount</label>
          <input name="total" placeholder="0" type="text"/>
        </div>
      </form>
    `;

    let pcs = game.actors.contents.filter((actor) => {
      return actor.getFlag("acks", "party") && actor.type === "character";
    });

    new Dialog({
      title: "Deal Experience",
      content: template,
      buttons: {
        set: {
          icon: '<i class="fas fa-hand"></i>',
          label: game.i18n.localize("ACKS.dialog.dealXP"),
          callback: (html) => {
            let toDeal = html.find('input[name="total"]').val();
            // calculate number of shares
            let shares = 0;
            pcs.forEach((c) => {
              shares += c.system.details.xp.share;
            });
            const value = parseFloat(toDeal) / shares;
            if (value) {
              // Give experience
              pcs.forEach((c) => {
                c.getExperience(Math.floor(c.system.details.xp.share * value));
              });
            }
          },
        },
      },
    }).render(true);
  }

  /* -------------------------------------------- */
  async _selectActors(event) {
    event.preventDefault();

    const template = "systems/acks/templates/apps/party-select.html";
    const templateData = {
      actors: game.actors.contents,
    };
    const content = await renderTemplate(template, templateData);
    new Dialog(
      {
        title: "Select Party Characters",
        content: content,
        buttons: {
          set: {
            icon: '<i class="fas fa-save"></i>',
            label: game.i18n.localize("ACKS.Update"),
            callback: (html) => {
              const checks = html.find("input[data-action='select-actor']");
              checks.each(async (_, c) => {
                const actorId = c.dataset.actorId;
                const actor = game.actors.contents.find((actor) => actor.id === actorId);
                if (actor) {
                  await actor.setFlag("acks", "party", c.checked);
                } else {
                  ui.notifications.error(`Something went wrong. Can't find ${actor.name}.`);
                }
              });
            },
          },
        },
      },
      { height: "auto", width: 220 },
    ).render(true);
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".item-controls .item-control .select-actors").click(this._selectActors.bind(this));

    html.find(".item-controls .item-control .deal-xp").click(this._dealXP.bind(this));

    html.find("a.resync").click(() => this.render(true));

    html.find(".field-img button[data-action='open-sheet']").click((ev) => {
      let actorId = ev.currentTarget.parentElement.parentElement.parentElement.dataset.actorId;
      game.actors.get(actorId).sheet.render(true);
    });
  }
}

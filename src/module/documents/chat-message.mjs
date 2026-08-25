/* global canvas, ChatMessage, foundry, game, ui */
export default class ACKSChatMessage extends ChatMessage {
  /**
   * Render the HTML for the ChatMessage which should be added to the log
   * @override
   * @param {object} [options]             Additional options passed to the Handlebars template.
   * @returns {Promise<HTMLElement>}
   */
  async renderHTML(options = {}) {
    const html = await super.renderHTML(options);

    const itemName = html.querySelector(".item-name");
    if (itemName) {
      itemName.addEventListener("click", (e) => this.#onChatCardToggleContent(e));
    }

    const buttons = html.querySelectorAll(".card-buttons > button");
    for (const button of buttons) {
      button.addEventListener("click", (e) => this.#onChatCardAction(e));
    }

    return html;
  }

  /**
   * Handle toggling the visibility of chat card content when the name is clicked
   * @param {Event} e   The originating click event
   * @private
   */
  #onChatCardToggleContent(e) {
    e.preventDefault();
    const header = e.target;
    const card = header.closest(".chat-card");
    const content = card.querySelector(".card-content");

    if (content.classList.contains("expanded")) {
      content.classList.remove("expanded");
    } else {
      content.classList.add("expanded");
    }
  }

  async #onChatCardAction(e) {
    e.preventDefault();

    // Extract card data
    const button = e.target;
    button.disabled = true;
    const card = button.closest(".chat-card");
    const messageId = card.closest(".message").dataset.messageId;
    const message = game.messages.get(messageId);
    const action = button.dataset.action;

    // Validate permission to proceed with the roll
    const isTargeted = action === "save";
    if (!(isTargeted || game.user.isGM || message.isAuthor)) {
      ui.notifications.warn(`You do not have permission to use this feature for the selected chat card.`);
      return;
    }
    // Get the Actor from a synthetic Token
    const actor = this.#getChatCardActor(card);
    if (!actor) {
      ui.notifications.warn("Unable to get the actor");
      return;
    }
    // Get the Item
    const item = actor.items.get(card.dataset.itemId);
    if (!item) {
      return ui.notifications.error(
        `The requested item ${card.dataset.itemId} no longer exists on Actor ${actor.name}`,
      );
    }

    // Get card targets
    let targets = [];
    if (isTargeted) {
      targets = this.#getChatCardTargets(card);
    }

    // Attack and Damage Rolls
    if (action === "damage") {
      await item.rollDamage({ event: e });
    } else if (action === "formula") {
      await item.rollFormula({ event: e });
    }
    // Saving Throws for card targets
    else if (action === "save") {
      if (!targets.length) {
        ui.notifications.warn(`You must have one or more controlled Tokens in order to use this option.`);
        return (button.disabled = false);
      }
      for (const t of targets) {
        await t.rollSave(button.dataset.save, { event: e });
      }
    }

    // Re-enable the button
    button.disabled = false;
  }

  #getChatCardActor(card) {
    // Case 1 - a synthetic actor from a Token
    const tokenKey = card.dataset.tokenId;
    if (tokenKey) {
      const [sceneId, tokenId] = tokenKey.split(".");
      const scene = game.scenes.get(sceneId);
      if (!scene) {
        return null;
      }
      const tokenData = scene.tokens.get(tokenId);
      if (!tokenData) {
        return null;
      }
      const token = new foundry.canvas.placeables.Token(tokenData);
      return token.actor;
    }

    // Case 2 - use Actor ID directory
    const actorId = card.dataset.actorId;
    return game.actors.get(actorId) || null;
  }

  #getChatCardTargets(_card) {
    const character = game.user.character;
    const controlled = canvas.tokens.controlled;
    const targets = controlled.reduce((arr, t) => (t.actor ? arr.concat([t.actor]) : arr), []);
    if (character && controlled.length === 0) {
      targets.push(character);
    }
    return targets;
  }
}

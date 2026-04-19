/* global game, canvas */

/**
 * A hook event that fires for each ChatMessage which is rendered for addition to the ChatLog.
 * This hook allows for final customization of the message HTML before it is added to the log.
 * @param message {ChatMessage} The ChatMessage document being rendered.
 * @param html {HTMLElement} The pending HTML
 * @param context {object} The rendering context.
 * @return {Promise<void>}
 */
export const addChatMessageButtons = async function (message, html, context) {
  // Hide blind rolls
  const blindableEl = html.querySelector(".blindable");
  if (message.blind && !game.user.isGM && blindableEl?.dataset.blind === "true") {
    blindableEl.outerHTML =
      "<div class='dice-roll'><div class='dice-result'><div class='dice-formula'>???</div></div></div>";
  }

  // Buttons
  const rollEl = html.querySelector(".damage-roll");
  if (rollEl) {
    const applyDamageDiv = document.createElement("div");
    applyDamageDiv.classList.add("dice-damage");

    const applyDamageBtn = document.createElement("button");
    applyDamageBtn.type = "button";
    applyDamageBtn.dataset.action = "apply-damage";

    const applyDamageIcon = document.createElement("i");
    applyDamageIcon.classList.add("fas", "fa-tint");

    applyDamageBtn.appendChild(applyDamageIcon);
    applyDamageDiv.appendChild(applyDamageBtn);

    rollEl.appendChild(applyDamageDiv);

    applyDamageBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      applyChatCardDamageV2(rollEl, 1);
    });
  }
};

/**
 * Apply rolled dice damage to the token or tokens which are currently controlled.
 * @param {HTMLElement} rollEl The chat entry which contains the roll data
 * @param {number} multiplier A damage multiplier to apply to the rolled damage.
 * @return {Promise}
 */
function applyChatCardDamageV2(rollEl, multiplier) {
  const totalEl = rollEl.querySelector(".dice-total");
  const amount = parseInt(totalEl.textContent);

  return Promise.all(
    canvas.tokens.controlled.map((token) => {
      const actor = token.actor;
      return actor.applyDamage(amount, multiplier);
    }),
  );
}

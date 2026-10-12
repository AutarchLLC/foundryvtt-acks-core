/* global foundry, game */

/**
 * Show the welcome message dialog to the user.
 * @return {Promise<*>}
 */
export default async function showWelcomeMessage() {
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/acks/templates/dialog/welcome-message.hbs",
    {
      version: game.system.version,
    },
  );
  return foundry.applications.api.DialogV2.prompt({
    window: { title: "ACKS.Welcome.Title" },
    position: { width: 600 },
    content,
  });
}

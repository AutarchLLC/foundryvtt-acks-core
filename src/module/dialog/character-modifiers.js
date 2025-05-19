// eslint-disable-next-line no-unused-vars
export class AcksCharacterModifiers extends FormApplication {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes = ["acks", "dialog", "modifiers"];
    options.id = "sheet-modifiers";
    options.template = "systems/acks/templates/actors/dialogs/modifiers-dialog.html";
    options.width = 240;
    return options;
  }

  /* -------------------------------------------- */

  /**
   * Add the Entity name into the window title
   * @type {String}
   */
  get title() {
    return `${this.object.name}: Modifiers`;
  }

  /* -------------------------------------------- */

  /**
   * Construct and return the data object used to render the HTML template for this form application.
   * @return {Object}
   */
  getData() {
    const data = this.object;

    data.user = game.user;
    console.log("MODIFIERS", data);
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
  }
}

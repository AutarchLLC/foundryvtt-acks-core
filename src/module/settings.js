export const registerMainSettings = async () => {
  game.settings.register("acks", "enable-combatant-color", {
    name: game.i18n.localize("ACKS.Setting.enableCombatantColor"),
    hint: game.i18n.localize("ACKS.Setting.enableCombatantColorHint"),
    default: true,
    scope: "world",
    type: Boolean,
    config: true,
    onChange: (_) => window.location.reload(),
  });

  game.settings.register("acks", "welcome-message-12-2", {
    name: "welcome-message-12-2",
    default: false,
    scope: "world",
    type: Boolean,
    config: false,
  });
  game.settings.register("acks", "welcome-message-13-0", {
    name: "welcome-message-13-0",
    default: false,
    scope: "world",
    type: Boolean,
    config: false,
  });

  game.settings.register("acks", "skip-dialog-key", {
    name: "Key used to skip roll dialog ",
    hint: "When pressed while clicking on a rollable item, the dialog will be skipped and the roll will be made with the default options",
    default: "shiftKey",
    scope: "world",
    type: String,
    choices: { ctrlKey: "Ctrl", shiftKey: "Shift", altKey: "Alt" },
    config: true,
  });

  await game.settings.register("acks", "color-friendlies", {
    name: game.i18n.localize("ACKS.Setting.colorFriendlies"), // The name of the setting in the settings menu
    hint: game.i18n.localize("ACKS.Setting.colorFriendlies"), // A description of the registered setting and its behavior
    scope: "world", // "world" = sync to db, "client" = local storage
    config: true, // false if you dont want it to show in module config
    type: String, // Number, Boolean, String,
    requiresReload: true,
    default: "#afc2ee",
    onChange: (value) => {
      console.log(value);
    },
  });

  Hooks.on("renderSettingsConfig", (app, el, data) => {
    let col = game.settings.get("acks", "color-friendlies");
    el.find('[name="acks.color-friendlies"]')
      .parent()
      .append(`<input type="color" value="${col}" data-edit="acks.color-friendlies">`);
  });

  await game.settings.register("acks", "color-hostiles", {
    name: game.i18n.localize("ACKS.Setting.colorHostiles"), // The name of the setting in the settings menu
    hint: game.i18n.localize("ACKS.Setting.colorHostiles"), // A description of the registered setting and its behavior
    scope: "world", // "world" = sync to db, "client" = local storage
    config: true, // false if you dont want it to show in module config
    type: String, // Number, Boolean, String,
    requiresReload: true,
    default: "#eb7272",
    onChange: (value) => {
      console.log(value);
    },
  });
  Hooks.on("renderSettingsConfig", (app, el, data) => {
    let col = game.settings.get("acks", "color-hostiles");
    el.find('[name="acks.color-hostiles"]')
      .parent()
      .append(`<input type="color" value="${col}" data-edit="acks.color-hostiles">`);
  });

  /*game.settings.register("acks", "initiative", {
      name: game.i18n.localize("ACKS.Setting.Initiative"),
      hint: game.i18n.localize("ACKS.Setting.InitiativeHint"),
      default: "individual",
      scope: "world",
      type: String,
      config: true,
      choices: {
        individual: "ACKS.Setting.InitiativeIndividual",
        group: "ACKS.Setting.InitiativeGroup",
      },
    });
  */
  game.settings.register("acks", "initiativePersistence", {
    name: game.i18n.localize("ACKS.Setting.RerollInitiative"),
    hint: game.i18n.localize("ACKS.Setting.RerollInitiativeHint"),
    default: "reset",
    scope: "world",
    type: String,
    config: true,
    choices: {
      keep: "ACKS.Setting.InitiativeKeep",
      reset: "ACKS.Setting.InitiativeReset",
      reroll: "ACKS.Setting.InitiativeReroll",
    },
  });

  game.settings.register("acks", "ascendingAC", {
    name: game.i18n.localize("ACKS.Setting.AscendingAC"),
    hint: game.i18n.localize("ACKS.Setting.AscendingACHint"),
    default: true,
    scope: "world",
    type: Boolean,
    config: false,
    onChange: (_) => window.location.reload(),
  });

  game.settings.register("acks", "encumbranceOption", {
    name: game.i18n.localize("ACKS.Setting.Encumbrance"),
    hint: game.i18n.localize("ACKS.Setting.EncumbranceHint"),
    default: "detailed",
    scope: "world",
    type: String,
    config: true,
    choices: {
      detailed: "ACKS.Setting.EncumbranceDetailed",
      complete: "ACKS.Setting.EncumbranceComplete",
    },
    onChange: (_) => window.location.reload(),
  });

  game.settings.register("acks", "morale", {
    name: game.i18n.localize("ACKS.Setting.Morale"),
    hint: game.i18n.localize("ACKS.Setting.MoraleHint"),
    default: true,
    scope: "world",
    type: Boolean,
    config: true,
  });

  game.settings.register("acks", "removeMagicBonus", {
    name: game.i18n.localize("ACKS.Setting.RemoveMagicBonus"),
    hint: game.i18n.localize("ACKS.Setting.RemoveMagicBonusHint"),
    default: false,
    scope: "world",
    type: Boolean,
    config: true,
    onChange: (_) => window.location.reload(),
  });

  game.settings.register("acks", "exploding20s", {
    name: game.i18n.localize("ACKS.Setting.Explode20"),
    hint: game.i18n.localize("ACKS.Setting.Explode20Hint"),
    default: false,
    scope: "world",
    type: Boolean,
    config: true,
    onChange: (_) => window.location.reload(),
  });

  game.settings.register("acks", "bhr", {
    name: game.i18n.localize("ACKS.Setting.BHR"),
    hint: game.i18n.localize("ACKS.Setting.BHRHint"),
    default: false,
    scope: "world",
    type: Boolean,
    config: true,
    onChange: (_) => window.location.reload(),
  });
};

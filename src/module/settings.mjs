/* global game, foundry */
export const registerMainSettings = async () => {
  game.settings.register("acks", "enable-combatant-color", {
    name: game.i18n.localize("ACKS.Setting.enableCombatantColor"),
    hint: game.i18n.localize("ACKS.Setting.enableCombatantColorHint"),
    default: true,
    scope: "world",
    type: Boolean,
    config: true,
    requiresReload: true,
  });

  game.settings.register("acks", "welcomeMessageVersion", {
    name: "Last system version welcome message was shown for",
    scope: "world",
    type: String,
    config: false,
    default: "",
  });

  game.settings.register("acks", "skip-dialog-key", {
    name: "Key used to skip roll dialog ",
    hint: "When pressed while clicking on a rollable item, the dialog will be skipped and the roll will be made with the default options",
    default: "shiftKey",
    scope: "world",
    type: String,
    choices: { ctrlKey: "Ctrl", shiftKey: "Shift", altKey: "Alt" },
    config: true,
    requiresReload: false,
  });

  game.settings.register("acks", "color-friendlies", {
    name: game.i18n.localize("ACKS.Setting.colorFriendlies"), // The name of the setting in the settings menu
    hint: game.i18n.localize("ACKS.Setting.colorFriendlies"), // A description of the registered setting and its behavior
    scope: "world", // "world" = sync to db, "client" = local storage
    config: true, // false if you dont want it to show in module config
    type: new foundry.data.fields.ColorField(), // Foundry will render corresponding controls itself
    requiresReload: true,
    default: "#afc2ee",
  });

  game.settings.register("acks", "color-hostiles", {
    name: game.i18n.localize("ACKS.Setting.colorHostiles"), // The name of the setting in the settings menu
    hint: game.i18n.localize("ACKS.Setting.colorHostiles"), // A description of the registered setting and its behavior
    scope: "world", // "world" = sync to db, "client" = local storage
    config: true, // false if you don't want it to show in module config
    type: new foundry.data.fields.ColorField(), // Foundry will render corresponding controls itself
    requiresReload: true,
    default: "#eb7272",
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
    requiresReload: false,
  });

  // TODO: separate exploding 20s and Critical Hits Custom Rules
  game.settings.register("acks", "exploding20s", {
    name: game.i18n.localize("ACKS.Setting.Explode20"),
    hint: game.i18n.localize("ACKS.Setting.Explode20Hint"),
    default: false,
    scope: "world",
    type: Boolean,
    requiresReload: false,
    config: true,
  });

  game.settings.register("acks", "bhr", {
    name: game.i18n.localize("ACKS.Setting.BHR"),
    hint: game.i18n.localize("ACKS.Setting.BHRHint"),
    default: false,
    scope: "world",
    type: Boolean,
    config: true,
    requiresReload: true,
  });

  game.settings.register("acks", "autoRollMonsterHP", {
    name: "ACKS.Setting.AutoRollMonsterHP.Name",
    hint: "ACKS.Setting.AutoRollMonsterHP.Hint",
    type: Boolean,
    default: true,
    scope: "world",
    config: true,
    requiresReload: false,
  });

  game.settings.register("acks", "confirmDeletion", {
    name: "ACKS.Setting.ConfirmDeletion.Name",
    hint: "ACKS.Setting.ConfirmDeletion.Hint",
    type: Boolean,
    default: false,
    scope: "world",
    config: true,
    requiresReload: false,
  });
};

/* global foundry, game */
import { DEFAULT_MONSTER_ITEM_OPTIONS, MONSTER_SAVES_OPTIONS } from "../constants.mjs";

export default class ACKSDialog {
  /**
   *
   * @param typeOptions
   * @return {Promise<any>}
   */
  static async chooseItemNameAndType(typeOptions = DEFAULT_MONSTER_ITEM_OPTIONS) {
    const nameTextInput = foundry.applications.fields.createTextInput({
      name: "itemName",
      placeholder: "New Item",
      required: true,
      autofocus: true,
    });
    const nameTextGroup = foundry.applications.fields.createFormGroup({
      input: nameTextInput,
      label: "ACKS.dialog.itemName",
      localize: true,
    });

    const typeSelectInput = foundry.applications.fields.createSelectInput({
      name: "itemType",
      options: typeOptions,
      required: true,
      localize: true,
    });
    const typeSelectGroup = foundry.applications.fields.createFormGroup({
      input: typeSelectInput,
      label: "ACKS.dialog.itemType",
      localize: true,
    });

    const content = `${nameTextGroup.outerHTML}${typeSelectGroup.outerHTML}`;

    return foundry.applications.api.DialogV2.input({
      window: { title: "ACKS.dialog.createItem" },
      content,
    });
  }

  /**
   *
   * @return {Promise<any>}
   */
  static async chooseMonsterHitDice() {
    const monsterHDSelectInput = foundry.applications.fields.createSelectInput({
      name: "monsterHD",
      options: MONSTER_SAVES_OPTIONS,
      required: true,
      localize: false,
    });
    const monsterHDSelectGroup = foundry.applications.fields.createFormGroup({
      input: monsterHDSelectInput,
      label: "ACKS.HitDice",
      localize: true,
    });

    const content = `${monsterHDSelectGroup.outerHTML}`;

    return foundry.applications.api.DialogV2.input({
      window: { title: "ACKS.dialog.generateSaves" },
      content,
    });
  }

  /**
   *
   * @param combatants
   * @param individualMods
   * @return {Promise<any>}
   */
  static async inputIndividualSurpriseModifiers(combatants, individualMods = {}) {
    const contentParts = [];
    for (const combatant of combatants) {
      const modifierInput = foundry.applications.fields.createNumberInput({
        name: `${combatant.actor.uuid}`,
        placeholder: "0",
        dataset: {
          dtype: "Number",
        },
        step: 1,
        value: individualMods[combatant.actor.uuid] ?? 0,
      });
      const modifierFormGroup = foundry.applications.fields.createFormGroup({
        input: modifierInput,
        label: `${combatant.actor.name}`,
      });

      contentParts.push(modifierFormGroup.outerHTML);
    }

    return foundry.applications.api.DialogV2.input({
      classes: ["acks2", "scrollable-dialog-form"],
      window: {
        title: "ACKS.surprise.actormodifier",
        resizable: false,
      },
      position: {
        width: 600,
        height: "auto",
      },
      content: contentParts.join(""),
    });
  }

  /**
   *
   * @param param0
   * @param param0.title
   * @param param0.dialogData
   * @return {Promise<any>}
   */
  static async getRollDetails({ title = "", dialogData }) {
    const contentParts = [];

    // details text if present
    if (dialogData?.data?.details) {
      const detailsDiv = document.createElement("div");
      detailsDiv.textContent = dialogData.data.details;
      detailsDiv.classList.add("roll-details");
      contentParts.push(detailsDiv.outerHTML);
    }

    // formula text input
    const formulaInput = foundry.applications.fields.createTextInput({
      name: "formula",
      disabled: true,
      value: dialogData?.formula ?? "",
    });
    const formulaFormGroup = foundry.applications.fields.createFormGroup({
      input: formulaInput,
      label: "ACKS.Formula",
      localize: true,
    });
    contentParts.push(formulaFormGroup.outerHTML);

    // situational modifier input
    const bonusInput = foundry.applications.fields.createTextInput({
      name: "bonus",
      placeholder: game.i18n.localize("ACKS.RollExample"),
    });
    const bonusFormGroup = foundry.applications.fields.createFormGroup({
      input: bonusInput,
      label: "ACKS.SitMod",
      localize: true,
    });
    contentParts.push(bonusFormGroup.outerHTML);

    // roll mode select
    const rollModeOptions = Object.entries(dialogData.rollModes).map(([key, value]) => ({
      value: key,
      label: value.label,
    }));
    const rollModeSelect = foundry.applications.fields.createSelectInput({
      name: "rollMode",
      options: rollModeOptions,
      value: dialogData.rollMode,
      localize: true,
    });
    const rollModeSelectGroup = foundry.applications.fields.createFormGroup({
      input: rollModeSelect,
      label: "ACKS.RollMode",
      localize: true,
    });
    contentParts.push(rollModeSelectGroup.outerHTML);

    return foundry.applications.api.DialogV2.input({
      window: { title },
      content: contentParts.join(""),
      position: { width: 420 },
      ok: {
        label: "ACKS.Roll",
        icon: "fas fa-dice-d20",
      },
    });
  }

  /**
   *
   * @param {AcksActor} actor
   * @param rollData
   * @param options
   */
  static showAttackRangeSelector(actor, rollData, options = {}) {
    new foundry.applications.api.DialogV2({
      window: {
        title: "Choose Attack Range", // TODO: localize
      },
      buttons: [
        {
          action: "melee",
          default: true,
          icon: "fas fa-fist-raised",
          label: "Melee", // TODO: localize
          callback: () => {
            void actor.targetAttack(rollData, "melee", options);
          },
        },
        {
          action: "missile",
          icon: "fas fa-bullseye",
          label: "Missile", // TODO: localize
          callback: () => {
            void actor.targetAttack(rollData, "missile", options);
          },
        },
      ],
    }).render({ force: true });
  }

  /**
   *
   * @param title
   * @param message
   * @return {Promise<any>}
   */
  static async confirm(title, message) {
    return foundry.applications.api.DialogV2.confirm({
      window: {
        title,
      },
      content: message,
    });
  }

  static async inputXPAmount() {
    const xpInput = foundry.applications.fields.createNumberInput({
      name: `total`,
      placeholder: "0",
      dataset: {
        dtype: "Number",
      },
      step: 1,
    });
    const xpFormGroup = foundry.applications.fields.createFormGroup({
      input: xpInput,
      label: `Amount`, // TODO: localize
    });

    return foundry.applications.api.DialogV2.input({
      window: { title: "Deal Experience" }, // TODO: localize
      content: xpFormGroup.outerHTML,
      ok: {
        label: "ACKS.dialog.dealXP",
        icon: "fas fa-hand",
      },
    });
  }

  static async showWelcomeMessage() {
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

  static async confirmCombatActionDeclaration() {
    return foundry.applications.api.DialogV2.confirm({
      window: {
        title: "Actions declaration", // TODO: localize
      },
      content:
        "<p>Start of Round 1. About to roll Initiative.</p><p>Ask players to declare any actions for this round.</p>", // TODO: localize
      yes: {
        label: "Action declared, start rolling Initiative", // TODO: localize
        icon: "fas fa-check",
      },
      no: {
        label: "Cancel", // TODO: localize
        icon: "fas fa-times",
      },
    });
  }
}

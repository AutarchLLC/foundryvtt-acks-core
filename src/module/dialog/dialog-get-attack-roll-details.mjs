/* global foundry, game */

export default async function getAttackRollDetails({ title = "", dialogData }) {
  const content = document.createElement("div");

  // details text if present
  if (dialogData?.data?.details) {
    const detailsDiv = document.createElement("div");
    detailsDiv.textContent = dialogData.data.details;
    detailsDiv.classList.add("roll-details");
    content.appendChild(detailsDiv);
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
  content.appendChild(formulaFormGroup);

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
  content.appendChild(bonusFormGroup);

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
  content.appendChild(rollModeSelectGroup);

  return foundry.applications.api.DialogV2.wait({
    window: { title },
    classes: ["acksii", "attack-dialog"],
    content,
    position: { width: 420 },
    buttons: [
      {
        action: "onehanded",
        default: true,
        label: "1H",
        tooltip: "One-Handed",
        icon: "fas fa-sword",
        callback: (_event, button) => ({
          ...new foundry.applications.ux.FormDataExtended(button.form).object,
          act: "onehanded",
        }),
      },
      {
        action: "twohanded",
        default: true,
        label: "2H",
        tooltip: "Two-Handed",
        icon: "fas fa-sword",
        callback: (_event, button) => ({
          ...new foundry.applications.ux.FormDataExtended(button.form).object,
          act: "twohanded",
        }),
      },
      {
        action: "range_short",
        default: true,
        label: "Short",
        tooltip: "Short Range",
        icon: "fas fa-bow-arrow",
        callback: (_event, button) => ({
          ...new foundry.applications.ux.FormDataExtended(button.form).object,
          act: "range_short",
        }),
      },
      {
        action: "range_medium",
        default: true,
        label: "Medium",
        tooltip: "Medium Range",
        icon: "fas fa-bow-arrow",
        callback: (_event, button) => ({
          ...new foundry.applications.ux.FormDataExtended(button.form).object,
          act: "range_medium",
        }),
      },
      {
        action: "range_long",
        default: true,
        label: "Long",
        tooltip: "Long Range",
        icon: "fas fa-bow-arrow",
        callback: (_event, button) => ({
          ...new foundry.applications.ux.FormDataExtended(button.form).object,
          act: "range_long",
        }),
      },
    ],
  });
}

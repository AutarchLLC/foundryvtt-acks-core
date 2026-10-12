/* global foundry, game */
/**
 *
 * @param param0
 * @param param0.title
 * @param param0.dialogData
 * @return {Promise<any>}
 */
export default async function getRollDetails({ title = "", dialogData }) {
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

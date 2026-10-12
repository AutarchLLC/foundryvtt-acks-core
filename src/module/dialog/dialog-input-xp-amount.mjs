/* global foundry */

export default async function inputXPAmount() {
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

/* global foundry */

export default async function inputNewQuantity(currentQuantity = 1) {
  const input = foundry.applications.fields.createNumberInput({
    name: `quantity`,
    placeholder: currentQuantity,
    dataset: {
      dtype: "Number",
    },
    step: 1,
    min: 1,
    autofocus: true,
  });
  const formGroup = foundry.applications.fields.createFormGroup({
    input: input,
    label: `New amount`, // TODO: localize
  });

  return foundry.applications.api.DialogV2.input({
    window: { title: "Enter new amount" }, // TODO: localize
    content: formGroup.outerHTML,
  });
}

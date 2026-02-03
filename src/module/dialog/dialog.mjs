import { DEFAULT__MONSTER_ITEM_OPTIONS } from "../constants.mjs";

export default class ACKSDialog {
  static async chooseItemNameAndType(typeOptions = DEFAULT__MONSTER_ITEM_OPTIONS) {
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
}

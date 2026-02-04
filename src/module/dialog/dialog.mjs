import { DEFAULT_MONSTER_ITEM_OPTIONS, MONSTER_SAVES_OPTIONS } from "../constants.mjs";

export default class ACKSDialog {
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
}

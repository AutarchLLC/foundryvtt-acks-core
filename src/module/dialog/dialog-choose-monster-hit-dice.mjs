/* global foundry */
import { MONSTER_SAVES_OPTIONS } from "../constants.mjs";

/**
 *
 * @return {Promise<any>}
 */
export default async function chooseMonsterHitDice() {
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

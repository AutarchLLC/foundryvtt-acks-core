/* global foundry, game */
import { CREATURE_TYPE_CHOICES } from "../constants.mjs";

/**
 * Ask for one Creature Type and its optional subtype, to add a new entry or edit an existing one.
 * @param {object} [options]
 * @param {TCreatureType} [options.current]  Entry being edited; omit to add a new one
 * @param {string[]} [options.takenTypes=[]]  Types the actor already has; they are not offered (except `current.type`)
 * @return {Promise<TCreatureType|null>}  The chosen entry, or null when the dialog is closed
 */
export default async function inputCreatureType({ current, takenTypes = [] } = {}) {
  const options = Object.entries(CREATURE_TYPE_CHOICES)
    .filter(([type]) => type === current?.type || !takenTypes.includes(type))
    .map(([value, label]) => ({ value, label }));

  const typeGroup = foundry.applications.fields.createFormGroup({
    input: foundry.applications.fields.createSelectInput({
      name: "type",
      options,
      value: current?.type,
      required: true,
      localize: true,
      sort: true,
    }),
    label: "ACKS.creatureType.label",
    localize: true,
  });

  const subtypeGroup = foundry.applications.fields.createFormGroup({
    input: foundry.applications.fields.createTextInput({
      name: "subtype",
      value: current?.subtype ?? "",
      placeholder: game.i18n.localize("ACKS.creatureType.subtypePlaceholder"),
    }),
    label: "ACKS.creatureType.subtype",
    hint: "ACKS.creatureType.subtypeHint",
    localize: true,
  });

  const result = await foundry.applications.api.DialogV2.input({
    window: { title: current ? "ACKS.creatureType.edit" : "ACKS.creatureType.add" },
    content: `${typeGroup.outerHTML}${subtypeGroup.outerHTML}`,
    classes: ["acks2", "creature-type-dialog"],
  });
  if (!result?.type) return null;
  return { type: result.type, subtype: (result.subtype ?? "").trim() };
}

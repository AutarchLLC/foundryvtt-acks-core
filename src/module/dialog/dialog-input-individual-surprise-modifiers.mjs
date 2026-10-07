/* global foundry */
/**
 *
 * @param combatants
 * @param individualMods
 * @return {Promise<any>}
 */
export default async function inputIndividualSurpriseModifiers(combatants, individualMods = {}) {
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

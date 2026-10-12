/* global foundry */

/**
 *
 * @return {Promise<boolean|null>}
 */
export default async function confirmCombatActionDeclaration() {
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

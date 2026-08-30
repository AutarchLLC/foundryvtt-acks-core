/* global foundry */
import { HB_PARTIAL_NAME } from "./constants.mjs";

export const preloadHandlebarsTemplates = async function () {
  const templatePaths = [
    "systems/acks/templates/items/v2/details/details-item.hbs",
    "systems/acks/templates/items/v2/details/details-armor.hbs",
    "systems/acks/templates/items/v2/details/details-language.hbs",
    "systems/acks/templates/items/v2/details/details-money.hbs",
    "systems/acks/templates/items/v2/details/details-ability.hbs",
    "systems/acks/templates/items/v2/details/details-spell.hbs",
    "systems/acks/templates/items/v2/details/details-weapon.hbs",
    "systems/acks/templates/items/v2/details/details-bundle.hbs",
  ];
  await foundry.applications.handlebars.loadTemplates(templatePaths);

  // register and load named partials
  // you can use them like so:
  // {{>attributeScore}}
  await foundry.applications.handlebars.loadTemplates({
    attributeScore: "systems/acks/templates/actors/v2/partials/attribute-score.hbs",
    proficiencyItem: "systems/acks/templates/actors/v2/partials/proficiency-item.hbs",
    hirelingList: "systems/acks/templates/actors/v2/partials/hireling-list.hbs",
    bundleItemList: "systems/acks/templates/items/v2/partials/bundle-item-list.hbs",
    [HB_PARTIAL_NAME.ITEM_WEAPON_DESC]: "systems/acks/templates/items/v2/description/description-weapon.hbs",
  });
};

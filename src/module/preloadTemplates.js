export const preloadHandlebarsTemplates = async function () {
  const templatePaths = [
    //Character Sheets
    "systems/acks/templates/actors/character-sheet.html",
    //Actor partials
    //Sheet tabs
    "systems/acks/templates/actors/partials/character-header.html",
    "systems/acks/templates/actors/partials/character-attributes-tab.html",
    "systems/acks/templates/actors/partials/character-abilities-tab.html",
    "systems/acks/templates/actors/partials/character-spells-tab.html",
    "systems/acks/templates/actors/partials/character-inventory-tab.html",
    "systems/acks/templates/actors/partials/character-bonuses-tab.html",
    "systems/acks/templates/actors/partials/character-notes-tab.html",
    "systems/acks/templates/actors/partials/character-effects-tab.html",
    "systems/acks/templates/actors/partials/character-hirelings-tab.html",

    "systems/acks/templates/items/partials/item-generic-effects-tab.html",

    // v2 sheet parts
    "systems/acks/templates/items/v2/details/details-item.hbs",
    "systems/acks/templates/items/v2/details/details-armor.hbs",
    "systems/acks/templates/items/v2/details/details-language.hbs",
    "systems/acks/templates/items/v2/details/details-money.hbs",
    "systems/acks/templates/items/v2/details/details-ability.hbs",
    "systems/acks/templates/items/v2/details/details-spell.hbs",
    "systems/acks/templates/items/v2/details/details-weapon.hbs",
    "systems/acks/templates/items/v2/details/details-bundle.hbs",
    "systems/acks/templates/items/v2/common/item-description.hbs",
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
  });
};

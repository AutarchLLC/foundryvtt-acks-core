export const preloadHandlebarsTemplates = async function () {
  const templatePaths = [
    //Character Sheets
    "systems/acks/templates/actors/character-sheet.html",
    "systems/acks/templates/actors/monster-sheet.html",
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

    "systems/acks/templates/actors/partials/monster-header.html",
    "systems/acks/templates/actors/partials/monster-attributes-tab.html",

    "systems/acks/templates/items/partials/item-generic-effects-tab.html",

    // v2 sheet parts
    "systems/acks/templates/items/v2/details/details-item.hbs",
    "systems/acks/templates/items/v2/details/details-armor.hbs",
    "systems/acks/templates/items/v2/details/details-language.hbs",
    "systems/acks/templates/items/v2/common/item-description.hbs",
  ];
  return loadTemplates(templatePaths);
};

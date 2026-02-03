export const ITEM_TYPE = Object.freeze({
  ITEM: "item",
  WEAPON: "weapon",
  ARMOR: "armor",
  SPELL: "spell",
  PROFICIENCY: "ability",
  LANGUAGE: "language",
  MONEY: "money",
  BUNDLE: "bundle",
});

export const DEFAULT__MONSTER_ITEM_OPTIONS = Object.freeze([
  { value: ITEM_TYPE.WEAPON, label: "TYPES.Item.weapon" },
  { value: ITEM_TYPE.ARMOR, label: "TYPES.Item.armor" },
  { value: ITEM_TYPE.PROFICIENCY, label: "TYPES.Item.ability" },
  { value: ITEM_TYPE.ITEM, label: "TYPES.Item.item" },
]);

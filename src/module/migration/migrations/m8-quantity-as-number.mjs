import MigrationBase from "../runner/migration-base.mjs";
import ItemPhysicalTemplate from "../../data/item/templates/item-physical-template.mjs";
import MoneyData from "../../data/item/money-data.mjs";
import { ITEM_TYPE, PHYSICAL_ITEM_TYPES } from "../../constants.mjs";

/**
 * Stores Quantity as a plain whole number on every Physical Item and on Money (ADR 0002).
 *
 * Gear moves `quantity.value` to `quantity`, rounded down; a missing or invalid value becomes 1.
 * Weapons and armour, which had no Quantity, get 1. Money rounds fractional Carried and Banked coins down.
 */
export class Migration8QuantityAsNumber extends MigrationBase {
  static version = 8;

  /**
   * @override
   * @inheritDoc
   */
  async updateItem(source, _actorSource = null) {
    if (PHYSICAL_ITEM_TYPES.includes(source.type)) {
      source.system.quantity ??= 1;
      ItemPhysicalTemplate.migrateQuantityToNumber(source.system);
    } else if (source.type === ITEM_TYPE.MONEY) {
      MoneyData.migrateFractionalCoins(source.system);
    }
  }
}

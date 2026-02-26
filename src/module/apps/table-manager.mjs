/* global game, ui */
import { INTERNAL_TABLES_PATH } from "../constants.mjs";

export default class ACKSTableManager {
  static #tables = null;

  static init() {
    // Fetch the internal tables from the ruledata/internal_tables.json file
    // Fetch the files
    fetch(INTERNAL_TABLES_PATH)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        // Process the data
        this.#tables = data;
      })
      .catch((_error) => {
        ui.notifications.error("Error loading internal tables");
      });
  }

  static getTable(category, tableKey) {
    if (!this.#tables?.[category]?.[tableKey]) {
      ui.notifications.error(`Table ${tableKey} not found`);
      return null;
    }
    return this.#tables[category][tableKey];
  }

  static getTablesByCategory(category) {
    if (!this.#tables?.[category]) {
      ui.notifications.error(`No tables found for category ${category}`);
      return [];
    }
    return this.#tables[category];
  }

  static async rollD20Table(category, tableKey, modifier = 0) {
    const table = ACKSTableManager.getTable(category, tableKey);
    if (!table) {
      ui.notifications.error(`Table ${tableKey} not found`);
      return null;
    }
    const roll = new Roll(`1d20+${modifier}`);
    await roll.evaluate();
    const result = roll.total;

    // Now search in the table to find the corresponding entry, by comparing the result with the table's min/max values
    const entry = table.results.find((entry) => {
      return result >= entry.min && result <= entry.max;
    });
    if (entry) {
      // Now roll a D6 and select the proper effects from the entry
      const d6Roll = new Roll("1d6");
      await d6Roll.evaluate();
      const d6Result = d6Roll.total;
      const effect = entry.effects[String(d6Result)];
      if (!effect) {
        ui.notifications.error(`No effects found for roll ${d6Result} on table ${tableKey}`);
        return null;
      }
      const finalResult = foundry.utils.deepClone(entry);
      finalResult.tableName = table?.name;
      finalResult.d20Result = result;
      finalResult.modifier = modifier;
      finalResult.d6Result = d6Result;
      finalResult.selectedEffect = foundry.utils.deepClone(effect);
      return finalResult;
    } else {
      ui.notifications.error(`No entry found for roll ${result} on table ${tableKey}`);
      return null;
    }
  }
}

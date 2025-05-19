export class AcksTableManager {
  static init() {
    // Fetch the internal tables from the ruledata/internal_tables.json file
    // Fetch the files
    const filePath = "systems/acks/module/ruledata/internal_tables.json";
    const file = fetch(filePath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        // Process the data
        console.log("Internal Tables Loaded", data);
        game.acks.tables = data;
      })
      .catch((error) => {
        console.error("Error loading internal tables:", error);
      });
  }

  static getTable(category, tableKey) {
    if (!game.acks?.tables?.[category]?.[tableKey]) {
      console.error(`Table ${tableKey} not found`);
      return null;
    }
    return game.acks.tables[category][tableKey];
  }

  static async rollD20Table(category, tableKey, modifier = 0) {
    const table = AcksTableManager.getTable(category, tableKey);
    if (!table) {
      console.error(`Table ${tableKey} not found`);
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
      console.log(`Rolled ${result} on ${tableKey}:`, entry);
      // Now roll a D6 and select the proper effects from the entry
      const d6Roll = new Roll("1d6");
      await d6Roll.evaluate();
      const d6Result = d6Roll.total;
      const effect = entry.effects[String(d6Result)];
      if (!effect) {
        console.error(`No effects found for roll ${d6Result} on table ${tableKey}`);
        ui.notifications.error(`No effects found for roll ${d6Result} on table ${tableKey}`);
        return null;
      }
      console.log(`Rolled ${d6Result} on ${tableKey} effects:`, effect);
      let finalResult = foundry.utils.deepClone(entry);
      finalResult.tableName = table?.name;
      finalResult.d20Result = result;
      finalResult.modifier = modifier;
      finalResult.d6Result = d6Result;
      finalResult.selectedEffect = foundry.utils.deepClone(effect);
      return finalResult;
    } else {
      console.error(`No entry found for roll ${result} on table ${tableKey}`);
      ui.notifications.error(`No entry found for roll ${result} on table ${tableKey}`);
      return null;
    }
  }
}

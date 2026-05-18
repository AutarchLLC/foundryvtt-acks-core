/* global foundry */
export default class ItemPhysicalTemplate {
  /**
   * Shared data schema for item's physical properties such as cost and weight
   * @return {ItemPhysicalDataSchema}
   */
  static get schema() {
    const { NumberField } = foundry.data.fields;

    return {
      // item cost (in GP?)
      cost: new NumberField({ initial: 0, min: 0 }),
      // weight in 1/6 stone
      weight6: new NumberField({ initial: 0 }),
    };
  }

  /**
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateWeightToWeight6(source) {
    if (source.weight !== undefined && (source.weight6 === undefined || source.weight6 < 0)) {
      if (source.weight >= 0) {
        source.weight6 = Math.ceil(source.weight / 166.66);
      }
    }
  }
}

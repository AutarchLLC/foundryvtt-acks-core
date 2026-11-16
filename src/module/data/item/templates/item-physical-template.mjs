/* global foundry */
export default class ItemPhysicalTemplate {
  /**
   * Shared data schema for item's physical properties such as cost and weight
   * @return {ItemPhysicalDataSchema}
   */
  static get schema() {
    const { NumberField } = foundry.data.fields;

    return {
      // item cost in GP
      cost: new NumberField({ initial: 0, min: 0 }),
      // weight in 1/6 stone
      weight6: new NumberField({ initial: 0 }),
      // how many identical objects this entry stands for (see GLOSSARY.md, Quantity)
      quantity: new NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: 0,
        initial: 1,
        label: "ACKS.Quantity",
      }),
    };
  }

  /**
   * Flatten the legacy `quantity: {value}` of gear into a whole number, rounding fractions down.
   * A legacy value that is missing or not a number becomes 1. A fractional plain number is rounded down.
   * Acts only on those old shapes, so it is safe on partial update data.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateQuantityToNumber(source) {
    if (foundry.utils.getType(source.quantity) === "Object") {
      const value = Number(source.quantity.value);
      source.quantity = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 1;
    } else if (typeof source.quantity === "number" && !Number.isInteger(source.quantity)) {
      source.quantity = Math.floor(source.quantity);
    }
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

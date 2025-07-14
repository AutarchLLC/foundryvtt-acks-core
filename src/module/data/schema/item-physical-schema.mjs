/**
 * Shared data schema for item's physical properties such as cost and weight
 * @return {ItemPhysicalDataSchema}
 */
export default function itemPhysicalSchema() {
  const { NumberField } = foundry.data.fields;

  return {
    // item cost (in GP?)
    cost: new NumberField({ initial: 0, min: 0 }),
    // TODO: old weight handling? seems like it is not used anymore? maybe write migration and delete?
    weight: new NumberField({}),
    // weight in 1/6 stone
    weight6: new NumberField({}),
  };
}

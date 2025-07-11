/**
 * Shared data schema for item's description
 * @return {ItemDescriptionDataSchema}
 */
export default function itemDescriptionSchema() {
  const { HTMLField } = foundry.data.fields;

  return {
    description: new HTMLField({ required: true, nullable: true }),
  };
}

/**
 * Spellcaster shared actor schema
 * @return {{spells}}
 */
export default function actorSpellcasterSchema() {
  const { BooleanField, NumberField, SchemaField } = foundry.data.fields;

  return {
    spells: new SchemaField({
      // is actor a spellcaster? configured via Actor Tweaks
      enabled: new BooleanField({ initial: false }),
      1: new SchemaField({
        max: new NumberField({ initial: 0 }),
      }),
      2: new SchemaField({
        max: new NumberField({ initial: 0 }),
      }),
      3: new SchemaField({
        max: new NumberField({ initial: 0 }),
      }),
      4: new SchemaField({
        max: new NumberField({ initial: 0 }),
      }),
      5: new SchemaField({
        max: new NumberField({ initial: 0 }),
      }),
      6: new SchemaField({
        max: new NumberField({ initial: 0 }),
      }),
    }),
  };
}

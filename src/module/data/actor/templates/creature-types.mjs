/* global foundry, game */
import { CREATURE_TYPE_CHOICES } from "../../../constants.mjs";

/**
 * Build the `creatureTypes` field: a list of Creature Types, each with an optional subtype.
 * @param {object} [options]
 * @param {boolean} [options.persisted=true]  Store the value; non-persisted values are rebuilt from `initial` on every
 *   data preparation and can still be changed by Active Effects
 * @param {TCreatureType[]} [options.initial=[]]  Initial entries
 * @return {{creatureTypes: foundry.data.fields.ArrayField}}
 */
export function creatureTypesField({ persisted = true, initial = [] } = {}) {
  const { ArrayField, SchemaField, StringField } = foundry.data.fields;
  return {
    creatureTypes: new ArrayField(
      new SchemaField({
        type: new StringField({ required: true, blank: false, choices: CREATURE_TYPE_CHOICES }),
        subtype: new StringField({ required: true, blank: true, initial: "" }),
      }),
      {
        required: true,
        persisted,
        validate: validateUniqueTypes,
        validationError: "must not contain the same Creature Type twice",
        // a function, so every actor gets its own copy of the initial entries
        initial: () => initial.map((entry) => ({ subtype: "", ...entry })),
      },
    ),
  };
}

/**
 * An actor has each Creature Type at most once.
 * Returns nothing when valid: returning `true` would skip Foundry's remaining validators.
 * @param {TCreatureType[]} value
 * @return {false|void}
 */
function validateUniqueTypes(value) {
  const types = value.map((entry) => entry.type);
  if (new Set(types).size !== types.length) return false;
}

/**
 * Display label of one Creature Type: "Monstrosity (bestial)", or "Animal" without a subtype.
 * @param {TCreatureType} creatureType
 * @return {string}
 */
export function creatureTypeLabel({ type, subtype }) {
  const typeLabel = game.i18n.localize(CREATURE_TYPE_CHOICES[type] ?? type);
  const trimmed = subtype?.trim();
  return trimmed ? `${typeLabel} (${trimmed})` : typeLabel;
}

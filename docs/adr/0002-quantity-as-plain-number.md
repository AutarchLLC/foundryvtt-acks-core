# Quantity is a plain number on every Physical Item and on Money

Every Physical Item (gear, clothing, weapons, armour) and every Money entry stores its Quantity the same way: `system.quantity` holds a whole number, at least 0. Before this, gear stored it as `system.quantity.value`, Money as a plain `system.quantity`, and weapons and armour had no Quantity at all, so inventory, encumbrance and Bundle code had to branch on item type (#229).

Foundry usually wraps resources as `{value, max}`, and `charges` in this system follows that. We chose a plain number anyway: Quantity has no maximum (migration 5 already dropped the unused `quantity.max`), so the wrapper only adds a `.value` to every read and write. Money was already a plain number and has the most code that reads it.

Money's Banked coins stay in their own `system.quantitybank` field, because banking applies only to Money. A Money entry's Quantity is its Carried coins.

## Consequences

- A schema migration flattens `quantity.value` on gear, rounding fractions down, and gives weapons and armour a Quantity of 1. Read-only compendiums get the same change in memory through `migrateData`.
- Quantity lives in the shared physical-item schema, so encumbrance multiplies weight by Quantity for gear, weapons and armour alike.
- A weapon's Quantity is bookkeeping only. Attacks do not use up ammunition.
- Dropping a Bundle creates one item per entry with that entry's Quantity, rather than one copy per unit.
- Macros and modules that read or write `system.quantity.value` break: reads get `undefined`. There is no deprecation shim, because reads off a plain number cannot be shimmed and shimming writes alone would hide only half the break. The Changelog names the old and new paths, and a reference of the system's data properties in the help journal compendium tells macro authors what they can rely on.

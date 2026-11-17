# Condition Modifiers are Active Effect changes on the status effect

A Condition that has Condition Modifiers carries them as additive `system.changes` on its entry in `CONFIG.statusEffects` (#244). Toggling the Condition from the token HUD copies the entry into an Active Effect on the actor, so the modifiers are applied by Foundry's normal Active Effect pass, before derived data.

We considered computing the modifiers from the actor's statuses during data preparation, using a single rules table. That approach always uses the current values and could also cover modifiers to attacks against the creature. We chose Active Effects for the first batch: they're the standard Foundry mechanism, the Judge can inspect and edit them, and most Conditions are situational and short-lived, so stale copies seldom matter.

The values are plain numbers in source. Conditions still carry no rules text (ADR 0001), and the values aren't posted on the issue tracker.

## Consequences

- Each effect is a copy. Changing a value in `CONFIG.ACKS.conditions` doesn't update Conditions that are already on actors; the Judge toggles the Condition off and on to pick up the new values. If that ever becomes a burden, a migration can refresh them. A Condition placed from the HUD is identified by its single Condition id in `statuses`, the same test migration 6 uses, so it needs no extra id. To keep a Judge's hand edits, the migration should rewrite only effects whose changes still match the previous values.
- Condition Modifiers land in the same `*.mod` fields as Actor Tweaks. The attack throw and damage breakdowns show the Actor Tweaks line from the stored value, then one line for each enabled Active Effect that adds to the field, labelled with the effect's name. Any leftover from effects that don't simply add goes on one "Other effects" line. Saves include the modifiers in their total but don't list them yet.
- Only self modifiers are automated. Modifiers to attacks against a creature with a Condition, and restrictions such as being unable to act, are not.
- Monsters ignore `ac.mod`, `save.mod` and `movement.mod` until characters and monsters calculate these values the same way, so Conditions that change those fields have no effect on monsters until then.
- This replaces ADR 0001's line that each automation gets its own issue.

# ACKS Conditions replace Foundry's core status effects

The token HUD offers the ACKS II Conditions instead of Foundry's core status effects, because the core set (stun, frozen, shock, the four shields, …) doesn't match the rules and mixing the two confused play. A world setting, off by default, adds the core effects back for groups that want them.

Five core ids are kept alongside the Conditions: `dead`, `invisible`, `fly`, `burrow` and `hover`. Foundry core gives them special treatment through `CONFIG.specialStatusEffects`: defeated combatants, vision and detection, light sources, and the invisibility filter. ACKS has no Condition that means the same thing. The `BLIND` slot points at the ACKS `blinded` Condition instead of core `blind`.

Conditions carry only a name and an icon, never a description. The Condition rules text is copyrighted, so it stays in the rulebook. Mechanical automation of a Condition, such as attack penalties, is out of scope here; each automation gets its own issue.

## Consequences

- Core status effects already on actors in existing worlds are left untouched. Whether and how to convert them is tracked in #231.
- Combat States (Done, Readied, Delayed, Overnumbered) are registered as status effects but hidden from the token HUD; the combat tracker manages them.

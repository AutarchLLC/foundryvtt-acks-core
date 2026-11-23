# ACKS II for Foundry VTT

The vocabulary of the Adventurer Conqueror King System II as this Foundry system models it.

## Language

### Creature states

**Condition**:
A state defined by the ACKS II rules that can be placed on a creature, such as Blinded, Prone or Slumbering. The system carries only its name and icon, never its rules text.
_Avoid_: Status, debuff

**Combat State**:
A piece of initiative and turn bookkeeping that the combat tracker places on a combatant, such as Done, Readied, Delayed or Overnumbered. It is not a Condition from the rules.
_Avoid_: Condition, combat status

**Status Effect**:
Foundry's umbrella term for any toggleable marker on a token. Both Conditions and Combat States are Status Effects.
_Avoid_: Using it to mean only Conditions

**Condition Modifier**:
A number a Condition adds to one of the affected creature's own rolls or scores, such as its attack throws, Armor Class or saving throws, for as long as the creature has that Condition. Several Condition Modifiers on the same roll or score add together.
_Avoid_: Penalty, debuff, condition bonus

### Creatures

**Creature Type**:
The ACKS II category a creature belongs to, such as Animal, Humanoid, Monstrosity or Undead. A creature can have several, each at most once. Each can carry a free-text **Subtype**, written in parentheses after it, such as "Monstrosity (bestial)" or "Incarnation (Demon)". Characters are always Humanoid. Rules such as Encumbrance depend on it.
_Avoid_: Monster type, race, kind

### Inventory

**Physical Item**:
Equipment a character can own, carry and weigh: gear, clothing, weapons and armour. Money is not a Physical Item.
_Avoid_: Gear (gear is one kind of Physical Item)

**Quantity**:
How many identical objects one inventory entry stands for, such as 20 arrows or 6 torches. Every Physical Item and every Money entry has one. Weight and value scale with it. It can be zero, as when the last torch is used up, and the entry stays in the inventory. For Money, Quantity is the Carried coins only; the Money total is Carried plus Banked.
_Avoid_: Count, amount, stack size

**Money**:
Coins of one denomination, such as gold or copper pieces. Each kind has a value in copper pieces and is split into a Carried part and a Banked part.
_Avoid_: Treasure (treasure includes things that are not coins)

**Carried**:
The part of a Money entry the character has on them. Only Carried coins add encumbrance.
_Avoid_: On hand, on person

**Banked**:
The part of a Money entry held at a bank or in storage, away from the character. It adds no encumbrance.
_Avoid_: Stored, saved

**Bundle**:
A ready-made package of Physical Items and Money with a Quantity for each, such as a starting kit. Dropping it on a character gives them its contents.
_Avoid_: Kit, pack

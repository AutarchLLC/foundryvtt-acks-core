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

**Size**:
How big a creature is, one of six steps from smallest to largest: Small, Man-Sized, Large, Huge, Gigantic, Colossal. Every creature has exactly one; a new creature is Man-Sized. It does not follow from Body Weight.
_Avoid_: Size class, scale; Weapon Size (a separate scale for weapons)

**Body Weight**:
How much a creature itself weighs, in stone, counted in sixths of a stone like every other weight. A new creature weighs 15 stone. It is not what the creature carries and adds nothing to its encumbrance.
_Avoid_: Weight (on its own it means carried weight), mass

### Encumbrance

**Encumbrance**:
How much a creature is carrying, in stone, counted in sixths of a stone. It is the weight of its Physical Items and its Carried Money. The more it carries, the slower it moves.
_Avoid_: Load (on its own), carried weight

**Normal Load**:
The most Encumbrance a creature can carry at full speed. Every creature has one. A character's is 5 stone unless a house rule changes it. It is a property of the creature itself, not of anything it carries.
_Avoid_: Base load, carrying capacity

**Maximum Load**:
The most Encumbrance a creature can carry and still move. Most creatures can carry twice their Normal Load; Humanoids four times, and a character adds its Strength modifier to that. Above it the creature cannot move.
_Avoid_: Max encumbrance, overload

**Encumbrance Level**:
How weighed down a creature is, which sets how fast it moves: Unencumbered (full speed), Low Encumbrance (three-quarters), Medium Encumbrance (half), High Encumbrance (one-quarter) or Overburdened (cannot move). Only Humanoids pass through all five; other creatures go straight from Unencumbered to Medium Encumbrance to Overburdened. Characters reach Low Encumbrance at 1.4 times their Normal Load rather than one and a half times, which with the usual 5 stone gives 5, 7, 10 and 20 stone plus their Strength modifier.
_Avoid_: Encumbrance band, load band, encumbrance (on its own it means the weight carried)

### Movement

**Movement Mode**:
A way a creature can move: Walking, Burrowing, Climbing, Flying, Flying (Hover), Swimming or Webcrawling. A creature has a Speed in each; a Speed of 0 means it cannot move that way. A new creature walks at 120 and has no other Movement Mode. Climbing as a Movement Mode means climbing unimpeded across walls and ceilings, which few creatures can do. A creature that is only Flying cannot stay still in the air or cast spells while flying; Flying (Hover) means it can do both.
_Avoid_: Movement category, movement action (Foundry's token term), movement type

**Speed**:
How far a creature moves in one Movement Mode in a turn of exploration, in feet. It is the one movement figure entered for a creature; every other speed follows from it. Encumbrance slows it. Shown on sheets as Exploration Speed.
_Avoid_: Movement rate, base movement, move

**Combat Speed**:
How far a creature moves in one Movement Mode in a combat round, in feet: a third of its Speed.
_Avoid_: Encounter speed, encounter movement

**Running Speed**:
How far a creature moves in one Movement Mode in a combat round when it runs or charges, in feet: the same number as its Speed.
_Avoid_: Charge speed, sprint

**Expedition Speed**:
How far a creature travels in one Movement Mode in a day, in miles: a fifth of its Speed.
_Avoid_: Overland speed, travel speed

**Spelunking Speed**:
How far a creature climbs in a combat round using the rules for Caving and Spelunking, with Climbing throws, in feet: a third of its Walking Combat Speed. Any creature can try it. It is not the Climbing Movement Mode, which needs no throws and is far rarer.
_Avoid_: Climb speed, climbing speed (both mean the Climbing Movement Mode)

**Sneaking Speed**:
How far a creature moves in a combat round while sneaking, in feet: half its Walking Combat Speed.
_Avoid_: Stealth speed

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

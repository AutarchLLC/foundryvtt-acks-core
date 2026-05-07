# ACKS Data Migration Guide

A complete reference for writing, registering, and testing data migrations.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Step-by-step: Writing a new migration](#step-by-step-writing-a-new-migration)
4. [Migration class API](#migration-class-api)
   - [updateActor](#updateactor)
   - [updateItem](#updateitem)
   - [requiresFlush](#requiresflush)
5. [Deleting fields from the DB](#deleting-fields-from-the-db)
6. [The migrateData safety net](#the-migratedata-safety-net)
7. [Compendium source JSON](#compendium-source-json)
8. [Testing migrations](#testing-migrations)
9. [Common patterns (cookbook)](#common-patterns-cookbook)
10. [What the runner does — internals](#what-the-runner-does--internals)
11. [File map](#file-map)

---

## Overview

Migrations are **permanent, one-time DB writes** that update stored documents
to match a new data model schema. They run once per world on the `ready` hook,
gates by an integer version counter stored in the `systemSchemaVersion` world
setting.

Two complementary mechanisms work together:

| Mechanism | Triggers | Writes to DB | Covers |
|---|---|---|---|
| **Migration runner** | `ready` hook, GM only, once per version | ✅ Yes | World actors, world items, scene token deltas, world compendium packs |
| **`migrateData()` safety net** | Every document load | ❌ No (in-memory only) | Read-only compendiums (system packs, external module packs) |

---

## Architecture

```
src/module/migration/
  migration.mjs               ← entry point: runMigrations(), CURRENT_SCHEMA_VERSION, isCurrentSchema()
  runner/
    migration-base.mjs        ← abstract base class all migrations extend
    migration-list.mjs        ← collects and sorts all migrations from the barrel file
    migration-runner.mjs      ← executes migrations: world actors, items, tokens, compendiums
  migrations/
    index.mjs                 ← barrel file — export every migration class from here
    m1-ii-saving-throws.mjs   ← example migration (version 1)
    m2-*.mjs                  ← next migration, and so on
```

`CURRENT_SCHEMA_VERSION` in `migration.mjs` is compared against
`system._schemaVersion` on each document. Documents already at
`CURRENT_SCHEMA_VERSION` are skipped.

---

## Step-by-step: Writing a new migration

### 1. Create the migration file

Create `src/module/migration/migrations/mN-short-description.mjs`
where `N` is the **next integer** after the current highest version.

```js
/* global foundry */
import MigrationBase from "../runner/migration-base.mjs";

export class MigrationNShortDescription extends MigrationBase {
  static version = N; // ← unique integer, one higher than the previous migration

  async updateActor(source) {
    // mutate source.system.* and/or source.items here
  }

  async updateItem(source, actorSource = null) {
    // mutate source.system.* here (field changes only, no roster changes)
  }
}
```

### 2. Export from the barrel file

Add one line to `src/module/migration/migrations/index.mjs`:

```js
export { MigrationNShortDescription } from "./mN-short-description.mjs";
```

The runner picks up all exports from this file automatically; order does not
matter because they are sorted by `static version`.

### 3. Bump CURRENT_SCHEMA_VERSION

In `src/module/migration/migration.mjs`, set:

```js
export const CURRENT_SCHEMA_VERSION = N; // same integer as the new migration
```

This must always equal the **highest** `static version` among all migrations.

### 4. Update BaseDataModel.migrateData (safety net)

If your migration touches a field that lives on **all actor types** (i.e., a
field defined in `actorCommonSchema`), add the in-memory equivalents to
`src/module/data/common/base-data-model.mjs`:

```js
static migrateData(source) {
  if (source?.saves) {
    this._addDataFieldMigration(source.saves, "oldField", "newField"); // add here
  }
  return super.migrateData(source);
}
```

If your migration touches a field that only exists on one actor type, override
`migrateData` on that model class instead (e.g. `MonsterData`), calling
`super.migrateData(source)` at the end.

If your migration only touches item fields, override `migrateData` on the
relevant item data model class.

### 5. Update schema

Add the new field (or remove the old one) in the appropriate `defineSchema()`:

- Actor fields shared by all types → `src/module/data/actor/templates/actor-common-schema.mjs`
- Character-only fields → `src/module/data/actor/character-data.mjs`
- Monster-only fields → `src/module/data/actor/monster-data.mjs`
- Item fields by type → `src/module/data/item/<type>-data.mjs`

**Do not** remove the old field from the schema until after the migration and
compendium cleanup are complete and released — the schema must be able to
receive the old key during the migration write cycle.

### 6. Update compendium source JSON

The runner migrates world documents automatically but **does not touch system
or module compendium pack files** (they are read-only at runtime).

Update them manually:

```bash
# Optional: pull the current LevelDB state into JSON (only needed if you edited via Foundry UI)
npm run packs:databaseToSource

# Edit the JSON files under src/packs/_source/ by hand (or with a script)

# Compile JSON back to LevelDB
npm run packs:sourceToDatabase
```

For field renames, a PowerShell one-liner works well:

```powershell
Get-ChildItem -Path "src\packs\_source" -Recurse -Include "*.json" | ForEach-Object {
  (Get-Content $_.FullName -Raw) -replace '"oldField":', '"newField":' |
  Set-Content $_.FullName -NoNewline
}
```

Always verify afterwards:

```powershell
Get-ChildItem -Path "src\packs\_source" -Recurse -Include "*.json" |
  Select-String -Pattern '"oldField"'
```

---

## Migration class API

### updateActor

```js
async updateActor(source)
```

`source` is a plain JS object — the result of `actor.toObject()`. Mutate it
in place. The runner deep-clones before calling this, so mutations are safe.

**Actor system fields:**

```js
source.system.someField = newValue;
```

**Item roster changes** (add / remove only — never field edits):

```js
// Add an item — do NOT include _id
source.items.push({ type: "language", name: "Common", system: {} });

// Remove items
source.items = source.items.filter((i) => i.type !== "money" || i.name !== "Obsolete");
```

The runner diffs `source.items` by `_id` after `updateActor` returns:
- An entry **without** `_id` → `createEmbeddedDocuments`
- An original `_id` **missing** from the result → `deleteEmbeddedDocuments`
- An entry **with** its original `_id` → `updateEmbeddedDocuments` (via `updateItem`)

> ⚠️ Do **not** copy an existing item keeping its `_id` to "duplicate" it —
> the runner will treat it as an update to the original.

### updateItem

```js
async updateItem(source, actorSource = null)
```

Called for:
- Every embedded item on an actor (after `updateActor` has run; `actorSource`
  is the migrated actor plain object)
- Every standalone world item (`actorSource` is `null`)

Mutate `source.system.*` field values only. Do **not** push to or filter
`source.items` here.

`actorSource` can be used to backfill item fields from actor context:

```js
if (source.system.classTag === undefined && actorSource) {
  source.system.classTag = actorSource.system.details.class ?? "";
}
```

### requiresFlush

```js
requiresFlush = true;
```

Set this on a migration when a later migration in the **same release** depends
on the DB having been committed first (e.g., migration A creates items that
migration B needs to read with real `_id`s).

The runner splits migrations into phases at every `requiresFlush` boundary,
completing the full write cycle before starting the next phase.

---

## Deleting fields from the DB

Simply omitting a key from an update object does **not** delete it — Foundry's
update pipeline merges; absent keys are left untouched.

**Foundry v14+ (preferred):**

```js
source.system.saves.wand = new foundry.data.operators.ForcedDeletion();
```

**Foundry v13 (deprecated in v14, removed in v16):**

```js
source.system.saves["-=wand"] = null;
```

**Cross-version pattern used in this codebase:**

```js
if (foundry.data.operators?.ForcedDeletion) {
  source.system.saves.wand = new foundry.data.operators.ForcedDeletion();
} else {
  source.system.saves["-=wand"] = null;
}
```

The safety-net `migrateData()` uses `_addDataFieldMigration()` which handles
the in-memory copy+delete automatically and does not need `ForcedDeletion`
(it never writes to the DB).

---

## The migrateData safety net

`TypeDataModel.migrateData(source)` runs **every time a document is loaded**,
before schema validation. It is purely in-memory — it never writes to the DB.

Its purpose is to handle documents the migration runner cannot reach:
read-only system packs (`acks.acks-*`) and read-only external module packs.

Add in-memory field renames to `BaseDataModel.migrateData()` for shared actor
fields, or to the specific model class for type-specific fields.

Use `_addDataFieldMigration(obj, oldKey, newKey)` — this is Foundry's built-in
helper that copies the old value and removes the old key, both in-memory:

```js
// src/module/data/common/base-data-model.mjs
static migrateData(source) {
  // Migration N: example rename
  if (source?.someField !== undefined && source?.newField === undefined) {
    this._addDataFieldMigration(source, "someField", "newField");
  }

  return super.migrateData(source);
}
```

> Every migration that renames or removes a field should have a corresponding
> `_addDataFieldMigration` call in `migrateData`. Migrations that only add
> **new** fields (schema provides an `initial` value) do not need it.

---

## Compendium source JSON

System compendium JSON source lives under `src/packs/_source/`. The runtime
migration runner migrates **world-owned** compendium packs automatically
(unlocks → migrates → re-locks). It skips system and module packs because they
are read-only at runtime.

For system packs (`acks.*`), edit JSON by hand:

```
src/packs/_source/
  acks-monsters/
    beetle-giant-bombardier.json   ← actor document
    ...
  acks-arcane-spells/
    acks-arcane-spells-1/
      burning-hands.json           ← item document
```

Actor saves are at `system.saves.<key>.value`. Item save targets are at
`system.save` (a string).

After editing, rebuild the LevelDB databases:

```bash
npm run packs:sourceToDatabase
```

---

## Testing migrations

There is no CLI test runner. Testing happens inside Foundry via
[Quench](https://ethaks.github.io/FVTT-Quench/index.html).

**Re-running migrations from scratch during development:**

`MigrationRunner.resetSchemaVersions()` resets `system._schemaVersion` to `0`
on every world actor, item, and token delta, and resets the
`systemSchemaVersion` world setting to `0`. Migrations will run again on the
next page load.

```js
// In the browser console (as GM):
await MigrationRunner.resetSchemaVersions();
// Then reload the page to trigger runMigrations() again.
```

> ⚠️ `migration.mjs` currently calls `resetSchemaVersions()` unconditionally
> for development. **Remove that line before releasing.**

---

## Common patterns (cookbook)

### Rename an actor field

```js
async updateActor(source) {
  if (source.system.oldName !== undefined && source.system.newName === undefined) {
    source.system.newName = source.system.oldName;
    if (foundry.data.operators?.ForcedDeletion) {
      source.system.oldName = new foundry.data.operators.ForcedDeletion();
    } else {
      source.system["-=oldName"] = null;
    }
  }
}
```

Safety net in `BaseDataModel.migrateData` (or the specific model):

```js
this._addDataFieldMigration(source.system, "oldName", "newName");
```

### Rename a nested field (e.g. inside saves)

```js
async updateActor(source) {
  if (source.system.saves?.oldKey !== undefined && source.system.saves?.newKey === undefined) {
    source.system.saves.newKey = source.system.saves.oldKey;
    if (foundry.data.operators?.ForcedDeletion) {
      source.system.saves.oldKey = new foundry.data.operators.ForcedDeletion();
    } else {
      source.system.saves["-=oldKey"] = null;
    }
  }
}
```

Safety net:

```js
if (source?.saves) {
  this._addDataFieldMigration(source.saves, "oldKey", "newKey");
}
```

### Rename an item field

```js
async updateItem(source, _actorSource = null) {
  if (source.system.oldField !== undefined && source.system.newField === undefined) {
    source.system.newField = source.system.oldField;
    if (foundry.data.operators?.ForcedDeletion) {
      source.system.oldField = new foundry.data.operators.ForcedDeletion();
    } else {
      source.system["-=oldField"] = null;
    }
  }
}
```

### Rename a string value (enum change)

```js
async updateItem(source, _actorSource = null) {
  if (source.system.save === "oldValue") {
    source.system.save = "newValue";
  }
}
```

No DB deletion needed — the field itself stays, only its value changes.

### Restructure a flat value into an object

```js
async updateActor(source) {
  if (typeof source.system.movement === "number") {
    const old = source.system.movement;
    source.system.movement = { exploration: old, combat: Math.floor(old / 3) };
  }
}
```

### Type coercion (string → number)

```js
async updateActor(source) {
  if (typeof source.system.details?.xp === "string") {
    source.system.details.xp = Number(source.system.details.xp) || 0;
  }
}
```

### Add a default embedded item to every actor

```js
// Set requiresFlush = true if a later migration needs the item's real _id.
requiresFlush = true;

async updateActor(source) {
  const hasCommon = source.items.some(
    (i) => i.type === "language" && i.name === "Common Auran"
  );
  if (!hasCommon) {
    // No _id — the runner will call createEmbeddedDocuments for this entry.
    source.items.push({ type: "language", name: "Common Auran", system: {} });
  }
}
```

### Remove a specific embedded item type from every actor

```js
async updateActor(source) {
  source.items = source.items.filter((i) => i.type !== "obsoleteType");
}
```

### Set an item field from actor context

```js
async updateItem(source, actorSource = null) {
  if (source.type === "ability" && source.system.classTag === undefined && actorSource) {
    source.system.classTag = actorSource.system.details.class ?? "";
  }
}
```

---

## What the runner does — internals

```
runMigration()
  for each phase (split at requiresFlush boundaries):
    #migrateWorldActors(phase)
      for each game.actors:
        deep-clone actor.toObject()
        run migration.updateActor(clone) for each migration
        run migration.updateItem(item, clone) for each embedded item × each migration
        stamp system._schemaVersion = CURRENT_SCHEMA_VERSION on actor and all items
        #commitActorItems → diff items → createEmbeddedDocuments / deleteEmbeddedDocuments / updateEmbeddedDocuments
        Actor.implementation.updateDocuments([actorUpdate])

    #migrateWorldItems(phase)
      for each game.items (standalone world items):
        deep-clone item.toObject()
        run migration.updateItem(clone, null) for each migration
        stamp system._schemaVersion
        Item.implementation.updateDocuments([itemUpdate])

    #migrateSceneTokens(phase)
      for each scene → each unlinked token:
        skip if actorLink === true (uses world actor, already migrated)
        skip if delta has no system data
        skip if isCurrentSchema(delta.system)
        run same actor migration loop as above on delta clone
        scene.updateEmbeddedDocuments("Token", [{ "delta.system": migratedSystem }])

    #migrateWorldCompendiums(phase)
      for each game.packs where packageType === "world":
        unlock pack
        run actor or item migration loop (same as above)
        re-lock pack
      (system/module packs are skipped — read-only)

  game.settings.set("acks", "systemSchemaVersion", CURRENT_SCHEMA_VERSION)
```

`isCurrentSchema(source)` returns `true` when `source._schemaVersion >= CURRENT_SCHEMA_VERSION`,
acting as an early-exit guard so already-migrated documents are never
processed twice.

---

## File map

| File | Purpose |
|---|---|
| `src/module/migration/migration.mjs` | `runMigrations()` entry point, `CURRENT_SCHEMA_VERSION`, `isCurrentSchema()` |
| `src/module/migration/runner/migration-base.mjs` | Abstract base — `updateActor`, `updateItem`, `requiresFlush` |
| `src/module/migration/runner/migration-list.mjs` | Collects all exports from `migrations/index.mjs`, sorts by version |
| `src/module/migration/runner/migration-runner.mjs` | Executes phases; world actors, items, tokens, world compendiums |
| `src/module/migration/migrations/index.mjs` | Barrel file — **add your export here** |
| `src/module/migration/migrations/m1-ii-saving-throws.mjs` | Example: `saves.wand→implements`, `saves.breath→blast` |
| `src/module/data/common/base-data-model.mjs` | `migrateData()` safety net for shared actor fields; all models inherit this |
| `src/module/settings.mjs` | Registers `systemSchemaVersion` world setting (type: Number, default: 0) |
| `src/packs/_source/` | Editable compendium JSON — must be updated manually per migration |


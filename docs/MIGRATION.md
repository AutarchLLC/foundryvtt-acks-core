# Data Migration Guide — ACKS II for Foundry VTT

This document explains how the ACKS data migration system works and how to add new migrations when the system data schema changes.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [How Migrations Run](#how-migrations-run)
   - [Entry Point](#entry-point)
   - [The `systemSchemaVersion` World Setting](#the-systemschemaversion-world-setting)
   - [Migration Phases and `requiresFlush`](#migration-phases-and-requiresflush)
   - [What Gets Migrated](#what-gets-migrated)
4. [The `_schemaVersion` Field](#the-_schemaversion-field)
5. [The `migrateData()` Safety Net](#the-migratedata-safety-net)
6. [Deleting DB Fields (v13 vs v14)](#deleting-db-fields-v13-vs-v14)
7. [Step-by-Step: Adding a New Migration](#step-by-step-adding-a-new-migration)
8. [Migration File Reference](#migration-file-reference)
9. [Development Tips](#development-tips)
10. [Compendium Source Files](#compendium-source-files)

---

## Overview

The migration system handles **one-time, permanent database writes** that update stored actor and item data to match the current data model schema. Migrations are needed whenever you:

- Rename a stored field (e.g., `saves.wand` → `saves.implements`)
- Change a field's type or structure (e.g., a number becoming an object)
- Remove a field permanently
- Add a derived or denormalised field that must be back-filled from existing data
- Add or remove embedded items from actors wholesale

Migrations run automatically on the `ready` hook, **GM-only**, once per schema version bump. Players are unaffected — they simply see a UI notification while the GM's browser runs the migration in the background.

---

## Architecture

```
src/module/migration/
  migration.mjs               ← Public API: runMigrations(), CURRENT_SCHEMA_VERSION, isCurrentSchema()
  migration-util.mjs          ← MigrationUtil: cross-version helpers (e.g., markPropertyForDeletion)
  runner/
    migration-base.mjs        ← MigrationBase: base class for all migrations
    migration-list.mjs        ← Reads barrel file, sorts by static version
    migration-runner.mjs      ← Orchestrates all migration phases
  migrations/
    index.mjs                 ← Barrel file — re-exports every migration class
    m1-ii-saving-throws.mjs   ← Migration version 1
    m2-item-weight.mjs        ← Migration version 2
    …
```

### Key files

| File | Responsibility |
|------|---------------|
| `migration.mjs` | Entry point; holds `CURRENT_SCHEMA_VERSION`; called from `acks.mjs` `ready` hook |
| `migration-util.mjs` | `MigrationUtil.markPropertyForDeletion()` — abstracts v13/v14 deletion syntax |
| `migration-base.mjs` | `MigrationBase` — base class; override `updateActor()` and/or `updateItem()` |
| `migration-list.mjs` | `MigrationList.fromVersionTo(from, to)` — filters and instantiates pending migrations |
| `migration-runner.mjs` | `MigrationRunner` — runs phases; handles world actors, items, token deltas, compendiums |
| `migrations/index.mjs` | Barrel file; add one export per migration class here |

---

## How Migrations Run

### Entry Point

`runMigrations()` in `migration.mjs` is called from the `ready` hook in `acks.mjs`:

```js
// src/acks.mjs
Hooks.once("ready", async () => {
  await runMigrations();
  // … rest of ready logic
});
```

Only the GM executes migrations — the function returns immediately for non-GM users.

### The `systemSchemaVersion` World Setting

The world setting `acks.systemSchemaVersion` (registered in `settings.mjs`) stores the last completed migration version as a plain integer. On first install it defaults to `0`.

```
worldSchemaVersion = game.settings.get("acks", "systemSchemaVersion")  // e.g. 0
CURRENT_SCHEMA_VERSION = 2 (defined in migration.mjs)

If worldSchemaVersion < CURRENT_SCHEMA_VERSION  →  migration runs
After successful migration  →  worldSchemaVersion is updated to CURRENT_SCHEMA_VERSION
```

`MigrationList.fromVersionTo(from, to)` selects only migration classes with `static version > from && version <= to`, so each migration runs exactly once across the life of a world.

### Migration Phases and `requiresFlush`

To support migrations that depend on previously committed DB state (e.g., a later migration that reads an item created by an earlier one), the runner splits the migration list into **phases** at every `requiresFlush` boundary:

```js
// In your migration class:
requiresFlush = true; // Flush DB after this migration before continuing
```

Each phase is a complete pass over all documents. Phases run in order. Within a phase, migrations run in ascending `static version` order.

**Example:** if migrations 1, 2, and 3 exist and migration 2 has `requiresFlush = true`:
- Phase 1: run migrations 1 and 2 over all documents, commit to DB
- Phase 2: run migration 3 over all documents, commit to DB

Most migrations do not need `requiresFlush`.

### What Gets Migrated

For each phase, the runner processes these targets in order:

1. **World Actors** — including all their embedded items.
2. **World Items** — standalone items in the Items sidebar.
3. **Unlinked Token Deltas** — `ActorDelta` data for unlinked tokens in every scene. Linked tokens are skipped because they derive their data from the world actor.
4. **World-owned Compendium Packs** — packs whose `packageType === "world"`. System and module packs are **read-only** at runtime and are not touched here; they rely on `migrateData()` instead.

For actors, the runner:
1. Calls `migration.updateActor(actorSource)` — you can mutate actor fields and the `items` array.
2. Calls `migration.updateItem(itemSource, actorSource)` for every embedded item.
3. Diffs the `items` array before/after by `_id` to determine creates, updates, and deletes.
4. Stamps `system._schemaVersion = CURRENT_SCHEMA_VERSION` on the actor and all its items.

For standalone world items, the runner calls `migration.updateItem(itemSource, null)` only.

---

## The `_schemaVersion` Field

Every actor and item data model inherits `_schemaVersion` from `BaseDataModel`:

```js
// src/module/data/common/base-data-model.mjs
static defineSchema() {
  return {
    _schemaVersion: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
  };
}
```

This field is **internal** — never display or edit it in sheets. It tracks the migration state per-document:

- `0` — never migrated (default for new and legacy documents).
- `N` — migrated up to version N.
- `=== CURRENT_SCHEMA_VERSION` — fully up-to-date, skip by both the runner and `migrateData()`.

The runner stamps `system._schemaVersion = CURRENT_SCHEMA_VERSION` at the end of every actor/item migration. `isCurrentSchema(source)` in `migration.mjs` is a guard used to skip already-migrated documents:

```js
export function isCurrentSchema(source) {
  return (source?._schemaVersion ?? 0) >= CURRENT_SCHEMA_VERSION;
}
```

---

## The `migrateData()` Safety Net

System-bundled compendium packs (e.g., `acks.acks-monsters`) are read-only at runtime. The migration runner cannot write to them. However, when Foundry loads a document from a read-only compendium it calls the static `migrateData(source)` method on the data model — this is Foundry's built-in in-memory migration hook.

`BaseDataModel.migrateData()` is the right place to put **in-memory equivalents** of your migration logic for read-only documents. Any migration that renames a field should also be reflected here so that compendium items work correctly even without a DB write.

Delegate the actual transformation logic to a shared template helper so both paths use identical code:

```js
// src/module/data/actor/templates/saving-throws.mjs
static migrateWandToImplements(source) {
  if (source.saves?.wand !== undefined && source.saves?.implements === undefined) {
    source.saves.implements = source.saves.wand;
  }
}
```

```js
// In your Migration class (updateActor):
SavingThrowsTemplate.migrateWandToImplements(source.system);

// In the data model (migrateData):
static migrateData(source) {
  if (isCurrentSchema(source)) return super.migrateData(source);
  SavingThrowsTemplate.migrateWandToImplements(source);
  return super.migrateData(source);
}
```

> **Pattern:** Put the transformation logic in a static method on the relevant template class (e.g. `SavingThrowsTemplate`, `ItemPhysicalTemplate`). Call it from both the migration `updateActor`/`updateItem` **and** the data model's `migrateData()`.

---

## Deleting DB Fields (v13 vs v14)

Foundry v13 uses a deprecated `"-=fieldName": null` prefix convention for deletions.  
Foundry v14 introduces `foundry.data.operators.ForcedDeletion` as the proper mechanism (the old syntax is removed in v16).

**Always use `MigrationUtil.markPropertyForDeletion()`** — it abstracts both versions:

```js
import MigrationUtil from "../migration-util.mjs";

// Deletes source.system.saves.wand from the DB, using ForcedDeletion on v14
// and the "-=" prefix on v13.
MigrationUtil.markPropertyForDeletion(source.system, "saves.wand");

// Supports dot-notation for nested keys:
MigrationUtil.markPropertyForDeletion(source.system, "movement.old");
```

The key must actually exist on the object or the call is a no-op. Always copy the value to its new name **before** marking the old key for deletion.

> **Do not** manually write `source.system["-=fieldName"] = null` or `new foundry.data.operators.ForcedDeletion()` in migration files. Use `MigrationUtil.markPropertyForDeletion()` instead.

---

## Step-by-Step: Adding a New Migration

### 1. Create the migration file

Create `src/module/migration/migrations/mN-description.mjs` where `N` is the next integer:

```js
import MigrationBase from "../runner/migration-base.mjs";
import MigrationUtil from "../migration-util.mjs";
// Import relevant template helpers as needed

export class MigrationNDescription extends MigrationBase {
  static version = N; // Must be unique and greater than all previous versions

  // Override only the method(s) you need.

  /** @param {object} source - Actor plain object. Mutate in place. */
  async updateActor(source) {
    // Rename a field:
    if (source.system.oldField !== undefined && source.system.newField === undefined) {
      source.system.newField = source.system.oldField;
      MigrationUtil.markPropertyForDeletion(source.system, "oldField");
    }
  }

  /**
   * @param {object} source       - Item plain object. Mutate in place.
   * @param {object|null} actorSource - Parent actor (null for world items).
   */
  async updateItem(source, actorSource = null) {
    if (source.type === "weapon" && source.system.someField !== undefined) {
      // transform source.system.someField
    }
  }
}
```

**Rules for `updateActor`:**
- Mutate `source.system.*` to change actor fields.
- To **add** an embedded item: push to `source.items` **without** an `_id`.
- To **remove** an embedded item: filter `source.items` by `_id`.
- Do NOT copy an existing item with its `_id` to "duplicate" it — the runner treats existing `_id`s as updates to the original.

**Rules for `updateItem`:**
- Mutate `source.system.*` item fields only.
- Do NOT add or remove items here — that belongs in `updateActor`.
- `actorSource` is `null` when migrating a standalone world item.

**Common patterns:**

```js
// A — Rename a field
if (source.system.oldName !== undefined && source.system.newName === undefined) {
  source.system.newName = source.system.oldName;
  MigrationUtil.markPropertyForDeletion(source.system, "oldName");
}

// B — Restructure a flat value into an object
if (typeof source.system.movement === "number") {
  const old = source.system.movement;
  source.system.movement = { exploration: old, combat: old * 3 };
}

// C — Type coercion
if (typeof source.system.details?.xp === "string") {
  source.system.details.xp = Number(source.system.details.xp) || 0;
}

// D — Add a new embedded item
if (!source.items.some((i) => i.type === "language" && i.name === "Common")) {
  source.items.push({ type: "language", name: "Common", system: {} }); // no _id!
}

// E — Remove an embedded item
source.items = source.items.filter((i) => i.type !== "money" || i.name !== "Obsolete Currency");

// F — Set a field from actor context (only possible in updateItem)
if (source.type === "ability" && source.system.classTag === undefined && actorSource) {
  source.system.classTag = actorSource.system.details.class ?? "";
}
```

### 2. Export from the barrel file

Add your new class to `src/module/migration/migrations/index.mjs`:

```js
export { Migration1IISavingThrows } from "./m1-ii-saving-throws.mjs";
export { Migration2ItemWeightToStone } from "./m2-item-weight.mjs";
export { MigrationNDescription } from "./mN-description.mjs"; // ← add this line
```

### 3. Bump `CURRENT_SCHEMA_VERSION`

In `src/module/migration/migration.mjs`, update the constant to the new version number:

```js
export const CURRENT_SCHEMA_VERSION = N; // bump to highest migration version when you add migrations
```

### 4. Update `defineSchema()` in the affected data model

Update the relevant data model(s) in `src/module/data/actor/` or `src/module/data/item/` to reflect the new schema (add the new field, remove the old one, change the type, etc.).

### 5. Add an in-memory equivalent to `migrateData()`

For the data model that owns the changed field, add or update `static migrateData(source)` to apply the same transformation in memory. This covers documents read from read-only compendium packs that cannot be written to by the runner.

```js
// Example: in CharacterData (or the relevant model)
static migrateData(source) {
  if (isCurrentSchema(source)) return super.migrateData(source);

  // Apply the same transformations as your migration's updateActor/updateItem,
  // but operating directly on source (not source.system — migrateData receives system data).
  SomeTemplate.migrateSomething(source);

  return super.migrateData(source);
}
```

Import `isCurrentSchema` at the top of the file:
```js
import { isCurrentSchema } from "../../migration/migration.mjs";
```

### 6. Update compendium source JSON

Hand-edit the relevant JSON files under `src/packs/_source/` to reflect the new schema, then rebuild the LevelDB databases:

```bash
npm run packs:sourceToDatabase
```

### Checklist

- [ ] `mN-description.mjs` created with `static version = N`
- [ ] Class exported from `migrations/index.mjs`
- [ ] `CURRENT_SCHEMA_VERSION` bumped to `N` in `migration.mjs`
- [ ] `defineSchema()` updated in the affected data model(s)
- [ ] `migrateData()` updated with in-memory equivalent
- [ ] Compendium `_source` JSON updated + `npm run packs:sourceToDatabase`
- [ ] Dev-only `resetSchemaVersions()` call is **not** present in `migration.mjs`

---

## Migration File Reference

### `MigrationBase`

```
src/module/migration/runner/migration-base.mjs
```

| Member | Type | Description |
|--------|------|-------------|
| `static version` | `number` | Unique version number. Must be a positive integer greater than all previous migrations. |
| `version` | `number` | Instance copy of `static version`. |
| `requiresFlush` | `boolean` | Default `false`. Set to `true` if subsequent migrations depend on this migration's DB writes being committed first. |
| `async updateActor(source)` | method | Override to migrate actor data. Receives raw actor plain object. |
| `async updateItem(source, actorSource)` | method | Override to migrate item data. `actorSource` is the parent actor or `null`. |

### `MigrationUtil`

```
src/module/migration/migration-util.mjs
```

| Method | Description |
|--------|-------------|
| `static markPropertyForDeletion(obj, key)` | Marks a property for DB deletion, using `ForcedDeletion` on Foundry v14+ and the `"-="` prefix on v13. Supports dot-notation keys. No-op if the property does not exist. |

### `MigrationList`

```
src/module/migration/runner/migration-list.mjs
```

| Method | Description |
|--------|-------------|
| `static get all()` | All migration classes in ascending version order. |
| `static fromVersionTo(from, to)` | Returns instantiated migration objects for all versions `> from` and `<= to`. |

### `MigrationRunner`

```
src/module/migration/runner/migration-runner.mjs
```

| Method | Description |
|--------|-------------|
| `needsMigration(current, latest)` | Returns `true` if `current < latest`. |
| `async runMigration()` | Runs all phases across world actors, world items, scene tokens, and world compendiums. |
| `static async resetSchemaVersions(resetVersion = 0)` | **Dev only.** Resets all `_schemaVersion` fields and the world setting to the given version. Never call in production. |

---

## Development Tips

### Re-running migrations during development

To test your migration from scratch without starting a new world, temporarily uncomment this line in `migration.mjs`:

```js
await MigrationRunner.resetSchemaVersions(); // FIXME: reset for testing; remove before releasing
```

This resets `_schemaVersion` on all actors, items, token deltas, and the `systemSchemaVersion` world setting to `0`, causing all pending migrations to re-run on the next page reload.

**Always remove this line before committing or releasing.**

### Console logging

The runner logs progress to the browser console:
```
ACKS | Starting migration from schema v1 to v2…
ACKS | Migrating 3 world actor(s)…
ACKS | Migrating 5 world item(s)…
ACKS | Migration to schema v2 complete.
```

Check the browser console (`F12`) for the full trace and any errors.

### Guard conditions in migration methods

Always write idempotent, defensive migration code. Check that the old value is present **and** the new value is absent before transforming. This prevents double-applying a migration if `resetSchemaVersions()` is used:

```js
// Good — idempotent
if (source.system.oldField !== undefined && source.system.newField === undefined) {
  source.system.newField = source.system.oldField;
  MigrationUtil.markPropertyForDeletion(source.system, "oldField");
}

// Bad — would overwrite already-migrated data
source.system.newField = source.system.oldField;
```

### Shared transformation logic

When a transformation must appear in both a migration `updateActor`/`updateItem` **and** a data model's `migrateData()`, extract it into a static method on the relevant template class (e.g., `SavingThrowsTemplate`, `ItemPhysicalTemplate`) so both callers use identical logic:

```
src/module/data/actor/templates/saving-throws.mjs   ← static migrateWandToImplements(source)
src/module/data/item/templates/item-physical-template.mjs  ← static migrateWeightToWeight6(source)
```

---

## Compendium Source Files

System compendium packs are read-only at runtime. After writing a migration you must also update the source JSON so that freshly compiled databases are already at the current schema:

1. **Hand-edit** the relevant JSON files under `src/packs/_source/<pack-name>/`.
2. Set `"_schemaVersion": N` (the new `CURRENT_SCHEMA_VERSION`) in every affected document's `system` object.
3. Apply the same field transformations that the migration performs.
4. Rebuild the LevelDB databases:

```bash
npm run packs:sourceToDatabase
```

For large packs, run `npm run packs:databaseToSource` first to dump the current state to JSON, edit, then repack. Use `npm run packs:cleanupSource` to strip ownership and sourceId noise before committing.


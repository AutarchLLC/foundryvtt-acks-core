# AGENTS.md — ACKS II for Foundry VTT

## What This Is

A Foundry VTT **game system** (id: `acks`) implementing the Adventurer Conqueror King System II tabletop RPG.
Vanilla ES modules (`.mjs`), no TypeScript, no framework.

**Targets Foundry v14 and later only** (`system.json` → `compatibility.minimum: "14.359"`).
Use current v14 APIs directly: namespaced classes (`foundry.applications.*`, `foundry.documents.*`,
`foundry.data.fields.*`), ApplicationV2 / DialogV2, `renderChatMessageHTML`, `ForcedDeletion`.
No compatibility shims for v13 or earlier, and avoid APIs Foundry has deprecated.

## Foundry Core Source (reference only)

`foundry/` (gitignored) contains directory junctions into a local Foundry v14 install:

```
foundry/client/      ← client-side JS (applications, documents, canvas, hooks)
foundry/common/      ← shared JS (data models, fields, document base classes, utils)
foundry/templates/   ← core Handlebars templates
foundry/public/      ← core CSS and assets
```

Read these to check how a Foundry class, hook or template actually behaves instead of guessing
from memory. Never edit them. They may be missing on other machines; recreate with
`New-Item -ItemType Junction -Path foundry\<dir> -Target <foundry>\resources\app\<dir>`.

## Architecture Overview

```
src/acks.mjs              ← entry point; init/setup/ready hooks, document classes, data models, sheet registration
src/system.json           ← system manifest
src/acks.css              ← single stylesheet
src/module/
  config.mjs              ← ACKS config object (CONFIG.ACKS), incl. statusEffects
  constants.mjs           ← frozen enums (ACTOR_TYPE, ITEM_TYPE, ROLL_TYPE, ATTACK_TYPE, …)
  _types.mjs              ← JSDoc @typedef declarations only (no runtime code)
  settings.mjs            ← game settings
  helpers.mjs             ← Handlebars helpers
  preloadTemplates.mjs    ← template preloading
  data/
    common/               ← BaseDataModel (_schemaVersion field, migrateData base)
    actor/                ← CharacterData, MonsterData + templates/ (shared schema pieces)
    item/                 ← WeaponData, SpellData, … + templates/, fields/ (custom fields)
  documents/              ← AcksActor, AcksItem, ACKSToken, ACKSChatMessage
  actor/                  ← actor sheets (ApplicationV2): base, character, monster
  item/                   ← item sheets (ApplicationV2): generic item, weapon
  apps/                   ← standalone ApplicationV2 apps (party overview, tweaks, stat generator, chat commands, …)
  dialog/                 ← one dialog per file, each a default-exported async function;
                            index.mjs re-exports them (imported as `* as ACKSDialog`)
  throw/                  ← throw objects (AcksAttackThrow: formula, modifiers, target value)
  effect/                 ← active effect utilities
  hooks/                  ← isolated hook handlers (hotbar-drop, render-actor-directory)
  util/                   ← generic helpers (acks-utility, html-util)
  dice.mjs                ← AcksDice (roll logic, dispatches on ROLL_TYPE)
  combat.mjs, combat-helper.mjs ← ACKS combat / initiative rules
  chat.mjs                ← chat message buttons and handlers
  party.mjs               ← party sheet entry point
  migration/              ← schema migrations (see below)
src/templates/            ← Handlebars templates: actors/, items/, apps/, dialog/, chat/
src/lang/en.json          ← localisation strings (all keys under ACKS.)
src/ruledata/             ← static rule tables loaded at runtime (internal_tables.json)
src/assets/               ← images and icons
src/packs/                ← compiled LevelDB compendiums (gitignored except _source)
src/packs/_source/        ← editable JSON source for all compendium entries
scripts/                  ← Node build / pack / link scripts
e2e/                      ← Playwright tests, test server launcher, fixture world (see docs/e2e-testing.md)
docs/                     ← MIGRATION.md, RELEASE_PROCESS.md, dev-setup.md, dev-workflow.md, e2e-testing.md
```

Actor types: `character`, `monster`.
Item types: `item`, `weapon`, `armor`, `spell`, `ability` (proficiency), `language`, `money`, `bundle`.
Always refer to them via `ACTOR_TYPE` / `ITEM_TYPE` from `constants.mjs`, not string literals.

## Developer Workflows

### Build, lint, format

```bash
npm install
npm run build          # clean → rollup+terser (dist/acks.mjs) → postcss/autoprefixer (dist/acks.css)
npm run lint           # eslint ./src
npm run format:check   # prettier, whole repo
npm run format:fix
```

`dist/` is the release artifact. During development Foundry loads `src/` directly through a
symlink, so no build step is needed. CSS, `.hbs` and lang files hot-reload (`system.json` → `flags.hotReload`).

### Link `src/` into Foundry

```bash
npm run link           # prompts for the Foundry Data path, links Data/systems/acks → src/
```

### Compendium packs

JSON source in `src/packs/_source/<pack>/` is the source of truth; LevelDB in `src/packs/<pack>/` is compiled.

```bash
npm run packs:sourceToDatabase   # _source JSON → LevelDB (after hand-editing JSON)
npm run packs:databaseToSource   # LevelDB → _source JSON (after editing in the Foundry UI)
npm run packs:cleanupSource      # strip ownership / sourceId noise from _source
```

File names are slugified via `slugify()` in `scripts/common.mjs`.

### Tests

End-to-end tests run the system in a real Foundry server with Playwright. See `docs/e2e-testing.md`.
They need a local licensed Foundry install configured in `e2e/foundry.config.json`.

```bash
npm run test:e2e        # starts a throwaway Foundry server (.foundry-test/, world acks-e2e) and runs e2e/tests
npm run foundry:test    # start that server by hand (http://localhost:30001; join as Gamemaster, no password)
```

Verify behaviour changes in Foundry: add or extend a spec in `e2e/tests/` when practical. Otherwise
check by hand with `npm run foundry:test`.

## Code Conventions

- **Foundry globals** are declared per file with `/* global foundry, game, CONFIG */` (only those
  used) and never imported. Destructure namespaced classes at module top, e.g.
  `const { HandlebarsApplicationMixin } = foundry.applications.api;`.
- **Sheets and apps** use `HandlebarsApplicationMixin(ApplicationV2 / ActorSheetV2 / ItemSheetV2)`.
  Never use the AppV1 classes (`Application`, `FormApplication`, `foundry.appv1.*`).
- **Dialogs** use `foundry.applications.api.DialogV2`. Add a new dialog as its own file in
  `dialog/` and re-export it from `dialog/index.mjs`.
- **Data models** extend `BaseDataModel` (items extend `ItemBaseData`; never `TypeDataModel` directly) and build `defineSchema()`
  from `foundry.data.fields.*`. Shared schema pieces live in `data/*/templates/`.
- **Rolls**: roll types are centralised in `ROLL_TYPE`; general roll logic belongs in `dice.mjs`.
  Attack throws are modelled by `AcksAttackThrow` (`throw/attack-throw.mjs`).
- **Localisation**: every user-facing string goes in `src/lang/en.json` under `ACKS.` and is read
  with `game.i18n.localize()` / `game.i18n.format()`. Several `CONFIG.ACKS` sub-objects are
  localised automatically in the `setup` hook.
- **System id** is `acks` everywhere: settings (`game.settings.get("acks", …)`), socket
  (`system.acks`), compendiums (`acks.acks-monsters`), paths (`systems/acks/…`).
- **JSDoc** public functions and classes; put shared typedefs in `_types.mjs`.
- **Do not modify** `package.json`, `package-lock.json`, or anything in `.github/` without filing
  an issue first (see `docs/dev-setup.md`).

## Where to Start for Common Tasks

| Task | Start here |
|------|-----------|
| Add an actor field | `src/module/data/actor/<type>-data.mjs` → `defineSchema()` |
| Add an item type | `src/module/data/item/`, add to `ITEM_TYPE`, register in `acks.mjs` (`CONFIG.Item.dataModels`) |
| Add a Handlebars helper | `src/module/helpers.mjs` |
| Add a game setting | `src/module/settings.mjs` |
| Change roll behaviour | `src/module/dice.mjs`, `ROLL_TYPE` in `constants.mjs` |
| Change attack throws | `src/module/throw/attack-throw.mjs`, `dialog/dialog-get-attack-throw-details.mjs` |
| Add a dialog | new file in `src/module/dialog/`, export from `dialog/index.mjs` |
| Add a combat hook | `src/module/combat-helper.mjs`, wire it in `acks.mjs` |
| Add a status effect | `statusEffects` in `src/module/config.mjs` |
| Add / change a compendium entry | JSON under `src/packs/_source/`, then `npm run packs:sourceToDatabase` |
| Rename / remove / restructure stored fields | add a migration, see below and `docs/MIGRATION.md` |

## Data Model Migration

> **Full guide:** `docs/MIGRATION.md`

Migrations are permanent, one-time DB writes run on the `ready` hook (GM only), gated by the
`systemSchemaVersion` world setting (an integer). Each actor and item also stores `_schemaVersion`
(from `BaseDataModel`). Documents already at `CURRENT_SCHEMA_VERSION` are skipped. New documents are
stamped with it in `BaseDataModel._preCreate` unless their creation data already names a version.

```
src/module/migration/
  migration.mjs           ← runMigrations(); re-exports CURRENT_SCHEMA_VERSION, isCurrentSchema()
  schema-version.mjs      ← CURRENT_SCHEMA_VERSION, isCurrentSchema() (no imports, safe for data models)
  migration-util.mjs      ← helpers (e.g. field deletion via ForcedDeletion)
  runner/                 ← MigrationBase, MigrationList, MigrationRunner
  migrations/             ← one file per migration (m1 … mN); index.mjs is the barrel
```

### Adding a migration

1. Create `migrations/mN-description.mjs` extending `MigrationBase` with `static version = N`.
2. Export it from `migrations/index.mjs`.
3. Bump `CURRENT_SCHEMA_VERSION` in `schema-version.mjs` to `N`.
4. Add the in-memory equivalent to the affected model's `static migrateData(source)`, after the
   `if (isCurrentSchema(source)) return super.migrateData(source);` guard. This covers read-only
   system and module compendiums the runner cannot write to.
5. Update `defineSchema()` in the affected data model.
6. Update compendium JSON under `src/packs/_source/`, then `npm run packs:sourceToDatabase`.

### Rules

- `updateActor(source)`: mutate `source.system.*` and manage the `source.items` roster (add/remove).
- `updateItem(source, actorSource)`: mutate item fields only; never touch `source.items`.
- Delete a stored field with `new foundry.data.operators.ForcedDeletion()`. Do not use the
  deprecated `"-=field": null` syntax.
- Set `requiresFlush = true` when a later migration in the same release depends on this one's
  committed DB state (see `m3-languages-to-items.mjs`).
- The runner migrates world actors, world items, scene token deltas and world-owned compendiums.
- Leave the `resetSchemaVersions()` dev call in `migration.mjs` commented out in committed code.
- Data models and the runner import `CURRENT_SCHEMA_VERSION` / `isCurrentSchema` from
  `schema-version.mjs`, never from `migration.mjs` (that would create a circular import through the migrations).

/* global game, Actor, Item, foundry, ui */

/**
 * The current data schema version.
 * Bump this to the highest *MigrationBase.version* number whenever you add a
 * new migration class. Must be a plain integer — matches the version numbers
 * used on individual MigrationBase subclasses in migration/migrations/.
 *
 * Documents whose system._schemaVersion === CURRENT_SCHEMA_VERSION are
 * considered fully migrated and are skipped by both the bulk migrator and
 * the migrateData() safety-net.
 *
 * @type {number}
 */
export const CURRENT_SCHEMA_VERSION = 0; // bump to highest migration version when you add migrations

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run all pending data migrations.
 *
 * - Only the GM executes migrations.
 * - Gated by the "systemSchemaVersion" world setting; runs at most once per
 *   CURRENT_SCHEMA_VERSION bump.
 * - Covers: world actors + their embedded items, world items, and unlinked
 *   token deltas in every scene.
 * - Compendium packs must be migrated separately via JSON source edits:
 *     npm run packs:databaseToSource  → edit JSON  → npm run packs:sourceToDatabase
 */
export async function runMigrations() {
  if (!game.user.isGM) {
    return;
  }

  /** @type number */
  const stored = game.settings.get("acks", "systemSchemaVersion") ?? 0;
  if (CURRENT_SCHEMA_VERSION <= stored) {
    return;
  }

  console.log(`ACKS | Starting migration from schema v${stored} to v${CURRENT_SCHEMA_VERSION}…`);
  const notice = ui.notifications.warn(`ACKS | Data migration in progress — do not close the browser.`, {
    permanent: true,
  });

  try {
    await _migrateWorldActors();
    await _migrateWorldItems();
    await _migrateSceneTokens();
    await game.settings.set("acks", "systemSchemaVersion", CURRENT_SCHEMA_VERSION);
    console.log(`ACKS | Migration to schema v${CURRENT_SCHEMA_VERSION} complete.`);
    ui.notifications.info(`ACKS | Migration to schema v${CURRENT_SCHEMA_VERSION} complete.`);
  } catch (err) {
    console.error("ACKS | Migration failed:", err);
    ui.notifications.error("ACKS | Migration failed. See browser console for details.", {
      permanent: true,
    });
  } finally {
    ui.notifications.remove?.(notice);
  }
}

/**
 * True when the given raw system data object is already at the current schema.
 * Call this at the top of every migrateData() override for a fast exit.
 *
 * @example
 * ```js
 * static migrateData(source) {
 *   if (isCurrentSchema(source)) return super.migrateData(source);
 *   // … field renames, type coercions …
 *   return super.migrateData(source);
 * }
 * ```
 * @param {object} source  Raw system data (the `source` arg of migrateData)
 * @returns {boolean}
 */
export function isCurrentSchema(source) {
  return (source?._schemaVersion ?? 0) >= CURRENT_SCHEMA_VERSION;
}

// ─── Bulk migration helpers ───────────────────────────────────────────────────

async function _migrateWorldActors() {
  const actorUpdates = [];
  const actorItemUpdates = new Map(); // actorId → Item update array

  for (const actor of game.actors) {
    const raw = actor.toObject();

    const actorUpdate = _buildActorUpdate(raw);
    if (actorUpdate) actorUpdates.push({ _id: actor.id, ...actorUpdate });

    const itemUpdates = [];
    for (const item of actor.items) {
      const itemUpdate = _buildItemUpdate(item.toObject());
      if (itemUpdate) itemUpdates.push({ _id: item.id, ...itemUpdate });
    }
    if (itemUpdates.length) actorItemUpdates.set(actor.id, itemUpdates);
  }

  if (actorUpdates.length) {
    console.log(`ACKS | Migrating ${actorUpdates.length} world actor(s)…`);
    await Actor.implementation.updateDocuments(actorUpdates);
  }

  for (const [actorId, itemUpdates] of actorItemUpdates) {
    const actor = game.actors.get(actorId);
    await Item.implementation.updateDocuments(itemUpdates, { parent: actor });
  }
}

async function _migrateWorldItems() {
  const itemUpdates = [];

  for (const item of game.items) {
    const update = _buildItemUpdate(item.toObject());
    if (update) itemUpdates.push({ _id: item.id, ...update });
  }

  if (itemUpdates.length) {
    console.log(`ACKS | Migrating ${itemUpdates.length} world item(s)…`);
    await Item.implementation.updateDocuments(itemUpdates);
  }
}

async function _migrateSceneTokens() {
  for (const scene of game.scenes) {
    const tokenUpdates = [];

    for (const token of scene.tokens) {
      // Linked tokens derive their data from the world actor (migrated above).
      if (token.actorLink) continue;

      // Unlinked tokens store actor overrides in token.delta.
      // Only bother if the delta carries system data at all.
      const deltaObj = token.delta?.toObject?.() ?? {};
      if (!deltaObj.system || Object.keys(deltaObj.system).length === 0) continue;

      if (isCurrentSchema(deltaObj.system)) continue;

      // Deep-clone so we can mutate safely, then apply actor-level transforms.
      const system = foundry.utils.deepClone(deltaObj.system);
      const changed = _migrateActorSystemInPlace(system);
      if (changed) tokenUpdates.push({ _id: token.id, "delta.system": system });
    }

    if (tokenUpdates.length) {
      console.log(`ACKS | Migrating ${tokenUpdates.length} unlinked token(s) in scene "${scene.name}"…`);
      await scene.updateEmbeddedDocuments("Token", tokenUpdates);
    }
  }
}

// ─── Per-document migration builders ─────────────────────────────────────────

/**
 * Build a Foundry update object for a single actor.
 * Returns null when no migration is needed (already current schema).
 *
 * Key syntax reminders:
 *   Set a nested field  →  "system.saves.implements.value": 16
 *   Delete a key        →  "system.saves.-=wand": null   (the "-=" prefix)
 *
 * @param {object} actorData  actor.toObject() result
 * @returns {object|null}     Partial update object, or null
 */
function _buildActorUpdate(actorData) {
  const system = actorData.system ?? {};
  if (isCurrentSchema(system)) return null;

  const update = {};

  // ── ADD ACTOR MIGRATIONS HERE ─────────────────────────────────────────────
  //
  // Each block should be guarded so it only runs when the old field exists,
  // making the function safe to call multiple times.
  //
  // Example A — rename a field:
  //   if ("wand" in (system.saves ?? {}) && !("implements" in (system.saves ?? {}))) {
  //     update["system.saves.implements"] = { value: system.saves.wand.value };
  //     update["system.saves.-=wand"] = null;
  //   }
  //
  // Example B — restructure a flat field into a SchemaField:
  //   if (typeof system.movement === "number") {
  //     update["system.movementacks"] = {
  //       exploration: system.movement * 10,
  //       combat:      system.movement * 3,
  //     };
  //     update["system.-=movement"] = null;
  //   }
  //
  // Example C — type coercion:
  //   if (typeof system.details?.xp === "string") {
  //     update["system.details.xp"] = Number(system.details.xp) || 0;
  //   }
  //
  // ─────────────────────────────────────────────────────────────────────────

  update["system._schemaVersion"] = CURRENT_SCHEMA_VERSION;
  return update;
}

/**
 * Build a Foundry update object for a single item.
 * Returns null when no migration is needed.
 *
 * @param {object} itemData  item.toObject() result
 * @returns {object|null}
 */
function _buildItemUpdate(itemData) {
  const system = itemData.system ?? {};
  if (isCurrentSchema(system)) return null;

  const update = {};

  // ── ADD ITEM MIGRATIONS HERE ──────────────────────────────────────────────
  //
  // Guard each block on old-field existence, same pattern as actor above.
  //
  // ─────────────────────────────────────────────────────────────────────────

  update["system._schemaVersion"] = CURRENT_SCHEMA_VERSION;
  return update;
}

/**
 * Mutate a raw system object in-place (for unlinked token deltas).
 * Must mirror the logic in _buildActorUpdate, but operates directly on the
 * object rather than building dot-notation update keys.
 *
 * @param {object} system  Raw system data, already deep-cloned
 * @returns {boolean}      True if any change was made
 */
function _migrateActorSystemInPlace(system) {
  if (isCurrentSchema(system)) return false;

  // ── MIRROR OF _buildActorUpdate LOGIC ────────────────────────────────────
  //
  // Example A — rename:
  //   if (system.saves?.wand && !system.saves?.implements) {
  //     system.saves.implements = { value: system.saves.wand.value };
  //     delete system.saves.wand;
  //   }
  //
  // ─────────────────────────────────────────────────────────────────────────

  system._schemaVersion = CURRENT_SCHEMA_VERSION;
  return true;
}

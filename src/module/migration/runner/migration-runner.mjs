/* global foundry, game, Actor, Item */
import { CURRENT_SCHEMA_VERSION, isCurrentSchema } from "../migration.mjs";

export default class MigrationRunner {
  /** @type {MigrationBase[]} */
  #migrations;

  /**
   *
   * @param {MigrationBase[]} migrations
   */
  constructor(migrations) {
    this.#migrations = migrations.sort((a, b) => a.version - b.version);
  }

  /**
   * Determine whether a migration is needed.
   * @param {number} currentVersion
   * @param {number} latestVersion
   * @return {boolean}
   */
  needsMigration(currentVersion, latestVersion) {
    return currentVersion < latestVersion;
  }

  async runMigration() {
    for (const phase of this.#buildPhases()) {
      await this.#migrateWorldActors(phase);
      await this.#migrateWorldItems(phase);
      await this.#migrateSceneTokens(phase);
    }
  }

  /**
   * Split #migrations into ordered phases at every requiresFlush boundary.
   * For example, if a migration creates an item, we need to push it to the database in order to get its id.
   * This way if a later migration depends on the item actually being created, it will work.
   */
  #buildPhases() {
    const phases = [];
    const current = [];
    for (const migration of this.#migrations) {
      current.push(migration);
      if (migration.requiresFlush) {
        phases.push([...current]);
        current.length = 0;
      }
    }
    if (current.length) {
      phases.push(current);
    }
    return phases;
  }

  /**
   * Migrate all world actors, including their embedded items.
   * @param {MigrationBase[]} migrations
   * @return {Promise<void>}
   */
  async #migrateWorldActors(migrations) {
    const actorUpdates = [];
    for (const actor of game.actors) {
      const raw = actor.toObject();
      const actorUpdate = await this.#buildActorUpdate(raw, migrations);
      if (actorUpdate) {
        await this.#commitActorItems(actor, raw.items, actorUpdate);
        actorUpdates.push({ _id: actor.id, ...actorUpdate });
      }
    }
    if (actorUpdates.length) {
      console.log(`ACKS | Migrating ${actorUpdates.length} world actor(s)…`);
      await Actor.implementation.updateDocuments(actorUpdates);
    }
  }

  /**
   * Migrate all world items.
   * @param {MigrationBase[]} migrations
   * @return {Promise<void>}
   */
  async #migrateWorldItems(migrations) {
    const itemUpdates = [];
    for (const item of game.items) {
      const update = await this.#buildItemUpdate(item.toObject(), migrations);
      if (update) {
        itemUpdates.push({ _id: item.id, ...update });
      }
    }
    if (itemUpdates.length) {
      console.log(`ACKS | Migrating ${itemUpdates.length} world item(s)…`);
      await Item.implementation.updateDocuments(itemUpdates);
    }
  }

  /**
   * Migrate unlinked token deltas on all scenes. Linked tokens are skipped since they derive their data
   * from the world actor, which is migrated before.
   * @param {MigrationBase[]} migrations
   * @return {Promise<void>}
   */
  async #migrateSceneTokens(migrations) {
    for (const scene of game.scenes) {
      for (const token of scene.tokens) {
        // Linked tokens derive their data from the world actor (migrated above).
        if (token.actorLink || !token.delta) {
          continue;
        }

        const deltaObj = token.delta.toObject();
        if (!deltaObj.system || Object.keys(deltaObj.system).length === 0) {
          continue;
        }
        if (isCurrentSchema(deltaObj.system)) {
          continue;
        }

        // Build a filtered clone — exclude tombstone records before migrating.
        // deltaObj.items contains only overridden/added items + tombstone markers.
        const originalItems = (deltaObj.items ?? []).filter((i) => !i._tombstone);
        const source = foundry.utils.deepClone(deltaObj);
        source.items = foundry.utils.deepClone(originalItems);

        // Shared migration core — same loop as world actors.
        await this.#applyActorMigrations(source, migrations);

        // Sync item roster changes through the synthetic actor.
        const syntheticActor = token.actor;
        if (syntheticActor) {
          await this.#commitActorItems(syntheticActor, originalItems, source);
        }

        // Write migrated system data back via the ActorDelta path on the TokenDocument.
        await scene.updateEmbeddedDocuments("Token", [{ _id: token.id, "delta.system": source.system }]);
      }
    }
  }

  /**
   * Deep-clone actorData, apply all migrations, stamp _schemaVersion on actor + items.
   * Returns null if already at current schema.
   *
   * @param {object} actorData
   * @param {MigrationBase[]} migrations
   * @returns {Promise<object|null>}
   */
  async #buildActorUpdate(actorData, migrations) {
    if (isCurrentSchema(actorData.system ?? {})) {
      return null;
    }
    const update = foundry.utils.deepClone(actorData);
    return this.#applyActorMigrations(update, migrations);
  }

  /**
   * Deep-clone itemData, apply all item migrations, stamp _schemaVersion.
   * Returns null if already at current schema.
   *
   * @param {object} itemData  item.toObject() result
   * @param {MigrationBase[]} migrations
   * @returns {Promise<object|null>}
   */
  async #buildItemUpdate(itemData, migrations) {
    if (isCurrentSchema(itemData.system ?? {})) {
      return null;
    }
    const update = foundry.utils.deepClone(itemData);
    for (const migration of migrations) {
      await migration.updateItem(update, null);
    }
    foundry.utils.setProperty(update, "system._schemaVersion", CURRENT_SCHEMA_VERSION);
    return update;
  }

  /**
   * Run all actor + item migrations on an already-cloned source object.
   * Stamps _schemaVersion on the actor and every embedded item.
   * Mutates and returns source.
   *
   * @param {object} source      Actor plain object (already deep-cloned). Mutated in place.
   * @param {MigrationBase[]} migrations
   * @returns {Promise<object>}
   */
  async #applyActorMigrations(source, migrations) {
    for (const migration of migrations) {
      await migration.updateActor(source);
      for (const item of source.items ?? []) {
        await migration.updateItem(item, source);
      }
    }
    foundry.utils.setProperty(source, "system._schemaVersion", CURRENT_SCHEMA_VERSION);
    for (const item of source.items ?? []) {
      foundry.utils.setProperty(item, "system._schemaVersion", CURRENT_SCHEMA_VERSION);
    }
    return source;
  }

  /**
   * Diff items before/after migration and write creates/deletes/updates to the DB.
   * Removes the `.items` key from actorUpdate (embedded docs are managed separately).
   *
   * @param {Actor} actor            Live Actor (or synthetic token actor) document.
   * @param {object[]} originalItems Array of item plain objects before migration.
   * @param {object} actorUpdate     Migrated actor plain object. Mutated: .items deleted.
   */
  async #commitActorItems(actor, originalItems, actorUpdate) {
    const originalIds = new Set((originalItems ?? []).map((i) => i._id));
    const updatedItems = actorUpdate.items ?? [];
    const updatedIds = new Set(updatedItems.filter((i) => i._id).map((i) => i._id));

    const deletedIds = [...originalIds].filter((id) => !updatedIds.has(id));
    if (deletedIds.length) {
      await actor.deleteEmbeddedDocuments("Item", deletedIds);
    }

    const createdItems = updatedItems.filter((i) => !i._id);
    if (createdItems.length) {
      await actor.createEmbeddedDocuments("Item", createdItems);
    }

    const itemUpdates = updatedItems.filter((i) => i._id && originalIds.has(i._id));
    if (itemUpdates.length) {
      await actor.updateEmbeddedDocuments("Item", itemUpdates);
    }

    delete actorUpdate.items;
  }

  /**
   * Reset system._schemaVersion to 0 for all world actors (and their embedded items),
   * world items, and unlinked token deltas in every scene.
   *
   * Use this in development to re-run migrations from scratch:
   *   await MigrationRunner.resetSchemaVersions();
   *   await runMigrations();
   *
   * <b>!!!Never call this in production.!!!</b>
   *
   * @param {number} resetVersion  The version to reset to. Defaults to 0.
   */
  static async resetSchemaVersions(resetVersion = 0) {
    if (!game.user.isGM) {
      return;
    }
    console.warn(`ACKS | resetSchemaVersions() — resetting all schema versions to ${resetVersion}.`);

    // World actors + embedded items
    const actorUpdates = [];
    for (const actor of game.actors) {
      actorUpdates.push({ _id: actor.id, "system._schemaVersion": resetVersion });
      const itemUpdates = actor.items.map((i) => ({ _id: i.id, "system._schemaVersion": resetVersion }));
      if (itemUpdates.length) {
        await actor.updateEmbeddedDocuments("Item", itemUpdates);
      }
    }
    if (actorUpdates.length) {
      await Actor.implementation.updateDocuments(actorUpdates);
    }

    // World items
    const itemUpdates = game.items.map((i) => ({ _id: i.id, "system._schemaVersion": resetVersion }));
    if (itemUpdates.length) {
      await Item.implementation.updateDocuments(itemUpdates);
    }

    // Unlinked token deltas
    for (const scene of game.scenes) {
      const tokenUpdates = [];
      for (const token of scene.tokens) {
        if (token.actorLink) {
          continue;
        }
        const deltaObj = token.delta?.toObject?.() ?? {};
        if (!deltaObj.system || Object.keys(deltaObj.system).length === 0) {
          continue;
        }
        tokenUpdates.push({ _id: token.id, "delta.system._schemaVersion": resetVersion });
      }
      if (tokenUpdates.length) {
        await scene.updateEmbeddedDocuments("Token", tokenUpdates);
      }
    }

    await game.settings.set("acks", "systemSchemaVersion", resetVersion);
    console.log("ACKS | resetSchemaVersions() complete.");
  }
}

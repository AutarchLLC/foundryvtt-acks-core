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

  needsMigration(currentVersion, latestVersion) {
    return currentVersion < latestVersion;
  }

  async runMigration() {
    // We might want to break the migration into phases.
    // For example, if a migration creates an item, we need to push it to the database in order to get its id.
    // This way if a later migration depends on the item actually being created, it will work.
    const migrationPhases = [];
    const migrationsInPhase = [];

    for (const migration of this.#migrations) {
      migrationsInPhase.push(migration);
      if (migration.requiresFlush) {
        migrationPhases.push([...migrationsInPhase]);
        migrationsInPhase.length = 0;
      }
    }
    if (migrationsInPhase.length) {
      migrationPhases.push([...migrationsInPhase]);
    }

    for (const migrationPhase of migrationPhases) {
      await this.runMigrations(migrationPhase);
    }
  }

  async runMigrations(migrations) {
    if (migrations.length === 0) {
      return;
    }

    // Migrate World Actors
    await this.#migrateWorldActors(migrations);
    // Migrate World Items
    await this.#migrateWorldItems(migrations);
    // Migrate World Tokens from all Scenes
    await this.#migrateSceneTokens(migrations);
  }

  async #migrateWorldActors(migrations) {
    const actorUpdates = [];

    for (const actor of game.actors) {
      const raw = actor.toObject();
      const actorUpdate = await this.#buildActorUpdate(raw, migrations);

      if (actorUpdate) {
        await this.#processActorItems(actor, raw, actorUpdate);
        actorUpdates.push({ _id: actor.id, ...actorUpdate });
      }
    }

    if (actorUpdates.length) {
      console.log(`ACKS | Migrating ${actorUpdates.length} world actor(s)…`);
      await Actor.implementation.updateDocuments(actorUpdates);
    }
  }

  async #processActorItems(actor, raw, actorUpdate) {
    const originalIds = new Set(raw.items.map((i) => i._id));
    const updatedItems = actorUpdate.items ?? [];
    const updatedIds = new Set(updatedItems.filter((i) => i._id).map((i) => i._id));

    // Items removed by a migration
    const deletedIds = [...originalIds].filter((id) => !updatedIds.has(id));
    if (deletedIds.length) {
      await actor.deleteEmbeddedDocuments("Item", deletedIds);
    }

    // Items added by a migration (no _id = new)
    const createdItems = updatedItems.filter((i) => !i._id);
    if (createdItems.length) {
      await actor.createEmbeddedDocuments("Item", createdItems);
    }

    // Existing items updated in-place during #buildActorUpdate
    const itemUpdates = updatedItems.filter((i) => i._id && originalIds.has(i._id));
    if (itemUpdates.length) {
      await actor.updateEmbeddedDocuments("Item", itemUpdates);
    }

    delete actorUpdate.items;
  }

  async #migrateSceneTokens(migrations) {
    for (const scene of game.scenes) {
      for (const token of scene.tokens) {
        // Linked tokens derive their data from the world actor (migrated above).
        if (token.actorLink) {
          continue;
        }

        // The delta is the sparse set of overrides on top of the base actor.
        // Only proceed if the delta carries system data at all.
        const delta = token.delta;
        if (!delta) {
          continue;
        }

        const deltaObj = delta.toObject();
        if (!deltaObj.system || Object.keys(deltaObj.system).length === 0) {
          continue;
        }
        if (isCurrentSchema(deltaObj.system)) {
          continue;
        }

        // Build a migration target from delta-only data (sparse — only overridden fields).
        // Migrations guard every field access, so operating on partial data is safe.
        // deltaObj.items contains only overridden/added items and tombstone records.
        const deltaTarget = foundry.utils.deepClone(deltaObj);
        deltaTarget.items = (deltaTarget.items ?? []).filter((i) => !i._tombstone);

        for (const migration of migrations) {
          await migration.updateActor(deltaTarget);
          for (const item of deltaTarget.items) {
            await migration.updateItem(item, deltaTarget);
          }
        }

        foundry.utils.setProperty(deltaTarget, "system._schemaVersion", CURRENT_SCHEMA_VERSION);
        for (const item of deltaTarget.items) {
          foundry.utils.setProperty(item, "system._schemaVersion", CURRENT_SCHEMA_VERSION);
        }

        // Diff items against the original delta items (not the full merged actor).
        const syntheticActor = token.actor;
        if (syntheticActor) {
          const originalIds = new Set(deltaObj.items?.filter((i) => !i._tombstone).map((i) => i._id) ?? []);
          const updatedItems = deltaTarget.items ?? [];
          const updatedIds = new Set(updatedItems.filter((i) => i._id).map((i) => i._id));

          const deletedIds = [...originalIds].filter((id) => !updatedIds.has(id));
          if (deletedIds.length) await syntheticActor.deleteEmbeddedDocuments("Item", deletedIds);

          const createdItems = updatedItems.filter((i) => !i._id);
          if (createdItems.length) await syntheticActor.createEmbeddedDocuments("Item", createdItems);

          const itemUpdates = updatedItems.filter((i) => i._id && originalIds.has(i._id));
          if (itemUpdates.length) await syntheticActor.updateEmbeddedDocuments("Item", itemUpdates);
        }

        // Write migrated system data back via "delta.system" — the correct key path
        // for reaching into the ActorDelta embedded on a TokenDocument.
        // Using token.id (NOT actor.id) as the identifier for the token document.
        await scene.updateEmbeddedDocuments("Token", [{ _id: token.id, "delta.system": deltaTarget.system }]);
      }
    }
  }

  async #migrateWorldItems(migrations) {
    const itemUpdates = [];

    for (const item of game.items) {
      const raw = item.toObject();
      const update = await this.#buildItemUpdate(raw, migrations);
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
   *
   * @param {object} actorData
   * @param {MigrationBase[]} migrations
   * @return {Promise<object|null>}
   */
  async #buildActorUpdate(actorData, migrations) {
    const system = actorData.system ?? {};
    if (isCurrentSchema(system)) {
      return null;
    }

    const update = foundry.utils.deepClone(actorData);

    for (const migration of migrations) {
      await migration.updateActor(update);
      for (const item of update.items ?? []) {
        await migration.updateItem(item, update);
      }
    }

    foundry.utils.setProperty(update, "system._schemaVersion", CURRENT_SCHEMA_VERSION);
    for (const item of update.items ?? []) {
      foundry.utils.setProperty(item, "system._schemaVersion", CURRENT_SCHEMA_VERSION);
    }

    return update;
  }

  /**
   * Build a Foundry update object for a single world item (no actor parent).
   * Returns null when no migration is needed.
   *
   * @param {object} itemData  item.toObject() result
   * @param {MigrationBase[]} migrations
   * @returns {Promise<object|null>}
   */
  async #buildItemUpdate(itemData, migrations) {
    const system = itemData.system ?? {};
    if (isCurrentSchema(system)) {
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
   * Reset system._schemaVersion to 0 for all world actors (and their embedded items),
   * world items, and unlinked token deltas in every scene.
   *
   * Use this in development to re-run migrations from scratch:
   *   const runner = new MigrationRunner(MigrationList.all);
   *   await runner.resetSchemaVersions();
   *   await runner.runMigration();
   *
   * Never call this in production — it will trigger a full re-migration for every GM
   * who opens the world.
   */
  static async resetSchemaVersions(resetVersion = 0) {
    if (!game.user.isGM) {
      return;
    }
    console.warn(`ACKS | resetSchemaVersions() called — all schema versions will be reset to ${resetVersion}.`);

    // ── World actors + embedded items ───────────────────────────────────────
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

    // ── World items ─────────────────────────────────────────────────────────
    const itemUpdates = game.items.map((i) => ({ _id: i.id, "system._schemaVersion": resetVersion }));
    if (itemUpdates.length) {
      await Item.implementation.updateDocuments(itemUpdates);
    }

    // ── Unlinked token deltas ───────────────────────────────────────────────
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

    // ── Reset the world-level migration version setting ─────────────────────
    await game.settings.set("acks", "systemSchemaVersion", resetVersion);

    console.log("ACKS | resetSchemaVersions() complete — run runMigration() to re-apply all migrations.");
  }
}

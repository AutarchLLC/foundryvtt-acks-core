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
  }

  async #migrateWorldActors(migrations) {
    const actorUpdates = [];

    for (const actor of game.actors) {
      const raw = actor.toObject();
      const actorUpdate = await this.#buildActorUpdate(raw, migrations);

      if (actorUpdate) {
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
        actorUpdates.push({ _id: actor.id, ...actorUpdate });
      }
    }

    if (actorUpdates.length) {
      console.log(`ACKS | Migrating ${actorUpdates.length} world actor(s)…`);
      await Actor.implementation.updateDocuments(actorUpdates);
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

    update["system._schemaVersion"] = CURRENT_SCHEMA_VERSION;
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

    update["system._schemaVersion"] = CURRENT_SCHEMA_VERSION;
    return update;
  }
}

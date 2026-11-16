/* global foundry, game, Actor, Item, ui */
import { CURRENT_SCHEMA_VERSION, isCurrentSchema } from "../schema-version.mjs";

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
      await this.#migrateWorldCompendiums(phase);
    }
  }

  /**
   * Migrate all world-owned (unlockable) compendium packs.
   * System and module compendium packs are read-only at runtime and are skipped —
   * those rely on migrateData() as a safety net instead.
   * @param {MigrationBase[]} migrations
   * @return {Promise<void>}
   */
  async #migrateWorldCompendiums(migrations) {
    for (const pack of game.packs) {
      // Only world-owned packs are writable. System/module packs are read-only at runtime.
      if (pack.metadata.packageType !== "world") {
        continue;
      }

      const documentName = pack.documentName;
      if (documentName !== "Actor" && documentName !== "Item") {
        continue;
      }

      const wasLocked = pack.locked;
      if (wasLocked) {
        await pack.configure({ locked: false });
      }

      try {
        const documents = await pack.getDocuments();
        if (documentName === "Actor") {
          const actorUpdates = [];
          for (const actor of documents) {
            const raw = actor.toObject();
            const actorUpdate = await this.#buildActorUpdate(raw, migrations);
            if (actorUpdate) {
              await this.#commitActorEmbedded(actor, raw, actorUpdate);
              actorUpdates.push({ _id: actor.id, ...actorUpdate });
            }
          }
          if (actorUpdates.length) {
            console.log(`ACKS | Migrating ${actorUpdates.length} actor(s) in compendium "${pack.metadata.label}"…`);
            await pack.documentClass.updateDocuments(actorUpdates, { pack: pack.collection });
          }
        } else {
          const itemUpdates = [];
          for (const item of documents) {
            const update = await this.#buildItemUpdate(item.toObject(), migrations);
            if (update) {
              itemUpdates.push({ _id: item.id, ...update });
            }
          }
          if (itemUpdates.length) {
            console.log(`ACKS | Migrating ${itemUpdates.length} item(s) in compendium "${pack.metadata.label}"…`);
            await pack.documentClass.updateDocuments(itemUpdates, { pack: pack.collection });
          }
        }
      } catch (err) {
        ui.notifications.error(`ACKS | Failed to migrate compendium "${pack.metadata.label}": ${err.message}`);
        console.error(err);
      } finally {
        if (wasLocked) {
          await pack.configure({ locked: true });
        }
      }
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
        await this.#commitActorEmbedded(actor, raw, actorUpdate);
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
   *
   * A delta whose system data is overridden and behind the current schema is migrated in full.
   * A delta that only adds or overrides effects is migrated for its effects alone: migrations see the
   * synthetic actor's system data for context, but only effect changes are written.
   * Migrations see the synthetic actor's full effect list (base actor plus delta), and only the
   * effects that change end up in the delta.
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
        const hasSystem = deltaObj.system && Object.keys(deltaObj.system).length > 0;
        const migrateSystem = hasSystem && !isCurrentSchema(deltaObj.system);
        const hasEffects = (deltaObj.effects ?? []).some((e) => !e._tombstone);
        const syntheticActor = token.actor;
        if (!migrateSystem && !(hasEffects && syntheticActor)) {
          continue;
        }

        // Build a filtered clone — exclude tombstone records before migrating.
        // deltaObj.items contains only overridden/added items + tombstone markers.
        const originalItems = (deltaObj.items ?? []).filter((i) => !i._tombstone);
        const originalEffects = syntheticActor ? syntheticActor.effects.map((e) => e.toObject()) : [];
        const source = foundry.utils.deepClone(deltaObj);
        source.items = foundry.utils.deepClone(originalItems);
        source.effects = foundry.utils.deepClone(originalEffects);
        if (!migrateSystem) {
          source.system = syntheticActor.system.toObject();
        }

        // Shared migration core — same loop as world actors.
        await this.#applyActorMigrations(source, migrations);

        // Sync embedded changes through the synthetic actor.
        if (syntheticActor) {
          await this.#commitEmbedded(syntheticActor, "ActiveEffect", originalEffects, source.effects);
          if (migrateSystem) {
            await this.#commitEmbedded(syntheticActor, "Item", originalItems, source.items);
          }
        }

        // Write migrated system data back via the ActorDelta path on the TokenDocument.
        if (migrateSystem) {
          await scene.updateEmbeddedDocuments("Token", [{ _id: token.id, "delta.system": source.system }]);
        }
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
   * Write an actor's migrated items and effects to the DB, then remove them from actorUpdate
   * (embedded docs are managed separately from the actor update).
   *
   * @param {Actor} actor        Live Actor document.
   * @param {object} raw         Actor plain object before migration.
   * @param {object} actorUpdate Migrated actor plain object. Mutated: .items and .effects deleted.
   */
  async #commitActorEmbedded(actor, raw, actorUpdate) {
    await this.#commitEmbedded(actor, "Item", raw.items, actorUpdate.items);
    await this.#commitEmbedded(actor, "ActiveEffect", raw.effects, actorUpdate.effects);
    delete actorUpdate.items;
    delete actorUpdate.effects;
  }

  /**
   * Diff embedded documents before/after migration by _id and write creates/deletes/updates to the DB:
   *   - Entry without _id → created
   *   - Original _id missing from the result → deleted
   *   - Entry whose data changed → updated. Unchanged entries are not written, so a token delta
   *     gains no needless overrides of its base actor's documents.
   *
   * @param {Actor} actor           Live Actor (or synthetic token actor) document.
   * @param {string} documentName   Embedded document name, "Item" or "ActiveEffect".
   * @param {object[]} originals    Plain objects before migration.
   * @param {object[]} migrated     Plain objects after migration.
   */
  async #commitEmbedded(actor, documentName, originals = [], migrated = []) {
    const originalById = new Map(originals.map((d) => [d._id, d]));
    const migratedIds = new Set(migrated.filter((d) => d._id).map((d) => d._id));

    const deletedIds = [...originalById.keys()].filter((id) => !migratedIds.has(id));
    if (deletedIds.length) {
      await actor.deleteEmbeddedDocuments(documentName, deletedIds);
    }

    const created = migrated.filter((d) => !d._id);
    if (created.length) {
      await actor.createEmbeddedDocuments(documentName, created);
    }

    const updated = migrated.filter(
      (d) => originalById.has(d._id) && !foundry.utils.equals(originalById.get(d._id), d),
    );
    if (updated.length) {
      await actor.updateEmbeddedDocuments(documentName, updated);
    }
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

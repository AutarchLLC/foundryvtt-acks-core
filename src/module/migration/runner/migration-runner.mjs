/* global foundry, game, Actor, Item, ui */
import MigrationUtil from "../migration-util.mjs";

/**
 * Runs migrations over everything the GM can write: world actors and their embedded documents, world
 * items, unlinked token deltas and world-owned compendium packs.
 *
 * Migrations work on the stored data, read straight from the server (see
 * {@link MigrationUtil.fetchStoredSources}), never on loaded documents. By the time the runner starts,
 * `migrateData()` has already converted a loaded document's legacy fields in memory and schema cleaning
 * has dropped the keys the schema does not know, so a loaded document shows neither the legacy data a
 * migration reads nor the keys it deletes.
 *
 * For the same reason, the migrated `system` data is written as a whole: as a
 * `ForcedReplacement` with `diff: false`. Foundry's usual update diff compares against the loaded
 * document, which already looks migrated, and would drop the very values the migration set.
 * Flags an actor migration sets or changes are written alongside it.
 */
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
   * The schema version a document reaches once all the given migrations have run on it.
   * @param {MigrationBase[]} migrations
   * @returns {number}
   */
  static #targetVersion(migrations) {
    return Math.max(...migrations.map((migration) => migration.version));
  }

  /**
   * The schema version stored on a document's system data, 0 when there is none.
   * @param {object} source  Stored document data
   * @returns {number}
   */
  static #storedVersion(source) {
    return source?.system?._schemaVersion ?? 0;
  }

  /**
   * Migrate all world actors, including their embedded items and effects.
   * @param {MigrationBase[]} migrations
   * @return {Promise<void>}
   */
  async #migrateWorldActors(migrations) {
    const stored = await MigrationUtil.fetchStoredSources("Actor");
    const actorUpdates = [];
    for (const actor of game.actors) {
      const source = stored.get(actor.id);
      const update = source && (await this.#migrateActor(actor, source, migrations));
      if (update) {
        actorUpdates.push(update);
      }
    }
    if (actorUpdates.length) {
      console.log(`ACKS | Migrating ${actorUpdates.length} world actor(s)…`);
      await Actor.implementation.updateDocuments(actorUpdates, { diff: false });
    }
  }

  /**
   * Migrate all world items.
   * @param {MigrationBase[]} migrations
   * @return {Promise<void>}
   */
  async #migrateWorldItems(migrations) {
    const stored = await MigrationUtil.fetchStoredSources("Item");
    const itemUpdates = [];
    for (const item of game.items) {
      const source = stored.get(item.id);
      const update = source && (await this.#migrateItem(source, migrations));
      if (update) {
        itemUpdates.push(update);
      }
    }
    if (itemUpdates.length) {
      console.log(`ACKS | Migrating ${itemUpdates.length} world item(s)…`);
      await Item.implementation.updateDocuments(itemUpdates, { diff: false });
    }
  }

  /**
   * Migrate unlinked token deltas on all scenes. Linked tokens are skipped since they derive their data
   * from the world actor, which is migrated before.
   *
   * A delta whose system data is overridden and behind the target version is migrated in full.
   * A delta that only adds or overrides effects is migrated for its effects alone: migrations see the
   * synthetic actor's system data for context, but only effect changes are written.
   * Migrations see the synthetic actor's full effect list (base actor plus delta), and only the
   * effects that change end up in the delta.
   * @param {MigrationBase[]} migrations
   * @return {Promise<void>}
   */
  async #migrateSceneTokens(migrations) {
    const scenes = game.scenes.filter((scene) => scene.tokens.some((token) => !token.actorLink && token.delta));
    if (!scenes.length) {
      return;
    }
    const storedScenes = await MigrationUtil.fetchStoredSources("Scene");
    const targetVersion = MigrationRunner.#targetVersion(migrations);

    for (const scene of scenes) {
      const storedTokens = new Map((storedScenes.get(scene.id)?.tokens ?? []).map((token) => [token._id, token]));
      for (const token of scene.tokens) {
        // Linked tokens derive their data from the world actor (migrated above).
        const deltaObj = storedTokens.get(token.id)?.delta;
        if (token.actorLink || !token.delta || !deltaObj) {
          continue;
        }

        const hasSystem = deltaObj.system && Object.keys(deltaObj.system).length > 0;
        const migrateSystem = hasSystem && MigrationRunner.#storedVersion(deltaObj) < targetVersion;
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
          // Context only: this system data is not written. Effect migrations run whatever its version.
          source.system = { ...syntheticActor.system.toObject(), _schemaVersion: 0 };
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

        // Write migrated system data and flags back via the ActorDelta path on the TokenDocument.
        if (migrateSystem) {
          const { _id, ...delta } = MigrationRunner.#actorUpdate(deltaObj, source);
          await scene.updateEmbeddedDocuments("Token", [{ _id: token.id, delta }], { diff: false });
        }
      }
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
        const stored = await MigrationUtil.fetchStoredSources(documentName, pack.collection);
        const documents = await pack.getDocuments();
        const updates = [];
        for (const document of documents) {
          const source = stored.get(document.id);
          if (!source) {
            continue;
          }
          const update =
            documentName === "Actor"
              ? await this.#migrateActor(document, source, migrations)
              : await this.#migrateItem(source, migrations);
          if (update) {
            updates.push(update);
          }
        }
        if (updates.length) {
          console.log(`ACKS | Migrating ${updates.length} document(s) in compendium "${pack.metadata.label}"…`);
          await pack.documentClass.updateDocuments(updates, { pack: pack.collection, diff: false });
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
   * Run the migrations on an actor's stored data and write its migrated items and effects.
   * The caller writes the actor's own data with the returned update.
   *
   * @param {Actor} actor      Loaded Actor document.
   * @param {object} source    The actor's stored data. Mutated in place.
   * @param {MigrationBase[]} migrations
   * @returns {Promise<object|null>}  The actor's update (see {@link MigrationRunner.#actorUpdate}),
   *                                  or null if the actor was already at the target version.
   */
  async #migrateActor(actor, source, migrations) {
    const original = foundry.utils.deepClone(source);
    if (!(await this.#applyActorMigrations(source, migrations))) {
      return null;
    }
    await this.#commitEmbedded(actor, "Item", original.items, source.items);
    await this.#commitEmbedded(actor, "ActiveEffect", original.effects, source.effects);
    return MigrationRunner.#actorUpdate(original, source);
  }

  /**
   * Run the migrations on a standalone item's stored data.
   *
   * @param {object} source  The item's stored data. Mutated in place.
   * @param {MigrationBase[]} migrations
   * @returns {Promise<object|null>}  The item's update (see {@link MigrationRunner.#systemReplacement}),
   *                                  or null if the item was already at the target version.
   */
  async #migrateItem(source, migrations) {
    return (await this.#applyItemMigrations(source, migrations)) ? MigrationRunner.#systemReplacement(source) : null;
  }

  /**
   * Run the actor and item migrations newer than each document's schema version on stored actor data,
   * then stamp the actor and its items with the version these migrations reach.
   *
   * @param {object} source  Stored actor data (already deep-cloned). Mutated in place.
   * @param {MigrationBase[]} migrations
   * @returns {Promise<boolean>}  False if the actor was already at that version (nothing ran).
   */
  async #applyActorMigrations(source, migrations) {
    const targetVersion = MigrationRunner.#targetVersion(migrations);
    const actorVersion = MigrationRunner.#storedVersion(source);
    if (actorVersion >= targetVersion) {
      return false;
    }

    for (const migration of migrations) {
      if (migration.version <= actorVersion) {
        continue;
      }
      await migration.updateActor(source);
      for (const item of source.items ?? []) {
        if (migration.version > MigrationRunner.#storedVersion(item)) {
          await migration.updateItem(item, source);
        }
      }
    }

    foundry.utils.setProperty(source, "system._schemaVersion", targetVersion);
    for (const item of source.items ?? []) {
      if (MigrationRunner.#storedVersion(item) < targetVersion) {
        foundry.utils.setProperty(item, "system._schemaVersion", targetVersion);
      }
    }
    return true;
  }

  /**
   * Run the item migrations newer than its schema version on stored item data with no parent actor,
   * then stamp it with the version these migrations reach.
   *
   * @param {object} source  Stored item data. Mutated in place.
   * @param {MigrationBase[]} migrations
   * @returns {Promise<boolean>}  False if the item was already at that version (nothing ran).
   */
  async #applyItemMigrations(source, migrations) {
    const targetVersion = MigrationRunner.#targetVersion(migrations);
    const itemVersion = MigrationRunner.#storedVersion(source);
    if (itemVersion >= targetVersion) {
      return false;
    }
    for (const migration of migrations) {
      if (migration.version > itemVersion) {
        await migration.updateItem(source, null);
      }
    }
    foundry.utils.setProperty(source, "system._schemaVersion", targetVersion);
    return true;
  }

  /**
   * The update that writes a migrated document's system data as a whole, without the keys its
   * migrations deleted. Send it with `diff: false`.
   *
   * Replacing `system` is what removes legacy keys from the database: they are not in the schema, so
   * client-side cleaning would drop a `ForcedDeletion` of them before it reached the server.
   *
   * @param {object} source  Migrated document data
   * @returns {{_id: string, system: object}}
   */
  static #systemReplacement(source) {
    return {
      _id: source._id,
      system: foundry.data.operators.ForcedReplacement.create(MigrationUtil.withoutDeletions(source.system)),
    };
  }

  /**
   * The update that writes a migrated actor: its system data as a whole (see
   * {@link MigrationRunner.#systemReplacement}), plus the flags its migrations set or changed.
   * Send it with `diff: false`.
   *
   * @param {object} original  The actor's stored data before migration
   * @param {object} source    Migrated actor data
   * @returns {{_id: string, system: object, flags?: object}}
   */
  static #actorUpdate(original, source) {
    const update = MigrationRunner.#systemReplacement(source);
    const flags = foundry.utils.diffObject(original.flags ?? {}, source.flags ?? {});
    if (!foundry.utils.isEmpty(flags)) {
      update.flags = flags;
    }
    return update;
  }

  /**
   * Diff embedded documents before/after migration by _id and write creates/deletes/updates to the DB:
   *   - Entry without _id → created
   *   - Original _id missing from the result → deleted
   *   - Entry whose data changed → updated. Unchanged entries are not written, so a token delta
   *     gains no needless overrides of its base actor's documents.
   *
   * Items are updated by replacing their system data, like actors. Effects are updated as a whole with
   * the usual diff: no `migrateData()` converts them in memory, so the diff keeps their changes.
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
    if (!updated.length) {
      return;
    }
    if (documentName === "Item") {
      await actor.updateEmbeddedDocuments(
        documentName,
        updated.map((d) => MigrationRunner.#systemReplacement(d)),
        { diff: false },
      );
    } else {
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

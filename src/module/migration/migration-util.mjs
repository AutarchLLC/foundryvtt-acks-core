/* global foundry */
export default class MigrationUtil {
  /**
   * Mark a property for deletion from the database by setting it to a `ForcedDeletion`.
   * The key can use dot notation (`a.b.c` marks `c`). Does nothing if the property does not exist.
   * @param {object} obj
   * @param {string} key
   */
  static markPropertyForDeletion(obj, key) {
    if (foundry.utils.hasProperty(obj, key)) {
      foundry.utils.setProperty(obj, key, new foundry.data.operators.ForcedDeletion());
    }
  }

  /**
   * A deep copy of the given data without the keys marked for deletion.
   * @param {object} data
   * @returns {object}
   */
  static withoutDeletions(data) {
    const { ForcedDeletion } = foundry.data.operators;
    const copy = {};
    for (const [key, value] of Object.entries(data ?? {})) {
      if (value instanceof ForcedDeletion) {
        continue;
      }
      copy[key] =
        foundry.utils.getType(value) === "Object" ? this.withoutDeletions(value) : foundry.utils.deepClone(value);
    }
    return copy;
  }

  /**
   * Read the stored data of every document in a world collection or a compendium pack, as the server
   * holds it.
   *
   * Loaded documents cannot be used for this: `migrateData()` has already converted their legacy fields
   * in memory, and schema cleaning has dropped every key the schema does not know.
   *
   * @param {string} documentName  "Actor", "Item" or "Scene"
   * @param {string} [pack]        Compendium collection id, for a compendium pack
   * @returns {Promise<Map<string, object>>}  Stored data by document id, with embedded documents
   */
  static async fetchStoredSources(documentName, pack) {
    const operation = { query: {} };
    if (pack) {
      operation.pack = pack;
    }
    const response = await foundry.helpers.SocketInterface.dispatch("modifyDocument", {
      type: documentName,
      action: "get",
      operation,
    });
    return new Map(response.result.map((data) => [data._id, data]));
  }
}

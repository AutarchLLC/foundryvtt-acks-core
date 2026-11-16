/* global foundry */
export default class MigrationUtil {
  /**
   * Will mark property for deletion.
   * In Foundry v14 it will set property's value to `new foundry.data.operators.ForcedDeletion()`.
   * Key can use dot notation like a.b.c - last part (in this case "c") will be marked.
   * @param {Object} obj
   * @param {string} key
   */
  static markPropertyForDeletion(obj, key) {
    if (foundry.utils.hasProperty(obj, key)) {
      if (foundry.data.operators?.ForcedDeletion) {
        foundry.utils.setProperty(obj, key, new foundry.data.operators.ForcedDeletion());
      } else {
        console.error(
          `MigrationUtil.markPropertyForDeletion: Foundry v14+ is required to mark property for deletion. Key: ${key}`,
        );
      }
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

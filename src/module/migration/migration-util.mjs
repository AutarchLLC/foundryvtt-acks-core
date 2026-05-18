/* global foundry */
export default class MigrationUtil {
  /**
   * Will mark property for deletion.
   * In Foundry v14 it will set property's value to `new foundry.data.operators.ForcedDeletion()`.
   * In Foundry v13 it will set property's value to `null` and prefix the key with `-=` to trigger deletion.
   * Key can use dot notation like a.b.c - last part (in this case "c") will be marked.
   * @param {Object} obj
   * @param {string} key
   */
  static markPropertyForDeletion(obj, key) {
    if (foundry.utils.hasProperty(obj, key)) {
      // ForcedDeletion is v14+; fall back to the deprecated "-=" prefix for v13.
      if (foundry.data.operators?.ForcedDeletion) {
        foundry.utils.setProperty(obj, key, new foundry.data.operators.ForcedDeletion());
      } else {
        const keyParts = key.split(".");
        const keyToDelete = keyParts[keyParts.length - 1];
        keyParts[keyParts.length - 1] = `-=${keyToDelete}`;
        const deletionKey = keyParts.join(".");

        foundry.utils.setProperty(obj, deletionKey, null);
      }
    }
  }
}

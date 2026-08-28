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
}

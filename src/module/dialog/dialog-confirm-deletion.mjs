import confirm from "./dialog-confirm.mjs";

/**
 *
 * @return {Promise<boolean|null>}
 */
export default async function confirmDeletion() {
  return confirm(
    "Confirm deletion", // TODO: localize
    "Are you sure you want to delete this item? This action cannot be undone.", // TODO: localize
  );
}

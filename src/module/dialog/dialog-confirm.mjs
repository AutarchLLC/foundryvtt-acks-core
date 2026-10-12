/* global foundry */
/**
 *
 * @param {string} title
 * @param {string | HTMLDivElement} message
 * @return {Promise<boolean|null>}
 */
export default async function confirm(title, message) {
  return foundry.applications.api.DialogV2.confirm({
    window: {
      title,
    },
    content: message,
  });
}

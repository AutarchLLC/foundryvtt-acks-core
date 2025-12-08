/**
 * Create HTML string for the item tag.
 * @param {string} tagText  The text to display inside the tag.
 * @param {string|undefined} faIcon Font Awesome icon class.
 * @return {string} HTML string for the tag.
 */
export const createTagHtmlString = (tagText, faIcon = undefined) => {
  if (!tagText) {
    return "";
  }

  let fa = "";
  if (faIcon) {
    fa = `<i class="fas ${faIcon}"></i> `;
  }

  return `<li class='tag'>${fa}${tagText}</li>`;
};

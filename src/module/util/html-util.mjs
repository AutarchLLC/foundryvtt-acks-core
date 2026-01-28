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

export class AcksHtmlUtil {
  /**
   *
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static toggleListSection(event, target) {
    const section = target.closest("section.item-list-section");
    const itemListWrapper = section.querySelector(".item-list-wrapper");
    const icon = target.children.item(0);

    itemListWrapper.classList.toggle("expanded");

    if (icon.classList.contains("fa-caret-down")) {
      icon.classList.remove("fa-caret-down");
      icon.classList.add("fa-caret-right");
    } else {
      icon.classList.remove("fa-caret-right");
      icon.classList.add("fa-caret-down");
    }
  }

  /**
   * Finds closest DOM element with class 'item' and returns its data-item-id attribute.
   * @param {HTMLElement} target
   * @return {string}
   */
  static getItemIdFromDOM(target) {
    const itemEl = target.closest(".item");
    return itemEl.dataset.itemId;
  }
}

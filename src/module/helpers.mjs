/* global Handlebars, game */
import { ACKS } from "./config.mjs";

export const registerHelpers = async function () {
  Handlebars.registerHelper("readonly", function (value) {
    return value ? "readonly" : "";
  });

  Handlebars.registerHelper("attrIfHasValue", function (attrName, value) {
    if (value === null || value === undefined) {
      return "";
    }
    return new Handlebars.SafeString(`${attrName}="${value}"`);
  });

  Handlebars.registerHelper("mod", function (val) {
    if (val > 0) {
      return `+${val}`;
    } else if (val < 0) {
      return `${val}`;
    } else if (val === 0) {
      return "0";
    } else {
      return "N/A";
    }
  });

  Handlebars.registerHelper("add", function (lh, rh) {
    return parseInt(lh) + parseInt(rh);
  });

  Handlebars.registerHelper("mult", function (lh, rh) {
    return parseFloat(lh) * parseFloat(rh);
  });

  Handlebars.registerHelper("getWeightTooltip", function (weight, maxWeight) {
    if (weight > maxWeight) {
      return game.i18n.localize("ACKS.EncumbranceTitle.Overburdened");
    } else if (weight > 10) {
      return game.i18n.localize("ACKS.EncumbranceTitle.High");
    } else if (weight > 7) {
      return game.i18n.localize("ACKS.EncumbranceTitle.Medium");
    } else if (weight > 5) {
      return game.i18n.localize("ACKS.EncumbranceTitle.Low");
    } else {
      return game.i18n.localize("ACKS.EncumbranceTitle.Unencumbered");
    }
  });

  Handlebars.registerHelper("getWeight6Tooltip", function (weight, maxWeight) {
    if (weight > maxWeight) {
      return game.i18n.localize("ACKS.EncumbranceTitle.Overburdened");
    } else if (weight > 60) {
      return game.i18n.localize("ACKS.EncumbranceTitle.High");
    } else if (weight > 42) {
      return game.i18n.localize("ACKS.EncumbranceTitle.Medium");
    } else if (weight > 30) {
      return game.i18n.localize("ACKS.EncumbranceTitle.Low");
    } else {
      return game.i18n.localize("ACKS.EncumbranceTitle.Unencumbered");
    }
  });

  Handlebars.registerHelper("generateTags", function (tagList) {
    const tagKeys = Object.keys(ACKS.tags);
    const tagValues = Object.values(ACKS.tags);
    const icons = [];
    const text = [];
    for (const tag of tagList) {
      if (tagValues.includes(tag.value)) {
        const tagKey = tagKeys[tagValues.indexOf(tag.value)];
        icons.push(
          `<div class="tag-icon" data-tooltip="${ACKS.tags[tagKey]}"><i class="${ACKS.tag_icons[tagKey]}"></i></div>`,
        );
      } else {
        text.push(`<div class="tag">${tag.value}</div>`);
      }
    }

    return new Handlebars.SafeString([...icons, ...text].join(""));
  });

  Handlebars.registerHelper("stoneWeight", function (sixths) {
    // Input: number of 1/6-stone units (e.g., 10 → 10/6 stones = 1 4/6)
    // Output: HTML string for nice display (e.g., "1 <sup>4</sup>&frasl;<sub>6</sub>")
    // Assumes non-negative; floors to integer sixths for safety

    sixths = Math.floor(Math.max(0, sixths)); // Handle negatives as 0

    if (sixths === 0) {
      return "0";
    }

    const whole = Math.floor(sixths / 6);
    const rem = sixths % 6;

    if (rem === 0) {
      return `${whole}`;
    }

    const fractionHTML = `<sup>${rem}</sup>&frasl;<sub>6</sub>`;

    return whole > 0 ? new Handlebars.SafeString(`${whole} ${fractionHTML}`) : new Handlebars.SafeString(fractionHTML);
  });
};
